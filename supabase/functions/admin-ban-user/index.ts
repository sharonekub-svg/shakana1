import { handleOptions } from '../_shared/cors.ts';
import { errorJson, json, readJson } from '../_shared/json.ts';
import { admin, httpError } from '../_shared/supabaseAdmin.ts';
import { requireAdmin, logAdminAction } from '../_shared/admin.ts';
import { enforceRateLimit } from '../_shared/rateLimit.ts';

type Body = { userId: string; banned: boolean; reason?: string };

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const adminId = await requireAdmin(req);
    await enforceRateLimit(adminId, 'admin-ban-user', { max: 60, windowSeconds: 3600 });

    const { userId, banned, reason } = await readJson<Body>(req);
    if (!userId) throw httpError(400, 'missing_userId');
    if (typeof banned !== 'boolean') throw httpError(400, 'missing_banned');
    if (userId === adminId) throw httpError(400, 'cannot_ban_self');

    const { data: target, error: targetErr } = await admin
      .from('profiles')
      .select('id, is_admin')
      .eq('id', userId)
      .maybeSingle();
    if (targetErr) throw targetErr;
    if (!target) throw httpError(404, 'user_not_found');
    if (target.is_admin && banned) throw httpError(403, 'cannot_ban_admin');

    const { error: updErr } = await admin
      .from('profiles')
      .update({ banned_at: banned ? new Date().toISOString() : null })
      .eq('id', userId);
    if (updErr) throw updErr;

    await logAdminAction({
      adminId,
      action: banned ? 'ban_user' : 'unban_user',
      targetUserId: userId,
      details: { reason: reason ?? null },
    });

    return json({ ok: true });
  } catch (e) {
    return errorJson(e);
  }
});
