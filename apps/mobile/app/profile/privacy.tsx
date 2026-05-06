import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

const points = [
  'We collect only the data needed for accounts, group orders, delivery, support, and fraud prevention.',
  'Names, phone numbers, addresses, and order items are used to operate shared carts and merchant handoff.',
  'Auth tokens are handled by Supabase Auth and stored with the platform secure storage layer.',
  'We do not sell personal data. Analytics and cookies can be controlled from Cookie consent.',
  'Users can request account deletion from Profile > Delete account.',
];

export default function PrivacyScreen() {
  const router = useRouter();
  return (
    <ScreenBase style={styles.screen}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>LEGAL</Text>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.subtitle}>Clear privacy terms for the Shakana demo app.</Text>
        </View>
      </View>
      <View style={styles.card}>
        {points.map((point) => (
          <View key={point} style={styles.point}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.body}>{point}</Text>
          </View>
        ))}
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
  point: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  check: { color: colors.err, fontFamily: fontFamily.bodyBold, fontSize: 18, lineHeight: 23 },
  body: { flex: 1, fontFamily: fontFamily.body, fontSize: 14, lineHeight: 22, color: colors.tx },
});
