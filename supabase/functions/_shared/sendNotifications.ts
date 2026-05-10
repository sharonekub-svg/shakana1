import { admin } from './supabaseAdmin.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Send a push notification to every registered device of all participants
 * of the given order. Silently drops tokens that are no longer valid.
 */
export async function notifyOrderParticipants(
  orderId: string,
  message: PushMessage,
): Promise<void> {
  const { data: participants } = await admin
    .from('participants')
    .select('user_id')
    .eq('order_id', orderId);

  if (!participants || participants.length === 0) return;

  const userIds = participants.map((p) => p.user_id);

  const { data: tokenRows } = await admin
    .from('push_tokens')
    .select('token')
    .in('user_id', userIds);

  if (!tokenRows || tokenRows.length === 0) return;

  const messages = tokenRows.map((row) => ({
    to: row.token,
    title: message.title,
    body: message.body,
    data: message.data ?? {},
    sound: 'default',
    priority: 'high',
  }));

  // Expo push API accepts up to 100 messages per request.
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(batch),
    }).catch(() => {
      // Never throw — a push delivery failure must not roll back the DB write.
    });
  }
}
