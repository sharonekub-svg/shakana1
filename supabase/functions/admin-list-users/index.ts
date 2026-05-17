import { handleOptions } from '../_shared/cors.ts';
import { errorJson, json, readJson } from '../_shared/json.ts';
import { admin } from '../_shared/supabaseAdmin.ts';
import { requireAdmin } from '../_shared/admin.ts';
import { enforceRateLimit } from '../_shared/rateLimit.ts';

type Body = { q?: string; banned?: boolean; page?: number };

const PAGE_SIZE = 50;

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const adminId = await requireAdmin(req);
    await enforceRateLimit(adminId, 'admin-list-users', { max: 120, windowSeconds: 60 });

    const body = await readJson<Body>(req).catch(() => ({}));
    const search = body.q?.trim() ?? '';
    const onlyBanned = body.banned === true;
    const page = Math.max(0, Number(body.page ?? 0));
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = admin
      .from('profiles')
      .select('id, first_name, last_name, phone, city, street, building, is_admin, banned_at, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search) {
      const escaped = search.replace(/[%_]/g, '\\$&');
      query = query.or(
        `first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,phone.ilike.%${escaped}%`,
      );
    }
    if (onlyBanned) query = query.not('banned_at', 'is', null);

    const { data, error, count } = await query;
    if (error) throw error;
    return json({ users: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE });
  } catch (e) {
    return errorJson(e);
  }
});
