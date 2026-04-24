import { handleOptions } from '../_shared/cors.ts';
import { errorJson, json, readJson } from '../_shared/json.ts';
import { admin, authedUserId, httpError } from '../_shared/supabaseAdmin.ts';
import { CONNECTED_ACCOUNT_ID, stripe } from '../_shared/stripe.ts';
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

    const { data: order, error } = await admin
      .from('orders')
      .select('*')
      .eq('id', body.orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) throw httpError(404, 'order_not_found');
    if (order.creator_id !== userId) throw httpError(403, 'only_creator_can_confirm');
    if (order.status !== 'escrow') throw httpError(409, 'order_not_in_escrow');

    const { data: participants, error: pErr } = await admin
      .from('participants')
      .select('stripe_payment_intent_id, amount_agorot, id')
      .eq('order_id', order.id)
      .eq('status', 'paid');
    if (pErr) throw pErr;

    for (const p of participants ?? []) {
      if (!p.stripe_payment_intent_id) continue;
      await stripe.paymentIntents.capture(p.stripe_payment_intent_id, undefined, {
        idempotencyKey: `capture_${p.id}_${idemp}`,
      });
      if (CONNECTED_ACCOUNT_ID) {
        await stripe.transfers.create(
          {
            amount: p.amount_agorot,
            currency: 'ils',
            destination: CONNECTED_ACCOUNT_ID,
            transfer_group: order.stripe_transfer_group ?? `order_${order.id}`,
            metadata: { order_id: order.id, participant_id: p.id },
          },
          { idempotencyKey: `xfer_${p.id}_${idemp}` },
        );
      }
    }

    await admin
      .from('orders')
      .update({
        status: 'completed',
        delivery_confirmed_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    return json({ ok: true });
  } catch (e) {
    return errorJson(e);
  }
});
