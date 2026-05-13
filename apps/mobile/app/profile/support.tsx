import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

const SUPPORT_EMAIL = 'support@shakana.app';

export default function SupportScreen() {
  const router = useRouter();
  const openEmail = () => {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Shakana support request`);
  };
  return (
    <ScreenBase style={styles.screen}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>FEEDBACK LOOP</Text>
          <Text style={styles.title}>Contact support</Text>
          <Text style={styles.subtitle}>Reach the team for account, order, or merchant help.</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.body}>Support email: {SUPPORT_EMAIL}</Text>
        <Pressable onPress={openEmail} style={styles.button}>
          <Text style={styles.buttonText}>Email support</Text>
        </Pressable>
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
  body: { fontFamily: fontFamily.body, fontSize: 14, lineHeight: 22, color: colors.tx },
  button: { minHeight: 50, borderRadius: radii.lg, backgroundColor: colors.acc, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  buttonText: { color: colors.white, fontFamily: fontFamily.bodyBold, fontSize: 14 },
});
