import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageSwitcher } from '@/components/primitives/LanguageSwitcher';
import { fontFamily } from '@/theme/fonts';
import { useGoogleSignIn } from '@/api/auth';
import { useLocale } from '@/i18n/locale';
import { useUiStore } from '@/stores/uiStore';

const TERMS_URL = 'https://shakana.app/legal/terms';
const PRIVACY_URL = 'https://shakana.app/legal/privacy';
const FLOW_STRIP = {
  he: ['הדבקת קישור', 'זיהוי חנות', 'קריאת מחיר', 'מציאת מבצעים', 'הזמנת חברים', 'סל משותף'],
  en: ['Paste link', 'Detect store', 'Read price', 'Find deals', 'Invite friends', 'Shared cart'],
};

// Claude-inspired palette: warm paper, cocoa ink, and clay actions.
const W = {
  bg: '#F7F1E8',
  surface: '#FFFCF7',
  surfaceTint: '#F1E7DA',
  tx: '#2B2118',
  mu: '#6F6257',
  mu2: '#A19183',
  acc: '#B35C37',
  accLight: '#F6E4D6',
  accBorder: '#E3D5C6',
  border: '#E3D5C6',
  borderStrong: '#CDBBA9',
  shadow: 'rgba(43,33,24,0.08)',
} as const;

function GoogleGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

function ArrowRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M3 8h10M9 4l4 4-4 4" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function Welcome() {
  const router = useRouter();
  const googleMut = useGoogleSignIn();
  const pushToast = useUiStore((s) => s.pushToast);
  const { language, t } = useLocale();
  const copy =
    language === 'he'
      ? {
          eyebrow: 'הזמנות שכנים',
          authTitle: 'כניסה או הרשמה',
          authBody:
            'Google יפתח בחירת חשבון בכל פעם, כדי שתוכל לעבור בין חשבונות בלי להיתקע על החשבון הקודם.',
          conceptTitle: 'מה Shakana עושה?',
          conceptBody:
            'מדביקים קישור למוצר, בוחרים טיימר, שכנים מצטרפים ומשלמים, ואז מייסד ההזמנה קונה ידנית מהחנות.',
          google: 'המשך עם Google',
          phone: 'המשך עם מספר טלפון',
          openingGoogle: 'פותחים את Google...',
          googleError: 'לא הצלחנו לפתוח את Google. נסה שוב.',
          step: 'שלב',
        }
      : {
          eyebrow: 'Group ordering, simplified',
          authTitle: 'Sign in or create account',
          authBody:
            'Google opens account selection each time, so switching accounts never silently reuses the previous one.',
          conceptTitle: 'How Shakana works',
          conceptBody:
            'Paste a product link, set a timer, neighbors join and pay — then the founder manually buys from the store.',
          google: 'Continue with Google',
          phone: 'Continue with phone number',
          openingGoogle: 'Opening Google...',
          googleError: 'Could not open Google sign-in. Try again.',
          step: 'Step',
        };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ contentStyle: { backgroundColor: W.bg } }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Eyebrow + Hero ── */}
        <View style={styles.hero}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
          </View>

          <Text style={styles.heroTitle}>{t('landing.title')}</Text>
          <Text style={styles.heroSub}>{t('landing.subtitle')}</Text>
        </View>

        {/* ── Flow steps ── */}
        <View style={styles.stepsCard}>
          <Text style={styles.stepsLabel}>{copy.conceptTitle}</Text>
          <Text style={styles.stepsBody}>{copy.conceptBody}</Text>
          <View style={styles.stepsRow}>
            {FLOW_STRIP[language].map((step, i) => (
              <View key={step} style={styles.step}>
                <Text style={styles.stepNum}>{i + 1}</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Auth note ── */}
        <View style={styles.noteCard}>
          <View style={styles.noteIconWrap}>
            <View style={styles.noteIcon} />
          </View>
          <View style={styles.noteBody}>
            <Text style={styles.noteTitle}>{copy.authTitle}</Text>
            <Text style={styles.noteText}>{copy.authBody}</Text>
          </View>
        </View>

        {/* ── Language ── */}
        <LanguageSwitcher />

        {/* ── CTAs ── */}
        <View style={styles.ctaBlock}>
          {/* Primary — phone */}
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.88 }]}
            onPress={() => router.push('/(auth)/phone')}
            accessibilityRole="button"
            accessibilityLabel={copy.phone}
          >
            <Text style={styles.btnPrimaryLabel}>{copy.phone}</Text>
            <ArrowRight />
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.divLine} />
            <Text style={styles.divText}>{t('common.or')}</Text>
            <View style={styles.divLine} />
          </View>

          {/* Secondary — Google */}
          <Pressable
            style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.75 }]}
            onPress={() => {
              googleMut.mutate(undefined, {
                onError: (error) => {
                  pushToast(
                    error instanceof Error ? error.message : copy.googleError,
                    'error',
                  );
                },
              });
            }}
            accessibilityRole="button"
            accessibilityLabel={copy.google}
          >
            <GoogleGlyph />
            <Text style={styles.btnSecondaryLabel}>
              {googleMut.isPending ? copy.openingGoogle : copy.google}
            </Text>
          </Pressable>
        </View>

        {/* ── Legal ── */}
        <Text style={styles.legal}>
          {t('landing.legal')}
          <Text style={styles.legalLink} onPress={() => Linking.openURL(TERMS_URL)}>
            {t('common.terms')}
          </Text>
          {'  '}
          <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
            {t('common.privacy')}
          </Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: W.bg },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 22,
    paddingTop: 32,
    paddingBottom: 48,
    gap: 14,
  },

  // Hero
  hero: { gap: 12, paddingBottom: 8 },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: W.acc,
  },
  eyebrow: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: W.acc,
  },
  heroTitle: {
    fontFamily: fontFamily.display,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.8,
    color: W.tx,
  },
  heroSub: {
    fontFamily: fontFamily.body,
    fontSize: 16,
    lineHeight: 26,
    color: W.mu,
    maxWidth: 320,
  },

  // Steps card
  stepsCard: {
    backgroundColor: W.surface,
    borderRadius: 20,
    padding: 22,
    gap: 12,
    borderWidth: 1,
    borderColor: W.border,
    shadowColor: W.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  stepsLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: W.tx,
    letterSpacing: -0.1,
  },
  stepsBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: W.mu,
  },
  stepsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: W.accLight,
    borderWidth: 1,
    borderColor: W.accBorder,
  },
  stepNum: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    color: W.acc,
  },
  stepText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: W.acc,
  },

  // Note card
  noteCard: {
    backgroundColor: W.surfaceTint,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderWidth: 1,
    borderColor: W.border,
  },
  noteIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: W.accLight,
    borderWidth: 1,
    borderColor: W.accBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  noteIcon: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: W.acc,
  },
  noteBody: { flex: 1, gap: 5 },
  noteTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: W.tx,
    letterSpacing: 0.2,
  },
  noteText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 21,
    color: W.mu,
  },

  // CTAs
  ctaBlock: { gap: 10, marginTop: 4 },
  btnPrimary: {
    width: '100%',
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: W.tx,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 22,
    shadowColor: W.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  btnPrimaryLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 2 },
  divLine: { flex: 1, height: 1, backgroundColor: W.border },
  divText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    letterSpacing: 1.4,
    color: W.mu2,
  },
  btnSecondary: {
    width: '100%',
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: W.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: W.border,
    shadowColor: W.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 1,
  },
  btnSecondaryLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: W.tx,
  },

  // Legal
  legal: {
    fontSize: 12,
    color: W.mu2,
    textAlign: 'center',
    fontFamily: fontFamily.body,
    lineHeight: 20,
    marginTop: 4,
  },
  legalLink: {
    color: W.acc,
    fontFamily: fontFamily.bodySemi,
  },
});
