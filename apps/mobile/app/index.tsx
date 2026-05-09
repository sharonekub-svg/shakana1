import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, useRootNavigationState } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/tokens';

export default function Index() {
  const rootNavigationState = useRootNavigationState();
  const session = useAuthStore((s) => s.session);
  if (!rootNavigationState?.key) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.mu} />
      </View>
    );
  }
  return session ? <Redirect href="/(tabs)/building" /> : <Redirect href="/(auth)/welcome" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
