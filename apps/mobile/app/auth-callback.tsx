import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useDemoCommerceStore } from '@/stores/demoCommerceStore';
import { colors } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import type { Profile } from '@/types/domain';
import { consumePendingInvite, peekPendingInvite } from '@/lib/deeplinks';

const isProfileComplete = (profile: Profile | null): boolean =>
  !!profile &&
  profile.first_name.trim().length > 0 &&
  profile.last_name.trim().length > 0;

const getFirstParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const readWebHashParams = (): URLSearchParams | null => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.location.hash) {
    return null;
  }

  return new URLSearchParams(window.location.hash.replace(/^#/, ''));
};

const namesFromMetadata = (metadata: Record<string, unknown> | undefined) => {
  const firstName = typeof metadata?.first_name === 'string' ? metadata.first_name.trim() : '';
  const lastName = typeof metadata?.last_name === 'string' ? metadata.last_name.trim() : '';
  if (firstName || lastName) {
    return {
      firstName,
      lastName,
    };
  }

  const fullName =
    (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
    (typeof metadata?.name === 'string' && metadata.name.trim()) ||
    '';
  if (!fullName) return { firstName: '', lastName: '' };

  const [first, ...rest] = fullName.split(/\s+/);
  return {
    firstName: first || '',
    lastName: rest.join(' '),
  };
};

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const hasHandledCallback = useRef(false);
  const [message, setMessage] = useState('Finishing sign in...');

  useEffect(() => {
    const run = async () => {
      if (hasHandledCallback.current) return;
      hasHandledCallback.current = true;

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
          const fallbackSession = await supabase.auth.getSession();
          if (!fallbackSession.data.session) {
            setMessage(
              error.message.includes('code verifier')
                ? 'Sign-in expired. Please go back and continue with Gmail again in this same browser.'
                : error.message,
            );
            return;
          }
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

      const pendingInvite = await peekPendingInvite();

      const { data: rawProfile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      let resolvedProfile: Profile | null = (rawProfile as Profile | null) ?? null;
      if (!resolvedProfile) {
        const { firstName, lastName } = namesFromMetadata(sessionData.session?.user.user_metadata);
        const defaultProfile = {
          id: userId,
          first_name: firstName,
          last_name: lastName,
          phone: sessionData.session?.user.phone ?? '',
          city: '',
          street: '',
          building: '',
          apt: '',
          floor: null,
        };
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .upsert(defaultProfile as never, { onConflict: 'id' })
          .select('*')
          .single();
        if (createError) {
          throw createError;
        }
        resolvedProfile = (created ?? defaultProfile) as Profile;
      }

      useAuthStore.getState().setProfile(resolvedProfile);
      if (pendingInvite) {
        await consumePendingInvite();
        useDemoCommerceStore.getState().setDemoMode(false);
        useDemoCommerceStore.getState().setDemoRole(null);
      } else {
        useDemoCommerceStore.getState().resetDemo();
      }

      const nextRoute = pendingInvite
        ? /^\d{4}$/.test(pendingInvite)
          ? `/user?join=${pendingInvite}`
          : `/join/${pendingInvite}`
        : '/user';
      router.replace(nextRoute as Href);
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
