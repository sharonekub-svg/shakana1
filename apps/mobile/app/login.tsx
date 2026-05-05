import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, DemoButton, DemoPage, SectionTitle } from '@/components/demo/DemoPrimitives';
import { LanguageSwitcher } from '@/components/primitives/LanguageSwitcher';
import { useGoogleSignIn } from '@/api/auth';
import { initDemoCommerceSync, useDemoCommerceStore } from '@/stores/demoCommerceStore';
import { colors } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useLocale } from '@/i18n/locale';

export default function LoginScreen() {
  const router = useRouter();
  const { language } = useLocale();
  const isHebrew = language === 'he';
  const setDemoRole = useDemoCommerceStore((state) => state.setDemoRole);
  const googleSignIn = useGoogleSignIn();

  useEffect(() => {
    initDemoCommerceSync();
  }, []);

  const continueAsUser = () => {
    setDemoRole('user');
    router.replace('/user');
  };

  const continueAsStore = () => {
    setDemoRole('store');
    router.replace('/store');
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <DemoPage>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.brandBlock}>
              <Text style={styles.logo}>shakana</Text>
              <Text style={styles.brandCopy}>{isHebrew ? 'כניסה נקייה בעברית ובאנגלית' : 'Clean sign in in Hebrew and English'}</Text>
            </View>
            <LanguageSwitcher />
          </View>
          <Text style={styles.title}>{isHebrew ? 'ברוכים הבאים' : 'Welcome back'}</Text>
          <Text style={styles.subtitle}>
            {isHebrew
              ? 'התחברו עם Google או עם טלפון, והפרופיל ייווצר אוטומטית אחרי ההתחברות.'
              : 'Sign in with Google or phone, and your profile is created automatically after auth.'}
          </Text>
        </View>

        <View style={styles.grid}>
          <Card style={styles.card}>
            <SectionTitle title={isHebrew ? 'התחברות' : 'Sign in'} kicker={isHebrew ? 'מסלול אמיתי' : 'Real auth'} />
            <Text style={styles.helper}>
              {isHebrew
                ? 'זהו מסך ההתחברות האמיתי של Shakana. אין כאן קוד מהיר, רק התחברות פשוטה.'
                : 'This is the real Shakana login flow. No quick codes, just a clean sign-in.'}
            </Text>
            <View style={styles.buttonStack}>
              <DemoButton
                label={googleSignIn.isPending ? (isHebrew ? 'פותח את Google...' : 'Opening Google...') : (isHebrew ? 'המשך עם Google' : 'Continue with Google')}
                onPress={() => googleSignIn.mutate()}
                tone="accent"
              />
              <DemoButton label={isHebrew ? 'המשך עם טלפון' : 'Continue with phone'} onPress={() => router.push('/(auth)/phone')} tone="light" />
            </View>
          </Card>

          <Card style={styles.card}>
            <SectionTitle title={isHebrew ? 'הדגמה' : 'Demo entry'} kicker={isHebrew ? 'לצוות ולמצגת' : 'For demo mode'} />
            <Text style={styles.helper}>
              {isHebrew
                ? 'אם רוצים להציג את חוויית המשתמש או החנות בלי להתחבר, אפשר להיכנס ישירות לנתיב הדמו.'
                : 'If you need the user or store demo without auth, jump straight into the demo path.'}
            </Text>
            <View style={styles.buttonStack}>
              <DemoButton label={isHebrew ? 'המשך כמשתמש' : 'Continue as User'} onPress={continueAsUser} tone="accent" />
              <DemoButton label={isHebrew ? 'המשך כחנות' : 'Continue as Store / Agent M'} onPress={continueAsStore} />
            </View>
          </Card>
        </View>

        <Card style={styles.noteCard}>
          <Text style={styles.noteTitle}>{isHebrew ? 'פרופיל נוצר אוטומטית' : 'Profile created automatically'}</Text>
          <Text style={styles.noteBody}>
            {isHebrew
              ? 'אחרי ההתחברות, האפליקציה יוצרת רשומת פרופיל ומעבירה אותך למסך הבא.'
              : 'After auth, the app creates a profile record and routes you into the next screen.'}
          </Text>
        </Card>
      </DemoPage>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F8F4EE',
  },
  content: {
    flexGrow: 1,
  },
  hero: {
    minHeight: 240,
    justifyContent: 'center',
    gap: 10,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandBlock: {
    flex: 1,
    gap: 4,
  },
  logo: {
    color: colors.gold,
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  brandCopy: {
    color: colors.mu,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 320,
  },
  title: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 42,
    lineHeight: 46,
    maxWidth: 740,
  },
  subtitle: {
    color: colors.mu,
    fontFamily: fontFamily.body,
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 640,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    flexGrow: 1,
    flexBasis: 320,
    gap: 14,
  },
  helper: {
    color: colors.mu,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 23,
  },
  buttonStack: {
    gap: 10,
  },
  noteCard: {
    gap: 8,
  },
  noteTitle: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
  },
  noteBody: {
    color: colors.mu,
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
  },
});
