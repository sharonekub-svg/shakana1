import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

const COOKIE_KEY = 'shakana-cookie-consent-v1';

export default function CookiesScreen() {
  const router = useRouter();
  const [choice, setChoice] = useState('Not selected');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setChoice(window.localStorage.getItem(COOKIE_KEY) ?? 'Not selected');
    }
  }, []);

  const save = (next: 'essential' | 'accepted') => {
    if (typeof window !== 'undefined') window.localStorage.setItem(COOKIE_KEY, next);
    setChoice(next);
  };

  return (
    <ScreenBase style={styles.screen}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>EU GDPR</Text>
          <Text style={styles.title}>Cookie Consent</Text>
          <Text style={styles.subtitle}>Choose whether Shakana can use analytics cookies in addition to essential app storage.</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.status}>Current choice: {choice}</Text>
        <Text style={styles.body}>Essential storage keeps auth, language, and order state working. Optional analytics helps improve the product.</Text>
        <View style={styles.actions}>
          <ConsentButton label="Essential only" onPress={() => save('essential')} />
          <ConsentButton label="Accept all" onPress={() => save('accepted')} primary />
        </View>
      </View>
    </ScreenBase>
  );
}

function ConsentButton({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.button, primary && styles.buttonPrimary]}>
      <Text style={[styles.buttonText, primary && styles.buttonTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 20, paddingBottom: 36, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  kicker: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2.4, color: colors.gold, marginBottom: 4 },
  title: { fontFamily: fontFamily.display, fontSize: 30, color: colors.tx },
  subtitle: { marginTop: 8, fontFamily: fontFamily.body, fontSize: 13, lineHeight: 20, color: colors.mu },
  card: { gap: 14, padding: 16, borderWidth: 1, borderColor: colors.br, borderRadius: radii.xl, backgroundColor: colors.s1, ...shadow.card },
  status: { fontFamily: fontFamily.bodyBold, fontSize: 15, color: colors.tx },
  body: { fontFamily: fontFamily.body, fontSize: 14, lineHeight: 22, color: colors.mu },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: { flexGrow: 1, minHeight: 48, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.br, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: colors.s1 },
  buttonPrimary: { backgroundColor: colors.acc, borderColor: colors.acc },
  buttonText: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 14 },
  buttonTextPrimary: { color: colors.white },
});
