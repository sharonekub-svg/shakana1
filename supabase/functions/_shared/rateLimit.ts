import { admin, httpError } from './supabaseAdmin.ts';

type Limit = { max: number; windowSeconds: number };

export async function enforceRateLimit(
  userId: string,
  endpoint: string,
  limit: Limit,
): Promise<void> {
  const windowMs = limit.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();

  const { data: existing } = await admin
    .from('rate_limits')
    .select('request_count')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .eq('window_start', windowStart)
    .maybeSingle();

  const nextCount = (existing?.request_count ?? 0) + 1;
  if (nextCount > limit.max) {
    throw httpError(429, 'rate_limited');
  }

  await admin
    .from('rate_limits')
    .upsert(
      { user_id: userId, endpoint, window_start: windowStart, request_count: nextCount },
      { onConflict: 'user_id,endpoint,window_start' },
    );
}
