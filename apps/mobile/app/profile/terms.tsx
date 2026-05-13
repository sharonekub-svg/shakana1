import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

const points = [
  'Use Shakana for lawful personal shopping and normal shared-order activity only.',
  'Do not attempt to bypass authentication, checkout, escrow, merchant, or account controls.',
  'Users are responsible for the accuracy of products, variants, addresses, and shared-cart invitations.',
  'Orders may lock when timers end or when payment/merchant processing starts.',
  'These terms may be updated as the product moves from demo to production.',
];

export default function TermsScreen() {
  const router = useRouter();
  return (
    <ScreenBase style={styles.screen}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>LEGAL</Text>
          <Text style={styles.title}>Terms & Conditions</Text>
          <Text style={styles.subtitle}>Usage rules for the Shakana app experience.</Text>
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
  kicker: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2.4, color: colors.acc, marginBottom: 4 },
  title: { fontFamily: fontFamily.display, fontSize: 30, color: colors.tx },
  subtitle: { marginTop: 8, fontFamily: fontFamily.body, fontSize: 13, lineHeight: 20, color: colors.mu },
  card: { gap: 14, padding: 16, borderWidth: 1, borderColor: colors.br, borderRadius: radii.xl, backgroundColor: colors.white, ...shadow.card },
  point: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  check: { color: colors.err, fontFamily: fontFamily.bodyBold, fontSize: 18, lineHeight: 23 },
  body: { flex: 1, fontFamily: fontFamily.body, fontSize: 14, lineHeight: 22, color: colors.tx },
});
