import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, useRootNavigationState } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/tokens';

export default function Index() {
  const rootNavigationState = useRootNavigationState();
  const session = useAuthStore((s) => s.session);
  const hydrated = useAuthStore((s) => s.hydrated);

  if (!rootNavigationState?.key || !hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.mu} />
      </View>
    );
  }

  if (session) return <Redirect href="/(tabs)/building" />;
  return <Redirect href="/how-it-works" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
