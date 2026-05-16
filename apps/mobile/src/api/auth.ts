import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useSendOtp() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      return { phone: email };
    },
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async ({ phone: email, token }: { phone: string; token: string }) => {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
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
