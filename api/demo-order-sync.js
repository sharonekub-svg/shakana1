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

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    const rawCodes = String(req.query.codes || req.query.code || '');
    const codes = rawCodes.split(',').map((code) => code.trim()).filter(Boolean);
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
  for (const order of incoming) {
    if (!isValidOrder(order)) continue;
    const existing = store.get(order.inviteCode);
    store.set(order.inviteCode, mergeOrder(existing, order));
    saved.push(order.inviteCode);
  }

  return res.status(200).json({ ok: true, saved });
}
