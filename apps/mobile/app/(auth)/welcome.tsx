import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fontFamily } from '@/theme/fonts';
import { useGoogleSignIn } from '@/api/auth';
import { useLocale } from '@/i18n/locale';
import { useUiStore } from '@/stores/uiStore';

const TERMS_URL = 'https://shakana.app/legal/terms';
const PRIVACY_URL = 'https://shakana.app/legal/privacy';

const D = {
  bg: '#1B1612',
  surface: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.14)',
  borderStrong: 'rgba(255,255,255,0.22)',
  paper: '#FAF6EF',
  paperMu: 'rgba(255,255,255,0.55)',
  paperMu2: 'rgba(255,255,255,0.35)',
  primary: '#C5654B',
  gold: '#D29A4A',
  accent: '#E3D6BE',
} as const;

function LangToggle() {
  const { language, setLanguage } = useLocale();
  return (
    <View style={s.langRow}>
      <Pressable
        onPress={() => void setLanguage('en')}
        style={[s.langBtn, language === 'en' && s.langBtnActive]}
        accessibilityRole="button"
        accessibilityLabel="English"
      >
        <Text style={[s.langBtnText, language === 'en' && s.langBtnTextActive]}>EN</Text>
      </Pressable>
      <Pressable
        onPress={() => void setLanguage('he')}
        style={[s.langBtn, language === 'he' && s.langBtnActive]}
        accessibilityRole="button"
        accessibilityLabel="עברית"
      >
        <Text style={[s.langBtnText, language === 'he' && s.langBtnTextActive]}>עב</Text>
      </Pressable>
    </View>
  );
}

function BuildingGlyph() {
  return (
    <Svg viewBox="0 0 320 300" width="100%" height="100%" fill="none">
      <Rect x="60" y="30" width="200" height="240" stroke={D.borderStrong} strokeWidth="1.2" />
      <Line x1="160" y1="30" x2="160" y2="270" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
      {([75, 120, 165, 210] as const).map((y, ri) =>
        ([80, 120, 175, 215] as const).map((x, ci) => {
          const lit = (ri + ci) % 2 === 0;
          return (
            <Rect
              key={`${x}-${y}`}
              x={x} y={y} width="20" height="30"
              fill={lit ? D.primary : 'rgba(255,255,255,0.06)'}
              opacity={lit ? 0.85 : 1}
            />
          );
        })
      )}
      <Rect x="140" y="240" width="40" height="30" fill="rgba(255,255,255,0.08)" />
      <Path d="M40 30 L160 5 L280 30" stroke={D.borderStrong} strokeWidth="1.2" />
      <Line x1="20" y1="270" x2="300" y2="270" stroke={D.borderStrong} strokeWidth="1.2" />
      <Path d="M20 283 Q 160 230 300 283" stroke={D.gold} strokeWidth="1.2" strokeDasharray="2 5" />
    </Svg>
  );
}

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

function AppleGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill={D.paper}>
      <Path d="M16 11c0-2 1.5-3 1.5-3-1-1.5-2.5-1.5-3-1.5-1.3-.1-2.5.8-3.2.8-.6 0-1.6-.7-2.7-.7C7 6.6 5 8.5 5 12c0 4 3 8 4.5 8 .8 0 1.5-.6 2.5-.6 1 0 1.5.6 2.5.6 1.6 0 3-2.6 3.5-3.5-2-1-2-4.5-2-5.5z" />
      <Path d="M14 5c.6-.7.9-1.7.8-2.5-.8 0-1.8.5-2.4 1.2-.6.6-1 1.6-.8 2.5.8.1 1.8-.5 2.4-1.2z" />
    </Svg>
  );
}

function StoreGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={D.paper} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 10l1-5h14l1 5" />
      <Path d="M5 10v9h14v-9" />
      <Path d="M4 10a2.5 2.5 0 005 0 2.5 2.5 0 005 0 2.5 2.5 0 005 0 2.5 2.5 0 001 0" />
    </Svg>
  );
}

