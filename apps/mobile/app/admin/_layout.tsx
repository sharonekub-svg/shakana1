import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/api/profile';
import { colors } from '@/theme/tokens';

export default function AdminLayout() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const { data: profile, isFetched } = useProfile(session?.user.id);

  useEffect(() => {
    if (!session) {
      router.replace('/(auth)/welcome');
      return;
    }
    if (isFetched && !profile?.is_admin) {
      router.replace('/(tabs)/building');
    }
  }, [session, profile, isFetched, router]);

  if (!session || !isFetched) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.mu} />
      </View>
    );
  }
  if (!profile?.is_admin) return null;

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
