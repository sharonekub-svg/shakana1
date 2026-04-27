import { useEffect, useRef, useState } from 'react';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';

import { useAppFonts } from '@/theme/fonts';
import { ensureLanguageDirection } from '@/theme/rtl';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { initSentry, identifySentryUser, Sentry } from '@/lib/sentry';
import { initPostHog, identify, resetAnalytics } from '@/lib/posthog';
import { StripeProviderShim } from '@/components/StripeProviderShim';
import { parseInviteToken, stashPendingInvite } from '@/lib/deeplinks';
import { peekPendingSharedProduct, consumePendingSharedProduct } from '@/lib/sharedProduct';
import { colors } from '@/theme/tokens';
import { useProfile } from '@/api/profile';
import { loadStoredLanguage, useLocaleStore } from '@/i18n/locale';
import { useProfileDraftStore } from '@/stores/profileDraftStore';

import '../global.css';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}
initSentry();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 10_000,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: 0 },
  },
});

onlineManager.setEventListener((setOnline) => {
  const sub = AppState.addEventListener('change', (s) => setOnline(s === 'active'));
  return () => sub.remove();
});

function RootLayoutInner() {
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [bootstrapped, setBootstrapped] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const session = useAuthStore((s) => s.session);
  const hydrated = useAuthStore((s) => s.hydrated);
  const draft = useProfileDraftStore((s) => s.draft);
  const { data: profile } = useProfile(session?.user.id);
  const fontsLoaded = useAppFonts();
  const navReady = !!rootNavigationState?.key;
  const navReadyRef = useRef(navReady);
  const pendingRoute = useRef<string | null>(null);
  const pendingShareRoute = useRef<string | null>(null);

  navReadyRef.current = navReady;

  // Boot: RTL, Sentry, PostHog, Supabase session, deep link intake.
  useEffect(() => {
    let authSub: { subscription: { unsubscribe: () => void } } | null = null;
    let linkSub: { remove: () => void } | null = null;
    let mounted = true;

    (async () => {
      const storedLanguage = await loadStoredLanguage();
      useLocaleStore.setState({ language: storedLanguage });
      await ensureLanguageDirection(storedLanguage);
      await initPostHog();
      await useProfileDraftStore.getState().loadDraft();

      const { data: current } = await supabase.auth.getSession();
      setSession(current.session ?? null);
      if (current.session?.user) {
        identifySentryUser(current.session.user.id);
        identify(current.session.user.id);
      }
      setHydrated(true);

      const { data } = supabase.auth.onAuthStateChange((_ev, newSession) => {
        setSession(newSession ?? null);
        if (newSession?.user) {
          identifySentryUser(newSession.user.id);
          identify(newSession.user.id);
        } else {
          identifySentryUser(null);
          resetAnalytics();
        }
      });
      authSub = data;

      const pendingShare = await peekPendingSharedProduct();
      if (pendingShare) {
        pendingShareRoute.current = `/order/new?${new URLSearchParams({
          url: pendingShare.url,
          title: pendingShare.title,
          source: pendingShare.source,
        }).toString()}`;
      }

      // Cold-start deep link → stash token for post-login claim.
      const initialUrl = await Linking.getInitialURL();
      const coldToken = parseInviteToken(initialUrl);
      if (coldToken) await stashPendingInvite(coldToken);

      linkSub = Linking.addEventListener('url', async ({ url }) => {
        const t = parseInviteToken(url);
        if (t) {
          const hasSession = !!useAuthStore.getState().session;
          if (!hasSession) {
            await stashPendingInvite(t);
          }
          const nextRoute = hasSession ? `/join/${t}` : '/(auth)/welcome';
          if (!navReadyRef.current) {
            pendingRoute.current = nextRoute;
            return;
          }
          if (!hasSession) {
            router.replace(nextRoute);
          } else {
            router.push(nextRoute);
          }
        }
      });

      if (mounted) {
        setBootstrapped(true);
      }
    })()
      .catch((e) => {
        Sentry.captureException(e);
      })
      .finally(() => {
        if (mounted) {
          setBootstrapped(true);
        }
      });

    return () => {
      mounted = false;
      authSub?.subscription.unsubscribe();
      linkSub?.remove();
    };
  }, [router, setHydrated, setSession]);

  // Route gating.
  useEffect(() => {
    if (!navReady || !hydrated || !bootstrapped) return;
    const inAuth = segments[0] === '(auth)';
    const inCallback = segments[0] === 'auth-callback';
    const inShare = segments[0] === 'share';
    if (inCallback) return;
    if (inShare) return;
    const profileComplete =
      !!profile &&
      profile.first_name.trim().length > 0 &&
      profile.last_name.trim().length > 0 &&
      profile.city.trim().length > 0 &&
      profile.street.trim().length > 0 &&
      profile.building.trim().length > 0 &&
      profile.apt.trim().length > 0;
    const draftHasName =
      !!draft &&
      draft.first_name.trim().length > 0 &&
      draft.last_name.trim().length > 0;

    if (!session && !inAuth) {
      router.replace('/(auth)/welcome');
    } else if (session && profileComplete && inAuth) {
      router.replace('/(tabs)/building');
    } else if (session && !profileComplete) {
      const nextRoute = draftHasName ? '/(auth)/address' : '/(auth)/name';
      if (!inAuth) {
        router.replace(nextRoute);
      } else if (segments[1] !== (draftHasName ? 'address' : 'name')) {
        router.replace(nextRoute);
      }
    }
  }, [bootstrapped, hydrated, navReady, session, profile, draft, segments, router]);

  useEffect(() => {
    if (!navReady || !pendingRoute.current) return;
    const nextRoute = pendingRoute.current;
    pendingRoute.current = null;
    router.replace(nextRoute);
  }, [navReady, router]);

  useEffect(() => {
    if (!navReady || !session || !pendingShareRoute.current) return;
    const nextRoute = pendingShareRoute.current;
    pendingShareRoute.current = null;
    consumePendingSharedProduct().catch(() => {});
    router.replace(nextRoute);
  }, [navReady, router, session]);

  // Query focus manager ties to AppState.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      focusManager.setFocused(s === 'active');
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded && bootstrapped) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, bootstrapped]);

  const showSplash = Platform.OS !== 'web' && (!fontsLoaded || !bootstrapped);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="join/[token]" />
      </Stack>
      {showSplash ? <View pointerEvents="none" style={styles.splashOverlay} /> : null}
    </View>
  );
}

export default Sentry.wrap(function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StripeProviderShim>
          <RootLayoutInner />
        </StripeProviderShim>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
  },
});
