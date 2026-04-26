import { handleOptions } from '../_shared/cors.ts';
import { errorJson, json, readJson } from '../_shared/json.ts';
import { admin, authedUserId, httpError } from '../_shared/supabaseAdmin.ts';
import { stripe } from '../_shared/stripe.ts';
import { idempotencyKeyFrom } from '../_shared/idempotency.ts';

type Body = { orderId: string; idempotency_key?: string };

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const userId = await authedUserId(req);
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
    if (!['open', 'paying', 'escrow'].includes(order.status)) {
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

    // VCC flow: funds capture immediately into the platform's Stripe
    // balance. The platform then mints a virtual card with that balance
    // when every participant has paid. The order's `escrow` status is a
    // logical hold (we won't issue a card until paidCount === maxParticipants),
    // not a Stripe-level uncaptured PI.
    const pi = await stripe.paymentIntents.create(
      {
        amount: participant.amount_agorot,
        currency: 'ils',
        customer: customerId,
        transfer_group: order.stripe_transfer_group ?? `order_${order.id}`,
        metadata: {
          order_id: order.id,
          participant_id: participant.id,
          user_id: userId,
        },
        automatic_payment_methods: { enabled: true },
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
    });
  } catch (e) {
    return errorJson(e);
  }
});
