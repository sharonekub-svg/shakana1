import { handleOptions, corsHeadersFor } from '../_shared/cors.ts';
import { admin } from '../_shared/supabaseAdmin.ts';

type DemoOrder = Record<string, unknown> & {
  id: string;
  brand: 'hm' | 'zara' | 'amazon';
  inviteCode: string;
  participants: Array<Record<string, unknown>>;
  items: Array<Record<string, unknown>>;
};

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
  });
}

function isValidOrder(order: unknown): order is DemoOrder {
  if (!order || typeof order !== 'object') return false;
  const candidate = order as Partial<DemoOrder>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.inviteCode === 'string' &&
    /^\d{4}$/.test(candidate.inviteCode) &&
    (candidate.brand === 'hm' || candidate.brand === 'zara' || candidate.brand === 'amazon') &&
    Array.isArray(candidate.participants) &&
    Array.isArray(candidate.items)
  );
}

function version(order: DemoOrder): number {
  const itemTime = Math.max(0, ...order.items.map((item) => Number(item.addedAt) || 0));
  const participantTime = Math.max(0, ...order.participants.map((participant) => Number(participant.joinedAt) || 0));
  return Math.max(Number(order.createdAt) || 0, Number(order.closesAt) || 0, itemTime, participantTime);
}

function mergeById(existing: Array<Record<string, unknown>>, incoming: Array<Record<string, unknown>>) {
  const byId = new Map<string, Record<string, unknown>>();
  for (const item of existing || []) if (typeof item.id === 'string') byId.set(item.id, item);
  for (const item of incoming || []) if (typeof item.id === 'string') byId.set(item.id, item);
  return Array.from(byId.values());
}

function mergeOrder(existing: DemoOrder | null, incoming: DemoOrder): DemoOrder {
  if (!existing) return incoming;
  const base = version(incoming) >= version(existing) ? incoming : existing;
  const other = base === incoming ? existing : incoming;
  return {
    ...base,
    participants: mergeById(other.participants, base.participants),
    items: mergeById(other.items, base.items),
    deliveryAddress: String(base.deliveryAddress || other.deliveryAddress || ''),
    lastEvent: String(base.lastEvent || other.lastEvent || `${base.brand} group order`),
  };
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const url = new URL(req.url);
    if (req.method === 'GET') {
      const rawCodes = url.searchParams.get('codes') || url.searchParams.get('code') || '';
      const codes = rawCodes.split(',').map((code) => code.trim()).filter(Boolean);
      if (codes.length === 0) return json(req, { orders: [] });
      const { data, error } = await admin
        .from('demo_group_orders')
        .select('order_payload')
        .in('invite_code', codes);
      if (error) throw error;
      const orders = (data ?? []).flatMap((row) => isValidOrder(row.order_payload) ? [row.order_payload] : []);
      return json(req, { orders });
    }

    if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);
    const body = await req.json().catch(() => ({}));
    const incoming = Array.isArray(body?.orders) ? body.orders : [body?.order];
    const validOrders = incoming.filter(isValidOrder);
    const saved: string[] = [];

    for (const order of validOrders) {
      const { data: existingRows } = await admin
        .from('demo_group_orders')
        .select('order_payload')
        .eq('invite_code', order.inviteCode)
        .limit(1);
      const existing = isValidOrder(existingRows?.[0]?.order_payload) ? existingRows?.[0]?.order_payload : null;
      const merged = mergeOrder(existing, order);
      const { error } = await admin
        .from('demo_group_orders')
        .upsert({
          invite_code: merged.inviteCode,
          order_payload: merged,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'invite_code' });
      if (error) throw error;
      saved.push(merged.inviteCode);
    }

    return json(req, { ok: true, saved });
  } catch (error) {
    console.error(error);
    return json(req, { error: 'internal' }, 500);
  }
});
