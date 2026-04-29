const MAX_HTML_CHARS = 900_000;

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.end(JSON.stringify(body));
}

function assertPublicHttpsUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    const err = new Error('invalid_url');
    err.status = 400;
    throw err;
  }

  if (parsed.protocol !== 'https:') {
    const err = new Error('https_required');
    err.status = 400;
    throw err;
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.local') ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    const err = new Error('private_hosts_not_allowed');
    err.status = 400;
    throw err;
  }

  return parsed;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const url = assertPublicHttpsUrl(String(body.url || '').trim());

    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 ShakanaProductFinder/1.0',
      },
    });

    if (!response.ok) {
      return sendJson(res, 502, { error: 'product_fetch_failed', message: `Store returned ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType && !contentType.toLowerCase().includes('text/html')) {
      return sendJson(res, 415, { error: 'unsupported_product_content' });
    }

    const html = (await response.text()).slice(0, MAX_HTML_CHARS);
    return sendJson(res, 200, { html });
  } catch (err) {
    return sendJson(res, err.status || 500, {
      error: err.message || 'internal',
    });
  }
};
