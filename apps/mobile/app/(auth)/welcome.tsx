import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageSwitcher } from '@/components/primitives/LanguageSwitcher';
import { fontFamily } from '@/theme/fonts';
import { radii } from '@/theme/tokens';
import { useGoogleSignIn } from '@/api/auth';
import { useLocale } from '@/i18n/locale';
import { useUiStore } from '@/stores/uiStore';

const TERMS_URL = 'https://shakana.app/legal/terms';
const PRIVACY_URL = 'https://shakana.app/legal/privacy';
const FLOW_STRIP = {
  he: ['הדבקת קישור', 'זיהוי חנות', 'קריאת מחיר', 'מציאת מבצעים', 'הזמנת חברים', 'סל משותף'],
  en: ['Paste link', 'Detect store', 'Read price', 'Find deals', 'Invite friends', 'Shared cart'],
};

// Wispr Flow inspired dark palette
const D = {
  bg: '#060A12',
  card: 'rgba(255,255,255,0.05)',
  cardBorder: 'rgba(255,255,255,0.09)',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.50)',
  accent: '#4B8AFF',
  accentBg: 'rgba(75,138,255,0.10)',
  accentBorder: 'rgba(75,138,255,0.20)',
  pill: 'rgba(255,255,255,0.07)',
  pillBorder: 'rgba(255,255,255,0.12)',
  divider: 'rgba(255,255,255,0.10)',
  orb: 'rgba(75,138,255,0.15)',
} as const;

function GoogleGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

