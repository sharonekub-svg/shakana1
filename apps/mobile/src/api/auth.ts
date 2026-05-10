import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { phoneDigitsOnly } from '@/utils/format';

export function useSendOtp() {
  return useMutation({
    mutationFn: async (phoneFormatted: string) => {
      if (!env.supabaseUrl || !env.supabaseAnonKey) {
        throw new Error('Phone sign-in is not configured yet.');
      }
      const digits = phoneDigitsOnly(phoneFormatted);
      const e164 = `+972${digits.replace(/^0/, '')}`;
      const { error } = await supabase.auth.signInWithOtp({
        phone: e164,
        options: { channel: 'sms' },
      });
      if (error) throw error;
      return { phone: e164 };
    },
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async ({ phone, token }: { phone: string; token: string }) => {
      if (!env.supabaseUrl || !env.supabaseAnonKey) {
        throw new Error('Phone sign-in is not configured yet.');
      }
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });
      if (error) throw error;
      if (!data.session) throw new Error('No active session');
      return data.session;
    },
  });
}

export function useGoogleSignIn() {
  return useMutation({
    mutationFn: async () => {
      if (!env.supabaseUrl || !env.supabaseAnonKey) {
        throw new Error('Google sign-in is not configured yet.');
      }
      const redirectTo =
        Platform.OS === 'web'
          ? `${window.location.origin}/auth-callback`
          : Linking.createURL('auth-callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web',
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;

      if (Platform.OS === 'web') {
        if (data.url) {
          window.location.assign(data.url);
        }
        return;
      }

      if (!data.url) throw new Error('Could not start Google sign-in');

      await Linking.openURL(data.url);
    },
  });
}

export function useSignOut() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });
}
