import { handleOptions } from '../_shared/cors.ts';
import { errorJson, json, readJson } from '../_shared/json.ts';
import { admin, httpError } from '../_shared/supabaseAdmin.ts';
import { requireAdmin, logAdminAction } from '../_shared/admin.ts';
import { enforceRateLimit } from '../_shared/rateLimit.ts';

type Body = { orderId: string; reason?: string };

const CANCELLABLE = new Set(['draft', 'open', 'paying', 'escrow']);

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const adminId = await requireAdmin(req);
    await enforceRateLimit(adminId, 'admin-cancel-order', { max: 30, windowSeconds: 3600 });

    const { orderId, reason } = await readJson<Body>(req);
    if (!orderId) throw httpError(400, 'missing_orderId');

    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .maybeSingle();
    if (orderErr) throw orderErr;
    if (!order) throw httpError(404, 'order_not_found');
    if (!CANCELLABLE.has(order.status)) throw httpError(409, 'order_not_cancellable');

    const { error: updErr } = await admin
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', orderId);
    if (updErr) throw updErr;

    await logAdminAction({
      adminId,
      action: 'cancel_order',
      targetOrderId: orderId,
      details: { reason: reason ?? null, previous_status: order.status },
    });

    return json({ ok: true });
  } catch (e) {
    return errorJson(e);
  }
});
