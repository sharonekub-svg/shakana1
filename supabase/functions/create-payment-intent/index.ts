import { handleOptions } from '../_shared/cors.ts';
import { errorJson, json, readJson } from '../_shared/json.ts';
import { admin, authedUserId, httpError } from '../_shared/supabaseAdmin.ts';
import { CONNECTED_ACCOUNT_ID, stripe } from '../_shared/stripe.ts';
import { idempotencyKeyFrom } from '../_shared/idempotency.ts';
import { calcCommission } from '../_shared/shippingPolicies.ts';

type Body = { orderId: string; idempotency_key?: string };

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const userId = await authedUserId(req);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      throw httpError(401, 'invalid_user_id_format');
    }
    const body = await readJson<Body>(req);
    if (!body.orderId) throw httpError(400, 'missing_orderId');
    const idemp = idempotencyKeyFrom(body, req);

    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select('*')
      .eq('id', body.orderId)
      .maybeSingle();
    if (orderErr) throw orderErr;
    if (!order) throw httpError(404, 'order_not_found');
    if (!['locked', 'paying', 'escrow'].includes(order.status)) {
      throw httpError(409, 'order_not_payable');
    }

    const { data: participant, error: partErr } = await admin
      .from('participants')
      .select('*')
      .eq('order_id', order.id)
      .eq('user_id', userId)
      .maybeSingle();
    if (partErr) throw partErr;
    if (!participant) throw httpError(403, 'not_a_participant');
    if (participant.status === 'paid') throw httpError(409, 'already_paid');

    // Fetch this participant's items and all order items in parallel.
    const [
      { data: myItems, error: myItemsErr },
      { data: allItems, error: allItemsErr },
    ] = await Promise.all([
      admin
        .from('order_items')
        .select('price_agorot')
        .eq('order_id', order.id)
        .eq('participant_id', participant.id),
      admin
        .from('order_items')
        .select('price_agorot')
        .eq('order_id', order.id),
    ]);
    if (myItemsErr) throw myItemsErr;
    if (allItemsErr) throw allItemsErr;

    const myItemsAgorot = (myItems ?? []).reduce(
      (sum, item) => sum + Math.max(0, item.price_agorot ?? 0),
      0,
    );
    const groupTotalAgorot = (allItems ?? []).reduce(
      (sum, item) => sum + Math.max(0, item.price_agorot ?? 0),
      0,
    );

    if (myItemsAgorot === 0) throw httpError(409, 'no_items_to_pay');

    const commission = calcCommission(
      myItemsAgorot,
      groupTotalAgorot,
      order.store_key ?? 'manual',
    );

    const serverAmountAgorot = commission.totalAgorot;
    if (!Number.isInteger(serverAmountAgorot) || serverAmountAgorot <= 0) {
      throw httpError(409, 'invalid_server_amount');
    }

    // Persist amount + commission so the webhook and UI can reconcile.
    if (
      participant.amount_agorot !== serverAmountAgorot ||
      participant.commission_agorot !== commission.commissionAgorot
    ) {
      const { error: rebalanceErr } = await admin
        .from('participants')
        .update({
          amount_agorot: serverAmountAgorot,
          commission_agorot: commission.commissionAgorot,
        })
        .eq('id', participant.id);
      if (rebalanceErr) throw rebalanceErr;
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('first_name, last_name, phone')
      .eq('id', userId)
      .maybeSingle();

    // Create / look up a Stripe customer for this user.
    let customerId: string | undefined = undefined;
    const existing = await stripe.customers.search({
      query: `metadata['shakana_user_id']:'${userId}'`,
      limit: 1,
    });
    if (existing.data[0]) {
      customerId = existing.data[0].id;
    } else {
      const cust = await stripe.customers.create(
        {
          name: profile ? `${profile.first_name} ${profile.last_name}` : undefined,
          phone: profile?.phone,
          metadata: { shakana_user_id: userId },
        },
        { idempotencyKey: `cust_${userId}` },
      );
      customerId = cust.id;
    }

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: '2024-06-20' },
    );

    // Reuse existing uncaptured PI to prevent double-charge on retries.
    const REUSABLE_STATUSES = ['requires_payment_method', 'requires_confirmation', 'requires_action', 'requires_capture'];
    if (participant.stripe_payment_intent_id) {
      try {
        const existingPi = await stripe.paymentIntents.retrieve(participant.stripe_payment_intent_id);
        if (REUSABLE_STATUSES.includes(existingPi.status)) {
          return json({
            clientSecret: existingPi.client_secret,
            ephemeralKey: ephemeralKey.secret,
            customer: customerId,
            publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY') ?? '',
            breakdown: commission,
          });
        }
      } catch {
        // PI not found or invalid — fall through to create a new one.
      }
    }

    const pi = await stripe.paymentIntents.create(
      {
        amount: serverAmountAgorot,
        currency: 'ils',
        customer: customerId,
        capture_method: 'manual',
        transfer_group: order.stripe_transfer_group ?? `order_${order.id}`,
        metadata: {
          order_id: order.id,
          participant_id: participant.id,
          user_id: userId,
          items_agorot: String(myItemsAgorot),
          commission_agorot: String(commission.commissionAgorot),
          savings_agorot: String(commission.savingsAgorot),
        },
        automatic_payment_methods: { enabled: true },
        ...(CONNECTED_ACCOUNT_ID
          ? { on_behalf_of: CONNECTED_ACCOUNT_ID }
          : {}),
      },
      { idempotencyKey: `pi_${participant.id}_${idemp}` },
    );

    await admin
      .from('participants')
      .update({ stripe_payment_intent_id: pi.id })
      .eq('id', participant.id);

    return json({
      clientSecret: pi.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customerId,
      publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY') ?? '',
      breakdown: commission,
    });
  } catch (e) {
    return errorJson(e);
  }
});
