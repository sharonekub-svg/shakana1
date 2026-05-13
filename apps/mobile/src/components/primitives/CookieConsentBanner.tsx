import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

const COOKIE_KEY = 'shakana-cookie-consent-v1';

export function CookieConsentBanner() {
  const [ready, setReady] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    setChoice(window.localStorage.getItem(COOKIE_KEY));
    setReady(true);
  }, []);

  const save = (next: 'essential' | 'accepted') => {
    if (typeof window !== 'undefined') window.localStorage.setItem(COOKIE_KEY, next);
    setChoice(next);
  };

  if (!ready || choice) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Cookie consent</Text>
          <Text style={styles.body}>We use essential storage for login and orders. Optional analytics helps improve Shakana.</Text>
        </View>
        <View style={styles.actions}>
          <Pressable onPress={() => save('essential')} style={styles.secondary}>
            <Text style={styles.secondaryText}>Essential</Text>
          </Pressable>
          <Pressable onPress={() => save('accepted')} style={styles.primary}>
            <Text style={styles.primaryText}>Accept</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14, bottom: 14, zIndex: 80 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.white,
    ...shadow.cta,
  },
  title: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 14 },
  body: { marginTop: 3, color: colors.mu, fontFamily: fontFamily.body, fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 8 },
  secondary: { minHeight: 42, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.br, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  primary: { minHeight: 42, borderRadius: radii.lg, backgroundColor: colors.acc, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 12 },
  primaryText: { color: colors.white, fontFamily: fontFamily.bodyBold, fontSize: 12 },
});
