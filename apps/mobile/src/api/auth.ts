import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { phoneDigitsOnly } from '@/utils/format';

export function useSendOtp() {
  return useMutation({
    mutationFn: async (phoneFormatted: string) => {
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
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });
      if (error) throw error;
      if (!data.session) throw new Error('אין סשן פעיל');
      return data.session;
    },
  });
}

export function useGoogleSignIn() {
  return useMutation({
    mutationFn: async () => {
      const redirectTo =
        Platform.OS === 'web'
          ? `${window.location.origin}/auth-callback`
          : Linking.createURL('auth-callback');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) throw error;
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
