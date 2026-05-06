const MAX_HTML_CHARS = 900_000;
const MAX_REQUESTS_PER_MINUTE = 20;
const rateBuckets = new Map();

const ALLOWED_HOST_SUFFIXES = [
  'amazon.com',
  'amazon.co.uk',
  'amazon.de',
  'zara.com',
  'hm.com',
  'www2.hm.com',
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
];
const ALLOWED_ORIGINS = new Set([
  'https://shakana1.vercel.app',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
]);

function sendJson(req, res, status, body) {
  const origin = reqOrigin(req);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.end(JSON.stringify(body));
}

function reqOrigin(req) {
  const origin = req?.headers?.origin || '';
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  return 'https://shakana1.vercel.app';
}

function isAllowedStoreHost(host) {
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

function checkRateLimit(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowStart = now - 60_000;
  const bucket = (rateBuckets.get(ip) || []).filter((ts) => ts > windowStart);
  if (bucket.length >= MAX_REQUESTS_PER_MINUTE) {
    const err = new Error('rate_limited');
    err.status = 429;
    throw err;
  }
  bucket.push(now);
  rateBuckets.set(ip, bucket);
}

async function requireAuth(req) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const auth = req.headers.authorization || '';
  if (!supabaseUrl || !anonKey || !/^Bearer\s+\S+/i.test(auth)) {
    const err = new Error('missing_auth');
    err.status = 401;
    throw err;
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      authorization: auth,
    },
  });
  if (!response.ok) {
    const err = new Error('invalid_auth');
    err.status = 401;
    throw err;
  }
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
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    /^169\.254\./.test(host)
  ) {
    const err = new Error('private_hosts_not_allowed');
    err.status = 400;
    throw err;
  }
  if (!isAllowedStoreHost(host)) {
    const err = new Error('store_domain_not_allowed');
    err.status = 400;
    throw err;
  }

  return parsed;
}

async function fetchWithCheckedRedirects(url, options, redirectsLeft = 3) {
  const response = await fetch(url, { ...options, redirect: 'manual' });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirectsLeft <= 0) {
      const err = new Error('too_many_redirects');
      err.status = 400;
      throw err;
    }
    const location = response.headers.get('location');
    if (!location) return response;
    const nextUrl = assertPublicHttpsUrl(new URL(location, url).toString());
    return fetchWithCheckedRedirects(nextUrl, options, redirectsLeft - 1);
  }
  return response;
}

function pickUserAgent(hostname) {
  // Use a deterministic but varied UA per hostname so the same store always
  // gets the same UA (useful for session caching) but different stores vary.
  let hash = 0;
  for (let i = 0; i < hostname.length; i++) hash = (hash * 31 + hostname.charCodeAt(i)) >>> 0;
  return USER_AGENTS[hash % USER_AGENTS.length];
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(req, res, 200, { ok: true });
  if (req.method !== 'POST') return sendJson(req, res, 405, { error: 'method_not_allowed' });

  try {
    checkRateLimit(req);
    await requireAuth(req);
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const url = assertPublicHttpsUrl(String(body.url || '').trim());
    const ua = pickUserAgent(url.hostname);

    const response = await fetchWithCheckedRedirects(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'User-Agent': ua,
        Referer: `https://www.google.com/search?q=${encodeURIComponent(url.hostname)}`,
      },
    });

    if (!response.ok) {
      return sendJson(req, res, 502, { error: 'product_fetch_failed', message: `Store returned ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType && !contentType.toLowerCase().includes('text/html')) {
      return sendJson(req, res, 415, { error: 'unsupported_product_content' });
    }

    const html = (await response.text()).slice(0, MAX_HTML_CHARS);
    return sendJson(req, res, 200, { html });
  } catch (err) {
    const status = err.status || 500;
    return sendJson(req, res, err.status || 500, {
      error: status >= 500 ? 'internal' : err.message || 'request_failed',
    });
  }
};
