import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { env } from './env';
import { secureAuthStorage } from './secureStorage';
import type { Database } from '@/types/database';

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: secureAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
  global: {
    headers: { 'x-shk-client': 'mobile' },
  },
});

// Pause / resume auto-refresh based on app foreground state. Prevents
// background tokens from being refreshed on every wake.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export async function invokeFn<T = unknown>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) {
    const message = error.message || String(error);
    if (/not found|failed to send a request|functionsfetcherror/i.test(message)) {
      throw new Error(
        `The ${name} order service is not deployed yet. Deploy the Supabase Edge Function and try again.`,
      );
    }
    throw error;
  }
  if (!data) throw new Error(`Empty response from ${name}`);
  return data;
}
