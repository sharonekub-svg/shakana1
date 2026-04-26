import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { colors, radii } from '@/theme/tokens';
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
      <View style={styles.mark}>
        <Svg width={44} height={44} viewBox="0 0 44 44" fill="none">
          <Rect x="1" y="1" width="42" height="42" stroke={colors.tx} strokeWidth={1.5} />
          <Path
            d="M10 22l9 9 15-18"
            stroke={colors.white}
            strokeWidth={3.5}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </Svg>
      </View>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={styles.title}>Welcome{name ? `, ${name}` : ''}.</Text>
        <Text style={styles.sub}>Your profile is ready.</Text>
      </View>
      <View style={styles.loadingRow}>
        <ActivityIndicator color={colors.acc} size="small" />
        <Text style={styles.loadingText}>Routing to the board.</Text>
      </View>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: 88,
    height: 88,
    borderRadius: radii.md,
    backgroundColor: colors.grn,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.tx,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    color: colors.tx,
    textAlign: 'center',
  },
  sub: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.mu,
    textAlign: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: colors.mu,
    fontFamily: fontFamily.body,
  },
});
