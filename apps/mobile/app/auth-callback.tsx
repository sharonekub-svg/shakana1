import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import type { Profile } from '@/types/domain';

const isProfileComplete = (profile: Profile | null): boolean =>
  !!profile &&
  profile.first_name.trim().length > 0 &&
  profile.last_name.trim().length > 0 &&
  profile.city.trim().length > 0 &&
  profile.street.trim().length > 0 &&
  profile.building.trim().length > 0 &&
  profile.apt.trim().length > 0;

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const [message, setMessage] = useState('Finishing sign in...');

  useEffect(() => {
    const run = async () => {
      if (params.error) {
        setMessage(params.error_description ?? params.error);
        return;
      }

      const code = Array.isArray(params.code) ? params.code[0] : params.code;
      if (!code) {
        router.replace('/(auth)/welcome');
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setMessage(error.message);
        return;
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
      router.replace(isProfileComplete(profile) ? '/(tabs)/building' : '/(auth)/name');
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
