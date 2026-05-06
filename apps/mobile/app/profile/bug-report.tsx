import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

const SUPPORT_EMAIL = 'support@shakana.app';

export default function BugReportScreen() {
  const router = useRouter();
  const [details, setDetails] = useState('');
  const [sent, setSent] = useState(false);
  const send = () => {
    const body = encodeURIComponent(details || 'Bug details:');
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Shakana bug report&body=${body}`);
    setSent(true);
  };
  return (
    <ScreenBase style={styles.screen}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>FEEDBACK LOOP</Text>
          <Text style={styles.title}>Bug report</Text>
          <Text style={styles.subtitle}>Send a reproducible issue to the Shakana team.</Text>
        </View>
      </View>
      <View style={styles.card}>
        <TextInput
          value={details}
          onChangeText={setDetails}
          multiline
          placeholder="What happened? What page were you on?"
          placeholderTextColor={colors.mu2}
          style={styles.input}
        />
        <Pressable onPress={send} style={styles.button}>
          <Text style={styles.buttonText}>Send bug report</Text>
        </Pressable>
        {sent ? <Text style={styles.message}>Thanks. Your email app should open with the report.</Text> : null}
      </View>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 20, paddingBottom: 36, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  kicker: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2.4, color: colors.gold, marginBottom: 4 },
  title: { fontFamily: fontFamily.display, fontSize: 30, color: colors.tx },
  subtitle: { marginTop: 8, fontFamily: fontFamily.body, fontSize: 13, lineHeight: 20, color: colors.mu },
  card: { gap: 14, padding: 16, borderWidth: 1, borderColor: colors.br, borderRadius: radii.xl, backgroundColor: colors.white, ...shadow.card },
  input: { minHeight: 150, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.br, backgroundColor: colors.bg, padding: 14, color: colors.tx, fontFamily: fontFamily.body, fontSize: 14, textAlignVertical: 'top' },
  button: { minHeight: 50, borderRadius: radii.pill, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  buttonText: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 14 },
  message: { color: colors.mu, fontFamily: fontFamily.bodySemi, fontSize: 13 },
});
