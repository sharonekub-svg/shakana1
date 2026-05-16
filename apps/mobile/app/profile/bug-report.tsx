import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useLocale } from '@/i18n/locale';

const SUPPORT_EMAIL = 'sharonkub@gmail.com';

export default function BugReportScreen() {
  const router = useRouter();
  const { language } = useLocale();
  const isHebrew = language === 'he';
  const [details, setDetails] = useState('');
  const [sent, setSent] = useState(false);

  const send = () => {
    if (!details.trim()) return;
    const subject = encodeURIComponent(isHebrew ? 'דיווח על בעיה — Shakana' : 'Bug report — Shakana');
    const body = encodeURIComponent(details.trim());
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
    setSent(true);
  };

  return (
    <ScreenBase style={styles.screen}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>SHAKANA</Text>
          <Text style={styles.title}>
            {isHebrew ? 'רוצה לדווח על בעיה?' : 'Wanna report a bug?'}
          </Text>
          <Text style={styles.subtitle}>
            {isHebrew
              ? 'כתוב לנו מה קרה ומתי. אנחנו קוראים הכל.'
              : 'Tell us what happened and when. We read everything.'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <TextInput
          value={details}
          onChangeText={setDetails}
          multiline
          placeholder={isHebrew ? 'מה קרה? באיזה מסך היית?' : 'What happened? Which screen were you on?'}
          placeholderTextColor={colors.mu2}
          style={styles.input}
          textAlignVertical="top"
        />
        {sent ? (
          <View style={styles.sentBox}>
            <Text style={styles.sentText}>
              {isHebrew
                ? 'תודה. אפליקציית המייל שלך צריכה לפתוח עם הדיווח.'
                : 'Thanks. Your email app should open with the report.'}
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={send}
            disabled={!details.trim()}
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }, !details.trim() && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {isHebrew ? 'שלח דיווח' : 'Send report'}
            </Text>
          </Pressable>
        )}
      </View>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 20, paddingBottom: 36, gap: 22 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  kicker: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2.4, color: colors.acc, marginBottom: 6 },
  title: { fontFamily: fontFamily.display, fontSize: 28, color: colors.tx, lineHeight: 34 },
  subtitle: { marginTop: 8, fontFamily: fontFamily.body, fontSize: 14, lineHeight: 21, color: colors.mu },
  card: { gap: 14, padding: 16, borderWidth: 1, borderColor: colors.br, borderRadius: radii.xl, backgroundColor: colors.s1, ...shadow.card },
  input: {
    minHeight: 160,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.bg,
    padding: 14,
    color: colors.tx,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    minHeight: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.acc,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.white, fontFamily: fontFamily.bodyBold, fontSize: 15 },
  sentBox: {
    backgroundColor: colors.cardSoft,
    borderRadius: radii.lg,
    padding: 16,
    alignItems: 'center',
  },
  sentText: { color: colors.mu, fontFamily: fontFamily.bodySemi, fontSize: 14, textAlign: 'center', lineHeight: 21 },
});
