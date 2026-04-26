import { handleOptions } from '../_shared/cors.ts';
import { errorJson, json, readJson } from '../_shared/json.ts';
import { admin, authedUserId, httpError } from '../_shared/supabaseAdmin.ts';
import { stripe } from '../_shared/stripe.ts';
import { idempotencyKeyFrom } from '../_shared/idempotency.ts';

type Body = { orderId: string; idempotency_key?: string };

// Cancel an order before the merchant charges the VCC. Steps:
//   1. Cancel the issued virtual card (if any) so it can never be charged.
//   2. Refund every paid participant's PaymentIntent in full.
//   3. Mark order + participants as cancelled / refunded.
//
// If the merchant has already charged the card, the platform balance is
// gone and a refund must be coordinated with the merchant directly. We
// detect that by checking virtual_cards.spent_agorot > 0.

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const userId = await authedUserId(req);
    const body = await readJson<Body>(req);
    if (!body.orderId) throw httpError(400, 'missing_orderId');
    const idemp = idempotencyKeyFrom(body, req);

    const { data: order, error } = await admin
      .from('orders')
      .select('*')
      .eq('id', body.orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) throw httpError(404, 'order_not_found');
    if (order.creator_id !== userId) throw httpError(403, 'only_creator_can_refund');
    if (['completed', 'cancelled'].includes(order.status)) {
      throw httpError(409, 'order_already_closed');
    }

    // Cancel the issued card if it exists and hasn't been spent.
    const { data: card } = await admin
      .from('virtual_cards')
      .select('*')
      .eq('order_id', order.id)
      .maybeSingle();

    if (card) {
      if (card.spent_agorot > 0) {
        throw httpError(
          409,
          'card_already_charged',
          'הכרטיס כבר נטען. בקש החזר ישירות מהחנות.',
        );
      }
      try {
        await stripe.issuing.cards.update(card.stripe_card_id, { status: 'canceled' });
      } catch (e) {
        console.error('card cancel failed', e);
      }
      await admin
        .from('virtual_cards')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', card.id);
    }

    const { data: participants } = await admin
      .from('participants')
      .select('id, stripe_payment_intent_id, status')
      .eq('order_id', order.id);

    for (const p of participants ?? []) {
      if (!p.stripe_payment_intent_id) continue;
      try {
        await stripe.refunds.create(
          { payment_intent: p.stripe_payment_intent_id },
          { idempotencyKey: `refund_${p.id}_${idemp}` },
        );
      } catch (e) {
        console.error('refund failed', e);
      }
      await admin
        .from('participants')
        .update({ status: 'refunded', refunded_at: new Date().toISOString() })
        .eq('id', p.id);
    }

    await admin
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', order.id);

    return json({ ok: true });
  } catch (e) {
    return errorJson(e);
  }
});
