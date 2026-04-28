import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import type { Profile } from '@/types/domain';
import { consumePendingInvite } from '@/lib/deeplinks';

const isProfileComplete = (profile: Profile | null): boolean =>
  !!profile &&
  profile.first_name.trim().length > 0 &&
  profile.last_name.trim().length > 0 &&
  profile.city.trim().length > 0 &&
  profile.street.trim().length > 0 &&
  profile.building.trim().length > 0 &&
  profile.apt.trim().length > 0;

const getFirstParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const readWebHashParams = (): URLSearchParams | null => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.location.hash) {
    return null;
  }

  return new URLSearchParams(window.location.hash.replace(/^#/, ''));
};

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const [message, setMessage] = useState('Finishing sign in...');

  useEffect(() => {
    const run = async () => {
      const hashParams = readWebHashParams();
      const callbackError = getFirstParam(params.error) ?? hashParams?.get('error') ?? undefined;
      const callbackErrorDescription =
        getFirstParam(params.error_description) ?? hashParams?.get('error_description') ?? undefined;

      if (callbackError) {
        setMessage(callbackErrorDescription ?? callbackError);
        return;
      }

      const code = getFirstParam(params.code);
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage(error.message);
          return;
        }
      }

      const accessToken = hashParams?.get('access_token');
      const refreshToken = hashParams?.get('refresh_token');
      if (!code && accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setMessage(error.message);
          return;
        }
      }

      const { data: sessionData } = await supabase.auth.getSession();
      useAuthStore.getState().setSession(sessionData.session ?? null);
      useAuthStore.getState().setHydrated(true);

      const userId = sessionData.session?.user.id;
      if (!userId) {
        router.replace('/(auth)/welcome');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      useAuthStore.getState().setProfile(profile ?? null);

      if (!isProfileComplete(profile)) {
        router.replace('/(auth)/name');
        return;
      }

      const pendingInvite = await consumePendingInvite();
      router.replace((pendingInvite ? `/join/${pendingInvite}` : '/(tabs)/building') as Href);
    };

    run().catch((error) => {
      setMessage(error instanceof Error ? error.message : 'Sign-in failed');
    });
  }, [params.code, params.error, params.error_description, router]);

  return (
    <ScreenBase style={styles.screen}>
      <View style={styles.card}>
        <ActivityIndicator color={colors.acc} />
        <Text style={styles.title}>{message}</Text>
      </View>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    gap: 14,
  },
  title: {
    color: colors.tx,
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
  },
});
