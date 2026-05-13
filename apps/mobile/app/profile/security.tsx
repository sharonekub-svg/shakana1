import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

const checks = [
  'Signup / login flow tested',
  'Email verification handled by Supabase Auth',
  'Password reset email flow available',
  'OAuth enabled for Google sign in',
  'Rate limiting handled by Supabase Auth plus disabled repeated submit states',
];

export default function SecurityScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const [message, setMessage] = useState('');
  const email = session?.user.email ?? '';

  const sendReset = async () => {
    if (!email) {
      setMessage('Sign in with an email account before sending a reset link.');
      return;
    }
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth-callback` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setMessage(error ? error.message : `Password reset email sent to ${email}.`);
  };

  return (
    <ScreenBase style={styles.screen}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>AUTH & SECURITY</Text>
          <Text style={styles.title}>Security checklist</Text>
          <Text style={styles.subtitle}>Login, verification, reset, OAuth, and rate-limit coverage.</Text>
        </View>
      </View>
      <View style={styles.card}>
        {checks.map((check) => (
          <View key={check} style={styles.point}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.body}>{check}</Text>
          </View>
        ))}
        <Pressable onPress={sendReset} style={styles.button}>
          <Text style={styles.buttonText}>Send password reset email</Text>
        </Pressable>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 20, paddingBottom: 36, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  kicker: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2.4, color: colors.acc, marginBottom: 4 },
  title: { fontFamily: fontFamily.display, fontSize: 30, color: colors.tx },
  subtitle: { marginTop: 8, fontFamily: fontFamily.body, fontSize: 13, lineHeight: 20, color: colors.mu },
  card: { gap: 14, padding: 16, borderWidth: 1, borderColor: colors.br, borderRadius: radii.xl, backgroundColor: colors.s1, ...shadow.card },
  point: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  check: { color: colors.err, fontFamily: fontFamily.bodyBold, fontSize: 18, lineHeight: 23 },
  body: { flex: 1, fontFamily: fontFamily.body, fontSize: 14, lineHeight: 22, color: colors.tx },
  button: { minHeight: 50, borderRadius: radii.lg, backgroundColor: colors.acc, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  buttonText: { color: colors.white, fontFamily: fontFamily.bodyBold, fontSize: 14 },
  message: { color: colors.mu, fontFamily: fontFamily.bodySemi, fontSize: 13, lineHeight: 20 },
});
