const allowedOrigins = new Set([
  'https://shakana1.vercel.app',
  'https://shakana.vercel.app',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
]);

const store = globalThis.__shakanaDemoOrderStore ?? new Map();
globalThis.__shakanaDemoOrderStore = store;

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function hasDurableStore() {
  return Boolean(supabaseUrl && supabaseServiceKey);
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Cache-Control', 'no-store');
}

function isValidOrder(order) {
  return (
    order &&
    typeof order === 'object' &&
    typeof order.id === 'string' &&
    typeof order.inviteCode === 'string' &&
    /^\d{4}$/.test(order.inviteCode) &&
    ['hm', 'zara', 'amazon'].includes(order.brand) &&
    Array.isArray(order.participants) &&
    Array.isArray(order.items)
  );
}

function orderVersion(order) {
  const itemTime = Math.max(0, ...order.items.map((item) => Number(item.addedAt) || 0));
  const participantTime = Math.max(0, ...order.participants.map((participant) => Number(participant.joinedAt) || 0));
  return Math.max(Number(order.createdAt) || 0, Number(order.closesAt) || 0, itemTime, participantTime);
}

function mergeById(existingItems, incomingItems) {
  const byId = new Map();
  for (const item of existingItems || []) {
    if (item && typeof item.id === 'string') byId.set(item.id, item);
  }
  for (const item of incomingItems || []) {
    if (item && typeof item.id === 'string') byId.set(item.id, item);
  }
  return Array.from(byId.values());
}

function mergeByParticipantId(existingParticipants, incomingParticipants) {
  const byId = new Map();
  for (const participant of existingParticipants || []) {
    if (participant && typeof participant.id === 'string') byId.set(participant.id, participant);
  }
  for (const participant of incomingParticipants || []) {
    if (participant && typeof participant.id === 'string') byId.set(participant.id, participant);
  }
  return Array.from(byId.values());
}

function mergeOrder(existing, incoming) {
  if (!existing) return incoming;
  const existingVersion = orderVersion(existing);
  const incomingVersion = orderVersion(incoming);
  const base = incomingVersion >= existingVersion ? incoming : existing;
  const other = base === incoming ? existing : incoming;
  return {
    ...base,
    participants: mergeByParticipantId(other.participants, base.participants),
    items: mergeById(other.items, base.items),
    deliveryAddress: base.deliveryAddress || other.deliveryAddress || '',
    lastEvent: base.lastEvent || other.lastEvent || `${base.brand} group order`,
  };
}

async function readDurableOrders(codes) {
  if (!hasDurableStore() && supabaseUrl && supabaseAnonKey && codes.length > 0) {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/demo-order-sync?codes=${encodeURIComponent(codes.join(','))}`,
      { headers: { apikey: supabaseAnonKey, authorization: `Bearer ${supabaseAnonKey}` } },
    );
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload?.orders)
      ? payload.orders.flatMap((order) => (isValidOrder(order) ? [order] : []))
      : [];
  }
  if (!hasDurableStore() || codes.length === 0) return [];
  const quotedCodes = codes.map((code) => `"${String(code).replace(/"/g, '')}"`).join(',');
  const url = `${supabaseUrl}/rest/v1/demo_group_orders?invite_code=in.(${encodeURIComponent(quotedCodes)})&select=invite_code,order_payload`;
  const response = await fetch(url, {
    headers: {
      apikey: supabaseServiceKey,
      authorization: `Bearer ${supabaseServiceKey}`,
    },
  });
  if (!response.ok) return [];
  const rows = await response.json();
  return Array.isArray(rows)
    ? rows.flatMap((row) => (isValidOrder(row?.order_payload) ? [row.order_payload] : []))
    : [];
}

async function writeDurableOrders(orders) {
  if (!hasDurableStore() && supabaseUrl && supabaseAnonKey && orders.length > 0) {
    const response = await fetch(`${supabaseUrl}/functions/v1/demo-order-sync`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        authorization: `Bearer ${supabaseAnonKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ orders }),
    });
    return response.ok;
  }
  if (!hasDurableStore() || orders.length === 0) return false;
  const rows = orders.map((order) => ({
    invite_code: order.inviteCode,
    order_payload: order,
    updated_at: new Date().toISOString(),
  }));
  const response = await fetch(`${supabaseUrl}/rest/v1/demo_group_orders`, {
    method: 'POST',
    headers: {
      apikey: supabaseServiceKey,
      authorization: `Bearer ${supabaseServiceKey}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });
  return response.ok;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    const rawCodes = String(req.query.codes || req.query.code || '');
    const codes = rawCodes.split(',').map((code) => code.trim()).filter(Boolean);
    const durableOrders = await readDurableOrders(codes).catch(() => []);
    for (const order of durableOrders) {
      const existing = store.get(order.inviteCode);
      store.set(order.inviteCode, mergeOrder(existing, order));
    }
    const orders = codes.flatMap((code) => {
      const order = store.get(code);
      return order ? [order] : [];
    });
    return res.status(200).json({ orders });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
  const incoming = Array.isArray(body?.orders) ? body.orders : [body?.order];
  const saved = [];
  const mergedOrders = [];
  for (const order of incoming) {
    if (!isValidOrder(order)) continue;
    const existing = store.get(order.inviteCode);
    const merged = mergeOrder(existing, order);
    store.set(order.inviteCode, merged);
    mergedOrders.push(merged);
    saved.push(order.inviteCode);
  }
  await writeDurableOrders(mergedOrders).catch(() => false);

  return res.status(200).json({ ok: true, saved });
}
