const ALLOWED_ORIGINS = new Set([
  'https://shakana1.vercel.app',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
]);

function allowedOrigin(req?: Request): string {
  const origin = req?.headers.get('origin') ?? '';
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  return 'https://shakana1.vercel.app';
}

export function corsHeadersFor(req?: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(req),
    'Vary': 'Origin',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, stripe-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

export const corsHeaders = corsHeadersFor();

export function handleOptions(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersFor(req) });
  }
  return null;
}