export default function Welcome() {
  const router = useRouter();
  const googleMut = useGoogleSignIn();
  const pushToast = useUiStore((s) => s.pushToast);
  const { language, t } = useLocale();
  const isHe = language === 'he';

  const copy = isHe
    ? {
        tagline: 'הזמנות שכנים · משלוח משותף',
        google: 'המשך עם Google',
        apple: 'המשך עם Apple',
        phone: 'המשך עם מספר טלפון',
        storeLogin: 'כניסה לחנות',
        or: 'או',
        openingGoogle: 'פותחים...',
        googleError: 'לא הצלחנו לפתוח את Google. נסה שוב.',
      }
    : {
        tagline: 'Group ordering · split shipping',
        google: 'Continue with Google',
        apple: 'Continue with Apple',
        phone: 'Continue with phone number',
        storeLogin: 'Store login',
        or: 'or',
        openingGoogle: 'Opening...',
        googleError: 'Could not open Google sign-in. Try again.',
      };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ contentStyle: { backgroundColor: D.bg }, headerShown: false }} />

      <View style={s.container}>
        {/* Language toggle — top right */}
        <View style={s.topRow}>
          <LangToggle />
        </View>

        {/* Wordmark */}
        <View style={s.wordmarkRow}>
          <Text style={s.wordmark}>
            {t('landing.appName') ?? 'shakana'}
            <Text style={s.wordmarkDot}>.</Text>
          </Text>
          <Text style={s.tagline}>{copy.tagline}</Text>
        </View>

        {/* Building illustration */}
        <View style={s.glyphWrap}>
          <BuildingGlyph />
        </View>

        {/* Auth buttons */}
        <View style={s.ctaBlock}>
          {/* Primary — phone */}
          <Pressable
            style={({ pressed }) => [s.btnPrimary, pressed && { opacity: 0.88 }]}
            onPress={() => router.push('/(auth)/phone')}
            accessibilityRole="button"
            accessibilityLabel={copy.phone}
          >
            <Text style={s.btnPrimaryLabel}>{copy.phone}</Text>
          </Pressable>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.divLine} />
            <Text style={s.divText}>{copy.or}</Text>
            <View style={s.divLine} />
          </View>

          {/* Google */}
          <Pressable
            style={({ pressed }) => [s.btnDark, pressed && { opacity: 0.75 }]}
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
            <Text style={s.btnDarkLabel}>
              {googleMut.isPending ? copy.openingGoogle : copy.google}
            </Text>
          </Pressable>

          {/* Apple */}
          <Pressable
            style={({ pressed }) => [s.btnDark, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
            accessibilityLabel={copy.apple}
          >
            <AppleGlyph />
            <Text style={s.btnDarkLabel}>{copy.apple}</Text>
          </Pressable>

          {/* Store login */}
          <Pressable
            style={({ pressed }) => [s.btnGhost, pressed && { opacity: 0.75 }]}
            onPress={() => router.push('/login')}
            accessibilityRole="button"
            accessibilityLabel={copy.storeLogin}
          >
            <StoreGlyph />
            <Text style={s.btnGhostLabel}>{copy.storeLogin}</Text>
          </Pressable>
        </View>

        {/* Legal */}
        <Text style={s.legal}>
          {t('landing.legal') ?? 'By continuing you agree to our '}
          <Text style={s.legalLink} onPress={() => Linking.openURL(TERMS_URL)}>
            {t('common.terms') ?? 'Terms'}
          </Text>
          {'  '}
          <Text style={s.legalLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
            {t('common.privacy') ?? 'Privacy'}
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: D.bg },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  langRow: {
    flexDirection: 'row',
    gap: 6,
  },
  langBtn: {
    width: 44,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.border,
  },
  langBtnActive: {
    backgroundColor: D.paper,
    borderColor: D.paper,
  },
  langBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: D.paper,
  },
  langBtnTextActive: {
    color: '#1B1612',
  },
  wordmarkRow: {
    gap: 6,
    marginBottom: 8,
  },
  wordmark: {
    fontFamily: fontFamily.display,
    fontSize: 64,
    lineHeight: 62,
    letterSpacing: -2,
    color: D.paper,
    fontStyle: 'italic',
  },
  wordmarkDot: {
    color: D.primary,
  },
  tagline: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: D.paperMu,
  },
  glyphWrap: {
    flex: 1,
    marginHorizontal: -8,
    marginTop: 8,
    minHeight: 180,
    maxHeight: 280,
  },
  ctaBlock: {
    gap: 10,
    marginTop: 8,
  },
  btnPrimary: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: D.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  btnPrimaryLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    color: D.paper,
    letterSpacing: -0.1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  divLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  divText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)',
  },
  btnDark: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  btnDarkLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: D.paper,
  },
  btnGhost: {
    width: '100%',
    height: 46,
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnGhostLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: D.paper,
  },
  legal: {
    fontSize: 11,
    color: D.paperMu2,
    textAlign: 'center',
    fontFamily: fontFamily.body,
    lineHeight: 18,
    marginTop: 14,
  },
  legalLink: {
    color: D.accent,
    fontFamily: fontFamily.bodySemi,
  },
});
