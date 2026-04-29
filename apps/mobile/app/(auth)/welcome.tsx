import { ImageBackground, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { PrimaryBtn, SecondaryBtn } from '@/components/primitives/Button';
import { ShakanaMark } from '@/components/primitives/ShakanaMark';
import { LanguageSwitcher } from '@/components/primitives/LanguageSwitcher';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useGoogleSignIn } from '@/api/auth';
import { useLocale } from '@/i18n/locale';
import { useUiStore } from '@/stores/uiStore';

const TERMS_URL = 'https://shakana.app/legal/terms';
const PRIVACY_URL = 'https://shakana.app/legal/privacy';
const FLOW_STRIP = ['Paste link', 'Detect store', 'Read price', 'Find deals', 'Invite friends', 'Shared cart'];

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
        authBody: 'Google יפתח בחירת חשבון בכל פעם, כדי שתוכל לעבור בין חשבונות בלי להיתקע על החשבון הקודם.',
        conceptTitle: 'מה Shakana עושה?',
        conceptBody: 'מדביקים קישור למוצר, בוחרים טיימר, שכנים מצטרפים ומשלמים, ואז מייסד ההזמנה קונה ידנית מהחנות. אין סקרייפינג נסתר ואין רכישה אוטומטית.',
        google: 'המשך עם Gmail',
        phone: 'המשך עם טלפון',
        openingGoogle: 'פותחים את Google...',
        googleError: 'לא הצלחנו לפתוח את Google. נסה שוב או המשך עם טלפון.',
      }
    : {
        authTitle: 'Log in or sign up',
        authBody: 'Google now asks which account to use, so switching between accounts does not silently reuse the previous one.',
        conceptTitle: 'What Shakana does',
        conceptBody: 'Paste a product link, choose a timer, neighbors join and pay, then the founder buys manually from the store. No hidden scraping and no automatic external purchase.',
        google: 'Continue with Gmail',
        phone: 'Continue with phone',
        openingGoogle: 'Opening Google...',
        googleError: 'Could not open Google sign-in. Try again or continue with phone.',
      };

  return (
    <ScreenBase style={styles.screen}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=80' }}
        style={styles.backdrop}
        imageStyle={styles.backdropImage}
      >
        <View style={styles.backdropOverlay} />
        <View style={styles.hero}>
          <ShakanaMark size={188} />
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>{t('landing.brand')}</Text>
            <Text style={styles.title}>{t('landing.title')}</Text>
            <Text style={styles.subtitle}>{t('landing.subtitle')}</Text>
          </View>
        </View>
      </ImageBackground>

      <View style={styles.conceptCard}>
        <Text style={styles.conceptTitle}>{copy.conceptTitle}</Text>
        <Text style={styles.conceptBody}>{copy.conceptBody}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storeStrip}>
          {FLOW_STRIP.map((store) => (
            <View key={store} style={styles.storePill}>
              <Text style={styles.storePillText}>{store}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.dot} />
          <Text style={styles.cardText}>{copy.authTitle}</Text>
        </View>
        <Text style={styles.cardBody}>{copy.authBody}</Text>
      </View>

      <View style={styles.ctaBlock}>
        <LanguageSwitcher />
        <SecondaryBtn
          label={googleMut.isPending ? copy.openingGoogle : copy.google}
          leading={<GoogleGlyph />}
          onPress={() => {
            googleMut.mutate(undefined, {
              onError: (error) => {
                pushToast(error instanceof Error ? error.message : copy.googleError, 'error');
              },
            });
          }}
        />
        <View style={styles.divider}>
          <View style={styles.divLine} />
          <Text style={styles.divText}>{t('common.or')}</Text>
          <View style={styles.divLine} />
        </View>
        <PrimaryBtn label={copy.phone} onPress={() => router.push('/(auth)/phone')} />
        <Text style={styles.legal}>
          {t('landing.legal')}
          <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>
            {t('common.terms')}
          </Text>{' '}
          {t('common.and') ?? 'and'}{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>
            {t('common.privacy')}
          </Text>
          .
        </Text>
      </View>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingBottom: 34,
    gap: 18,
  },
  backdrop: {
    minHeight: 330,
    justifyContent: 'flex-end',
    borderRadius: 34,
    overflow: 'hidden',
  },
  backdropImage: {
    borderRadius: 34,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 18, 37, 0.42)',
  },
  hero: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 26,
    paddingHorizontal: 16,
  },
  heroCopy: {
    alignItems: 'center',
    gap: 10,
  },
  kicker: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 2.4,
    color: colors.s1,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 34,
    color: colors.white,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: 'rgba(255,255,255,0.88)',
    maxWidth: 290,
    textAlign: 'center',
    lineHeight: 24,
  },
  conceptCard: {
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: 18,
    borderColor: colors.br,
    borderWidth: 1,
    gap: 12,
    ...shadow.card,
  },
  conceptTitle: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.tx,
  },
  conceptBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.mu,
  },
  storeStrip: {
    gap: 8,
    paddingRight: 4,
  },
  storePill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.pill,
    backgroundColor: colors.accLight,
    borderWidth: 1,
    borderColor: colors.brBr,
  },
  storePillText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: colors.acc,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: 18,
    borderColor: colors.br,
    borderWidth: 1,
    gap: 10,
    ...shadow.card,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.pink,
  },
  cardText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    letterSpacing: 1,
    color: colors.tx,
  },
  cardBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.mu,
  },
  ctaBlock: { gap: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divLine: { flex: 1, height: 1, backgroundColor: colors.br },
  divText: {
    fontSize: 12,
    color: colors.mu,
    fontFamily: fontFamily.bodyBold,
    letterSpacing: 1.6,
  },
  legal: {
    fontSize: 12,
    color: colors.mu,
    textAlign: 'center',
    fontFamily: fontFamily.body,
    lineHeight: 20,
  },
  link: { color: colors.acc, fontFamily: fontFamily.bodyBold },
});
