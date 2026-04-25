import { corsHeaders } from './cors.ts';
import { HttpError } from './supabaseAdmin.ts';

export function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorJson(err: unknown): Response {
  if (err instanceof HttpError) {
    return json({ error: err.code, message: err.message }, err.status);
  }
  console.error('unhandled', err);
  return json(
    { error: 'internal', message: err instanceof Error ? err.message : 'unknown' },
    500,
  );
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
}