export default function Welcome() {
  const router = useRouter();
  const googleMut = useGoogleSignIn();
  const pushToast = useUiStore((s) => s.pushToast);
  const { language, t } = useLocale();
  const isHebrew = language === 'he';
  const copy = isHebrew
    ? {
        authTitle: 'כניסה או הרשמה',
        authBody:
          'Google יפתח בחירת חשבון בכל פעם, כדי שתוכל לעבור בין חשבונות בלי להיתקע על החשבון הקודם.',
        conceptTitle: 'מה Shakana עושה?',
        conceptBody:
          'מדביקים קישור למוצר, בוחרים טיימר, שכנים מצטרפים ומשלמים, ואז מייסד ההזמנה קונה ידנית מהחנות. אין סקרייפינג נסתר ואין רכישה אוטומטית.',
        google: 'המשך עם Gmail',
        phone: 'המשך עם טלפון',
        openingGoogle: 'פותחים את Google...',
        googleError: 'לא הצלחנו לפתוח את Google. נסה שוב או המשך עם טלפון.',
      }
    : {
        authTitle: 'Log in or sign up',
        authBody:
          'Google now asks which account to use, so switching between accounts does not silently reuse the previous one.',
        conceptTitle: 'What Shakana does',
        conceptBody:
          'Paste a product link, choose a timer, neighbors join and pay, then the founder buys manually from the store. No hidden scraping and no automatic external purchase.',
        google: 'Continue with Gmail',
        phone: 'Continue with phone',
        openingGoogle: 'Opening Google...',
        googleError: 'Could not open Google sign-in. Try again or continue with phone.',
      };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ contentStyle: { backgroundColor: D.bg } }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Decorative glow orb */}
        <View style={styles.orbContainer} pointerEvents="none">
          <View style={styles.orb} />
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.wordmarkChip}>
            <Text style={styles.wordmark}>shakana</Text>
          </View>
          <Text style={styles.heroTitle}>{t('landing.title')}</Text>
          <Text style={styles.heroSub}>{t('landing.subtitle')}</Text>
        </View>

        {/* Flow steps strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripContent}
        >
          {FLOW_STRIP[language].map((step, i) => (
            <View key={step} style={styles.stepPill}>
              <Text style={styles.stepNum}>{i + 1}</Text>
              <Text style={styles.stepLabel}>{step}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Concept card */}
        <View style={styles.glassCard}>
          <Text style={styles.cardTitle}>{copy.conceptTitle}</Text>
          <Text style={styles.cardBody}>{copy.conceptBody}</Text>
        </View>

        {/* Auth info card */}
        <View style={[styles.glassCard, styles.accentCard]}>
          <View style={styles.accentDot} />
          <View style={styles.accentCardBody}>
            <Text style={[styles.cardTitle, styles.cardTitleSmall]}>{copy.authTitle}</Text>
            <Text style={[styles.cardBody, styles.cardBodyTop]}>{copy.authBody}</Text>
          </View>
        </View>

        {/* CTA block */}
        <View style={styles.ctaBlock}>
          <LanguageSwitcher dark />

          <Pressable
            style={({ pressed }) => [styles.btnGlass, pressed && { opacity: 0.75 }]}
            onPress={() => {
              googleMut.mutate(undefined, {
                onError: (error) => {
                  pushToast(error instanceof Error ? error.message : copy.googleError, 'error');
                },
              });
            }}
            accessibilityRole="button"
            accessibilityLabel={copy.google}
          >
            <GoogleGlyph />
            <Text style={styles.btnGlassLabel}>
              {googleMut.isPending ? copy.openingGoogle : copy.google}
            </Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.divLine} />
            <Text style={styles.divText}>{t('common.or')}</Text>
            <View style={styles.divLine} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.90 }]}
            onPress={() => router.push('/(auth)/phone')}
            accessibilityRole="button"
            accessibilityLabel={copy.phone}
          >
            <Text style={styles.btnPrimaryLabel}>{copy.phone}</Text>
          </Pressable>

          <Text style={styles.legal}>
            {t('landing.legal')}
            <Text style={styles.legalLink} onPress={() => Linking.openURL(TERMS_URL)}>
              {t('common.terms')}
            </Text>
            {' '}
            {t('common.and') ?? 'and'}
            {' '}
            <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
              {t('common.privacy')}
            </Text>
            .
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: D.bg,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 44,
    gap: 16,
  },
  orbContainer: {
    position: 'absolute',
    top: -100,
    alignSelf: 'center',
    width: 380,
    height: 380,
    pointerEvents: 'none',
  },
  orb: {
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: D.orb,
    opacity: 0.7,
  },
  hero: {
    paddingTop: 48,
    paddingBottom: 8,
    gap: 14,
    alignItems: 'center',
  },
  wordmarkChip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radii.pill,
    backgroundColor: D.pill,
    borderWidth: 1,
    borderColor: D.pillBorder,
  },
  wordmark: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: D.text,
    letterSpacing: 2,
  },
  heroTitle: {
    fontFamily: fontFamily.display,
    fontSize: 36,
    color: D.text,
    letterSpacing: -0.6,
    textAlign: 'center',
    lineHeight: 44,
  },
  heroSub: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: D.muted,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  stripContent: {
    gap: 8,
    paddingRight: 4,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: D.pill,
    borderWidth: 1,
    borderColor: D.pillBorder,
  },
  stepNum: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    color: D.accent,
  },
  stepLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: D.text,
  },
  glassCard: {
    backgroundColor: D.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: D.cardBorder,
    padding: 20,
    gap: 10,
  },
  accentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: D.accentBg,
    borderColor: D.accentBorder,
  },
  accentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: D.accent,
    marginTop: 6,
    flexShrink: 0,
  },
  accentCardBody: { flex: 1, gap: 6 },
  cardTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 17,
    color: D.text,
  },
  cardTitleSmall: { fontSize: 13, letterSpacing: 0.8 },
  cardBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: D.muted,
    lineHeight: 22,
  },
  cardBodyTop: { marginTop: 0 },
  ctaBlock: { gap: 12, marginTop: 4 },
  btnGlass: {
    width: '100%',
    minHeight: 52,
    borderRadius: radii.pill,
    backgroundColor: D.pill,
    borderWidth: 1,
    borderColor: D.pillBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  btnGlassLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    color: D.text,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divLine: { flex: 1, height: 1, backgroundColor: D.divider },
  divText: {
    fontSize: 12,
    color: D.muted,
    fontFamily: fontFamily.bodyBold,
    letterSpacing: 1.6,
  },
  btnPrimary: {
    width: '100%',
    minHeight: 54,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  btnPrimaryLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    color: '#060A12',
    letterSpacing: 0.2,
  },
  legal: {
    fontSize: 12,
    color: D.muted,
    textAlign: 'center',
    fontFamily: fontFamily.body,
    lineHeight: 20,
  },
  legalLink: { color: D.accent, fontFamily: fontFamily.bodyBold },
});
