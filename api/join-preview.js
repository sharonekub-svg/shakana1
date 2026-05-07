const storeMeta = {
  hm: {
    name: 'H&M',
    image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=1200&q=80',
  },
  zara: {
    name: 'Zara',
    image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80',
  },
  amazon: {
    name: 'Amazon',
    image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80',
  },
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req, res) {
  const code = String(req.query.code || '').replace(/\D/g, '').slice(0, 4);
  const host = req.headers.host || 'shakana1.vercel.app';
  const origin = `https://${host}`;
  let order = null;
  if (code) {
    try {
      const response = await fetch(`${origin}/api/demo-order-sync?code=${encodeURIComponent(code)}`);
      const payload = response.ok ? await response.json() : null;
      order = Array.isArray(payload?.orders) ? payload.orders[0] : null;
    } catch {
      order = null;
    }
  }
  const brand = ['hm', 'zara', 'amazon'].includes(order?.brand) ? order.brand : 'amazon';
  const meta = storeMeta[brand];
  const participants = Array.isArray(order?.participants) ? order.participants.length : 1;
  const items = Array.isArray(order?.items)
    ? order.items.reduce((total, item) => total + (Number(item?.quantity) || 1), 0)
    : 0;
  const founder = order?.participants?.[0]?.name || 'A neighbor';
  const title = `${founder} is ordering from ${meta.name}`;
  const description = `Join the shared Shakana cart. ${participants} joined, ${items} items added. Code ${code || '----'}.`;
  const url = `${origin}/join/${encodeURIComponent(code)}`;

  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  return res.status(200).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(meta.image)}">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(url)}">
</head>
<body>
  <a href="${escapeHtml(url)}">Open Shakana shared cart</a>
</body>
</html>`);
}
