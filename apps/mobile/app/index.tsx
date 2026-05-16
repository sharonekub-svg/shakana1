import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, useRootNavigationState } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/tokens';

const ONBOARDING_KEY = 'shakana_seen_onboarding';

export default function Index() {
  const rootNavigationState = useRootNavigationState();
  const session = useAuthStore((s) => s.session);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [seenOnboarding, setSeenOnboarding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setSeenOnboarding(val === 'true');
      setOnboardingChecked(true);
    });
  }, []);

  if (!rootNavigationState?.key || !hydrated || !onboardingChecked) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.mu} />
      </View>
    );
  }

  if (session) return <Redirect href="/(tabs)/building" />;
  if (!seenOnboarding) return <Redirect href="/how-it-works" />;
  return <Redirect href="/(auth)/welcome" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
