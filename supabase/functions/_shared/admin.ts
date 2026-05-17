import { admin, authedUserId, httpError } from './supabaseAdmin.ts';

export async function requireAdmin(req: Request): Promise<string> {
  const userId = await authedUserId(req);
  const { data, error } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.is_admin) throw httpError(403, 'admin_required');
  return userId;
}

type AdminAction = {
  adminId: string;
  action: string;
  targetUserId?: string | null;
  targetOrderId?: string | null;
  details?: Record<string, unknown>;
};

export async function logAdminAction(entry: AdminAction): Promise<void> {
  await admin.from('admin_actions').insert({
    admin_id: entry.adminId,
    action: entry.action,
    target_user_id: entry.targetUserId ?? null,
    target_order_id: entry.targetOrderId ?? null,
    details: entry.details ?? null,
  });
}
