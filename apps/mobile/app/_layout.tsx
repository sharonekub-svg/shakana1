import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';

import { useAppFonts } from '@/theme/fonts';
import { ensureRtl } from '@/theme/rtl';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { initSentry, identifySentryUser, Sentry } from '@/lib/sentry';
import { initPostHog, identify, resetAnalytics } from '@/lib/posthog';
import { stripeConfig } from '@/lib/stripe';
import { parseInviteToken, stashPendingInvite } from '@/lib/deeplinks';
import { colors } from '@/theme/tokens';

import '../global.css';

SplashScreen.preventAutoHideAsync().catch(() => {});
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
  const [bootstrapped, setBootstrapped] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const session = useAuthStore((s) => s.session);
  const hydrated = useAuthStore((s) => s.hydrated);
  const fontsLoaded = useAppFonts();

  // Boot: RTL, Sentry, PostHog, Supabase session, deep link intake.
  useEffect(() => {
    (async () => {
      await ensureRtl();
      await initPostHog();

      const { data: current } = await supabase.auth.getSession();
      setSession(current.session ?? null);
      if (current.session?.user) {
        identifySentryUser(current.session.user.id);
        identify(current.session.user.id);
      }
      setHydrated(true);

      const { data: authSub } = supabase.auth.onAuthStateChange((_ev, newSession) => {
        setSession(newSession ?? null);
        if (newSession?.user) {
          identifySentryUser(newSession.user.id);
          identify(newSession.user.id);
        } else {
          identifySentryUser(null);
          resetAnalytics();
        }
      });

      // Cold-start deep link → stash token for post-login claim.
      const initialUrl = await Linking.getInitialURL();
      const coldToken = parseInviteToken(initialUrl);
      if (coldToken) await stashPendingInvite(coldToken);

      const linkSub = Linking.addEventListener('url', async ({ url }) => {
        const t = parseInviteToken(url);
        if (t) {
          if (!useAuthStore.getState().session) {
            await stashPendingInvite(t);
            router.replace('/(auth)/welcome');
          } else {
            router.push(`/join/${t}`);
          }
        }
      });

      setBootstrapped(true);
      return () => {
        authSub.subscription.unsubscribe();
        linkSub.remove();
      };
    })().catch((e) => Sentry.captureException(e));
  }, [router, setHydrated, setSession]);

  // Route gating.
  useEffect(() => {
    if (!hydrated || !bootstrapped) return;
    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth) {
      router.replace('/(auth)/welcome');
    } else if (session && inAuth) {
      router.replace('/(tabs)/building');
    }
  }, [bootstrapped, hydrated, session, segments, router]);

  // Query focus manager ties to AppState.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      focusManager.setFocused(s === 'active');
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded && bootstrapped) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, bootstrapped]);

  if (!fontsLoaded || !bootstrapped) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <>
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
        <Stack.Screen name="order/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="join/[token]" />
      </Stack>
    </>
  );
}

export default Sentry.wrap(function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StripeProvider
          publishableKey={stripeConfig.publishableKey}
          merchantIdentifier={stripeConfig.merchantIdentifier}
          urlScheme={stripeConfig.urlScheme}
        >
          <RootLayoutInner />
        </StripeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
});
