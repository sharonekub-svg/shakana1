import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { EmptyState } from '@/components/primitives/EmptyState';
import { colors } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/api/profile';

export default function BuildingTab() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfile(user?.id);

  const first = profile?.first_name ?? '';
  const line1 = profile ? `${profile.street} ${profile.building}` : '';
  const line2 = profile
    ? `${profile.city} · דירה ${profile.apt}${profile.floor ? ` · קומה ${profile.floor}` : ''}`
    : '';

  return (
    <ScreenBase padded={false} safeEdges={['top']}>
      <View style={styles.header}>
        <Text style={styles.hi}>שלום, {first} 👋</Text>
        <Text style={styles.address}>{line1}</Text>
        <Text style={styles.sub}>{line2}</Text>
      </View>
      <EmptyState
        icon="🏠"
        title="ברוך הבא לבניין שלך"
        subtitle="עדיין אין שכנים מחוברים. הזמן שכנים כדי להתחיל."
        cta="הזמן שכנים"
        onCta={() => router.push('/order/new')}
      />
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 14 },
  hi: { fontSize: 13, color: colors.mu, marginBottom: 2, fontFamily: fontFamily.body },
  address: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    color: colors.tx,
    letterSpacing: -0.3,
  },
  sub: { fontFamily: fontFamily.body, fontSize: 13, color: colors.mu },
});
