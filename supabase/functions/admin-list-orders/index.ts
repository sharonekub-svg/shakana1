import { handleOptions } from '../_shared/cors.ts';
import { errorJson, json, readJson } from '../_shared/json.ts';
import { admin } from '../_shared/supabaseAdmin.ts';
import { requireAdmin } from '../_shared/admin.ts';
import { enforceRateLimit } from '../_shared/rateLimit.ts';

type Body = { status?: string; q?: string; page?: number };

const PAGE_SIZE = 50;
const ALLOWED_STATUS = new Set([
  'draft',
  'open',
  'paying',
  'escrow',
  'delivered',
  'completed',
  'cancelled',
]);

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const adminId = await requireAdmin(req);
    await enforceRateLimit(adminId, 'admin-list-orders', { max: 120, windowSeconds: 60 });

    const body = await readJson<Body>(req).catch(() => ({}));
    const status = body.status;
    const search = body.q?.trim() ?? '';
    const page = Math.max(0, Number(body.page ?? 0));
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = admin
      .from('orders')
      .select('id, creator_id, status, product_title, product_price_agorot, max_participants, store_label, created_at, cancelled_at, completed_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status && ALLOWED_STATUS.has(status)) query = query.eq('status', status);
    if (search) {
      const escaped = search.replace(/[%_]/g, '\\$&');
      query = query.ilike('product_title', `%${escaped}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return json({ orders: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE });
  } catch (e) {
    return errorJson(e);
  }
});
