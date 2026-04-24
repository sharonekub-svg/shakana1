import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { PrimaryBtn, SecondaryBtn } from '@/components/primitives/Button';
import { ShakanaMark } from '@/components/primitives/ShakanaMark';
import { colors } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useGoogleSignIn } from '@/api/auth';

const TERMS_URL = 'https://shakana.app/legal/terms';
const PRIVACY_URL = 'https://shakana.app/legal/privacy';

function GoogleGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

export default function Welcome() {
  const router = useRouter();
  const googleMut = useGoogleSignIn();

  return (
    <ScreenBase style={styles.screen}>
      <View />
      <View style={styles.hero}>
        <ShakanaMark size={88} />
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text style={styles.title}>שכנה</Text>
          <Text style={styles.subtitle}>הזמנות קבוצתיות עם השכנים שלך. פשוט ומאובטח.</Text>
        </View>
      </View>
      <View style={styles.ctaBlock}>
        <SecondaryBtn
          label="המשך עם Google"
          leading={<GoogleGlyph />}
          onPress={() => googleMut.mutate()}
        />
        <View style={styles.divider}>
          <View style={styles.divLine} />
          <Text style={styles.divText}>או</Text>
          <View style={styles.divLine} />
        </View>
        <PrimaryBtn label="המשך עם מספר טלפון" onPress={() => router.push('/(auth)/phone')} />
        <Text style={styles.legal}>
          בהמשך אתה מאשר את{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>
            תנאי השימוש
          </Text>{' '}
          ואת{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>
            מדיניות הפרטיות
          </Text>{' '}
          של שכנה.
        </Text>
      </View>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'space-between', paddingVertical: 48 },
  hero: { alignItems: 'center', gap: 20 },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 36,
    color: colors.tx,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 16,
    color: colors.mu,
    maxWidth: 260,
    textAlign: 'center',
    lineHeight: 26,
  },
  ctaBlock: { gap: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divLine: { flex: 1, height: 1, backgroundColor: colors.br },
  divText: { fontSize: 13, color: colors.mu, fontFamily: fontFamily.body },
  legal: {
    fontSize: 12,
    color: colors.mu,
    textAlign: 'center',
    fontFamily: fontFamily.body,
    lineHeight: 20,
  },
  link: { color: colors.acc, fontFamily: fontFamily.bodyMedium },
});
