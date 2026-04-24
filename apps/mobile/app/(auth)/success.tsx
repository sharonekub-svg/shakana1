import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { colors } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useAuthStore } from '@/stores/authStore';

export default function Success() {
  const router = useRouter();
  const name = useAuthStore((s) => s.profile?.first_name ?? '');

  useEffect(() => {
    const t = setTimeout(() => router.replace('/(tabs)/building'), 2400);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <ScreenBase style={{ alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <View style={styles.circle}>
        <Svg width={44} height={44} viewBox="0 0 44 44" fill="none">
          <Path
            d="M10 22l9 9 15-18"
            stroke="white"
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={styles.title}>ברוך הבא{name ? `, ${name}` : ''}!</Text>
        <Text style={styles.sub}>ההרשמה הושלמה בהצלחה</Text>
      </View>
      <View style={styles.loadingRow}>
        <ActivityIndicator color={colors.acc} size="small" />
        <Text style={styles.loadingText}>נכנס לאפליקציה...</Text>
      </View>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.grn,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.grn,
    shadowOpacity: 0.33,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    color: colors.tx,
    textAlign: 'center',
  },
  sub: { fontFamily: fontFamily.body, fontSize: 15, color: colors.mu },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 14, color: colors.mu, fontFamily: fontFamily.body },
});
