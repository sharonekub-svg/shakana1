import { handleOptions } from '../_shared/cors.ts';
import { errorJson, json, readJson } from '../_shared/json.ts';
import { admin, authedUserId, httpError } from '../_shared/supabaseAdmin.ts';
import { stripe } from '../_shared/stripe.ts';
import { idempotencyKeyFrom } from '../_shared/idempotency.ts';

type Body = { orderId: string; idempotency_key?: string };

const PLATFORM_CARDHOLDER_ID = Deno.env.get('STRIPE_ISSUING_CARDHOLDER_ID') ?? '';

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const userId = await authedUserId(req);
    const body = await readJson<Body>(req);
    if (!body.orderId) throw httpError(400, 'missing_orderId');
    const idemp = idempotencyKeyFrom(body, req);
    if (!PLATFORM_CARDHOLDER_ID) throw httpError(500, 'missing_cardholder_config');

    // Order must exist, caller must be the creator, and every participant
    // must have paid before we mint a card. The status check enforces that
    // the webhook has transitioned the order into `escrow` after collecting
    // every payment.
    const { data: order, error } = await admin
      .from('orders')
      .select('*')
      .eq('id', body.orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) throw httpError(404, 'order_not_found');
    if (order.creator_id !== userId) throw httpError(403, 'only_creator_can_issue');
    if (order.status !== 'escrow') throw httpError(409, 'order_not_in_escrow');

    // Idempotency: if a card already exists for this order, return it.
    const { data: existing } = await admin
      .from('virtual_cards')
      .select('*')
      .eq('order_id', order.id)
      .maybeSingle();
    if (existing && existing.status !== 'cancelled') {
      const card = await stripe.issuing.cards.retrieve(existing.stripe_card_id, {
        expand: ['number', 'cvc'],
      });
      return json({
        cardId: existing.id,
        number: (card as unknown as { number?: string }).number,
        cvc: (card as unknown as { cvc?: string }).cvc,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
        last4: card.last4,
        brand: card.brand,
        spendingLimitAgorot: existing.spending_limit_agorot,
      });
    }

    // Mint a single-use virtual card on the platform's issuing cardholder.
    // Spending limit is locked to the order amount in agorot; on first
    // authorization the card is automatically cancelled by us via the
    // issuing webhook handler.
    const card = await stripe.issuing.cards.create(
      {
        cardholder: PLATFORM_CARDHOLDER_ID,
        currency: 'ils',
        type: 'virtual',
        status: 'active',
        spending_controls: {
          spending_limits: [
            { amount: order.product_price_agorot, interval: 'all_time' },
          ],
          allowed_categories: undefined, // any category — narrow this later if desired
        },
        metadata: {
          order_id: order.id,
          shakana_purpose: 'group_order_vcc',
        },
      },
      { idempotencyKey: `card_${order.id}_${idemp}` },
    );

    // Pull PAN + CVC just for this single response. We never persist them.
    const detailed = await stripe.issuing.cards.retrieve(card.id, {
      expand: ['number', 'cvc'],
    });

    await admin.from('virtual_cards').insert({
      order_id: order.id,
      stripe_card_id: card.id,
      stripe_cardholder_id: PLATFORM_CARDHOLDER_ID,
      status: 'active',
      last4: card.last4 ?? null,
      exp_month: card.exp_month ?? null,
      exp_year: card.exp_year ?? null,
      brand: card.brand ?? null,
      spending_limit_agorot: order.product_price_agorot,
    });

    await admin
      .from('orders')
      .update({ status: 'card_issued' })
      .eq('id', order.id);

    return json({
      number: (detailed as unknown as { number?: string }).number,
      cvc: (detailed as unknown as { cvc?: string }).cvc,
      exp_month: detailed.exp_month,
      exp_year: detailed.exp_year,
      last4: detailed.last4,
      brand: detailed.brand,
      spendingLimitAgorot: order.product_price_agorot,
    });
  } catch (e) {
    return errorJson(e);
  }
});
