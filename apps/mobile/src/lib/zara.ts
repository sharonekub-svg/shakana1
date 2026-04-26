import type { OrderItem } from '@/types/domain';

/**
 * Builds a ZARA IL cart URL from item reference numbers so that all
 * participants' picks are recreated in one tap after escrow release.
 *
 * Note: ZARA has no public cart API; this URL pattern mirrors what the
 * design specifies. Items are space-joined by ref number. Any change to
 * ZARA's cart deeplink requires updating only this builder.
 */
export function buildZaraCartUrl(orderId: string, items: Pick<OrderItem, 'ref'>[]): string {
  const refs = items
    .map((i) => i.ref)
    .filter((r): r is string => Boolean(r))
    .join(',');
  const base = 'https://www.zara.com/il/he/cart';
  const q = new URLSearchParams({ ref: `shakana_${orderId}`, items: refs });
  return `${base}?${q.toString()}`;
}
