import { handleOptions } from '../_shared/cors.ts';
import { errorJson, json, readJson } from '../_shared/json.ts';
import { admin, authedUserId, httpError } from '../_shared/supabaseAdmin.ts';

type Body = { orderId: string; idempotency_key?: string };

// Post-VCC: the actual money movement happens when the merchant charges
// the issued card (handled by the issuing webhook). This function exists
// only so the order creator can flip the order to `completed` once the
// physical goods arrive at the building. No Stripe calls.

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const userId = await authedUserId(req);
    const body = await readJson<Body>(req);
    if (!body.orderId) throw httpError(400, 'missing_orderId');

    const { data: order, error } = await admin
      .from('orders')
      .select('*')
      .eq('id', body.orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) throw httpError(404, 'order_not_found');
    if (order.creator_id !== userId) throw httpError(403, 'only_creator_can_confirm');
    if (!['card_issued', 'escrow'].includes(order.status)) {
      throw httpError(409, 'order_not_in_card_phase');
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
