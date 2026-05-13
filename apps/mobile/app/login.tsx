import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';

import { useGoogleSignIn } from '@/api/auth';
import { initDemoCommerceSync, useDemoCommerceStore } from '@/stores/demoCommerceStore';
import { useUiStore } from '@/stores/uiStore';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useLocale } from '@/i18n/locale';
import { env } from '@/lib/env';

const D = {
  bg: '#1B1612',
  surface: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.14)',
  borderStrong: 'rgba(255,255,255,0.22)',
  paper: '#FAF6EF',
  paperMu: 'rgba(255,255,255,0.55)',
  acc: '#C5654B',
  gold: '#D29A4A',
} as const;

function BuildingGlyph() {
  return (
    <Svg viewBox="0 0 320 300" width="100%" height="100%" fill="none">
      <Rect x="60" y="30" width="200" height="240" stroke={D.borderStrong} strokeWidth="1.2" />
      <Rect x="140" y="240" width="40" height="30" fill="rgba(255,255,255,0.08)" />
      <Path d="M40 30 L160 5 L280 30" stroke={D.borderStrong} strokeWidth="1.2" />
      <Path d="M20 283 Q 160 230 300 283" stroke={D.gold} strokeWidth="1.2" strokeDasharray="2 5" />
      {([75, 115, 155, 195] as const).map((y, ri) =>
        ([80, 130, 175, 220] as const).map((x, ci) => {
          const lit = (ri + ci) % 3 !== 0;
          return (
            <Rect key={`${x}-${y}`} x={x} y={y} width="20" height="26"
              fill={lit ? D.acc : 'rgba(255,255,255,0.05)'} opacity={lit ? 0.75 : 1} />
          );
        })
      )}
    </Svg>
  );
}

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLocale();
  const isHebrew = language === 'he';
  const setDemoRole = useDemoCommerceStore((state) => state.setDemoRole);
  const setDemoMode = useDemoCommerceStore((state) => state.setDemoMode);
  const resetDemo = useDemoCommerceStore((state) => state.resetDemo);
  const googleSignIn = useGoogleSignIn();
  const pushToast = useUiStore((state) => state.pushToast);

  useEffect(() => { initDemoCommerceSync(); }, []);

  const continueAsUser = () => {
    if (!env.enableDemo) return;
    setDemoMode(true);
    setDemoRole('user');
    router.replace('/user');
  };

  const continueAsStore = () => {
    if (!env.enableDemo) return;
    setDemoMode(true);
    setDemoRole('store');
    router.replace('/store');
  };

  return (
    <ScrollView style={s.bg} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      <View style={s.header}>
        <Text style={s.wordmark}>shakana</Text>
        <View style={s.langRow}>
          <Pressable onPress={() => void setLanguage('en')} accessibilityRole="button"
            style={[s.langBtn, language === 'en' && s.langBtnActive]}>
            <Text style={[s.langBtnText, language === 'en' && s.langBtnTextActive]}>EN</Text>
          </Pressable>
          <Pressable onPress={() => void setLanguage('he')} accessibilityRole="button"
            style={[s.langBtn, language === 'he' && s.langBtnActive]}>
            <Text style={[s.langBtnText, language === 'he' && s.langBtnTextActive]}>עב</Text>
          </Pressable>
        </View>
      </View>

      <View style={s.glyphWrap}>
        <BuildingGlyph />
      </View>

      <View style={s.heroText}>
        <Text style={s.kicker}>SHAKANA · שכנה</Text>
        <Text style={s.headline}>
          {isHebrew ? 'קנייה קבוצתית\nלשכנים בבניין' : 'Group buying\nfor building neighbors'}
        </Text>
        <Text style={s.subline}>
          {isHebrew
            ? 'שתפו הזמנה עם השכנים, חלקו את דמי המשלוח, חסכו ביחד.'
            : 'Share an order with neighbors, split shipping, save together.'}
        </Text>
      </View>

      <View style={s.authCard}>
        <Pressable
          accessibilityRole="button"
          onPress={() => googleSignIn.mutate(undefined, {
            onError: (e) => pushToast(e instanceof Error ? e.message : isHebrew ? 'שגיאה בכניסה' : 'Sign-in error', 'error'),
          })}
          disabled={googleSignIn.isPending}
          style={({ pressed }) => [s.googleBtn, pressed && { opacity: 0.9 }]}
        >
          <GoogleIcon />
          <Text style={s.googleBtnText}>
            {googleSignIn.isPending ? (isHebrew ? 'פותח...' : 'Opening...') : (isHebrew ? 'המשך עם Google' : 'Continue with Google')}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/phone')}
          style={({ pressed }) => [s.phoneBtn, pressed && { opacity: 0.88 }]}>
          <Text style={s.phoneBtnText}>{isHebrew ? 'המשך עם טלפון' : 'Continue with phone'}</Text>
        </Pressable>
      </View>

      {env.enableDemo ? (
        <View style={s.demoCard}>
          <Text style={s.demoLabel}>{isHebrew ? 'כניסה לדמו' : 'DEMO ENTRY'}</Text>
          <View style={s.demoRow}>
            <Pressable accessibilityRole="button" onPress={continueAsUser}
              style={({ pressed }) => [s.demoBtn, s.demoBtnAccent, pressed && { opacity: 0.9 }]}>
              <Text style={s.demoBtnAccentText}>{isHebrew ? 'כניסה כמשתמש' : 'Enter as User'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={continueAsStore}
              style={({ pressed }) => [s.demoBtn, pressed && { opacity: 0.9 }]}>
              <Text style={s.demoBtnText}>{isHebrew ? 'כניסה כחנות' : 'Enter as Store'}</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button"
            onPress={() => { resetDemo(); router.replace('/login'); }} style={s.resetLink}>
            <Text style={s.resetText}>{isHebrew ? 'איפוס דמו' : 'Reset demo'}</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={s.terms}>
        {isHebrew
          ? 'בכניסה אתם מסכימים לתנאי השימוש ומדיניות הפרטיות.'
          : 'By continuing you agree to our Terms of Service and Privacy Policy.'}
      </Text>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: D.bg },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 56, gap: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 8,
  },
  wordmark: { fontFamily: fontFamily.display, fontSize: 24, color: D.paper, letterSpacing: 0.5 },
  langRow: {
    flexDirection: 'row', gap: 4, backgroundColor: D.surface, borderRadius: radii.pill,
    padding: 3, borderWidth: 1, borderColor: D.border,
  },
  langBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill },
  langBtnActive: { backgroundColor: colors.acc },
  langBtnText: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: D.paperMu },
  langBtnTextActive: { color: D.paper },
  glyphWrap: { height: 240, marginTop: 16, marginBottom: 8 },
  heroText: { gap: 10, marginBottom: 32 },
  kicker: { fontFamily: fontFamily.bodyBold, fontSize: 11, letterSpacing: 2.4, color: D.acc },
  headline: { fontFamily: fontFamily.display, fontSize: 38, lineHeight: 44, color: D.paper },
  subline: { fontFamily: fontFamily.body, fontSize: 15, lineHeight: 22, color: D.paperMu },
  authCard: { gap: 10, marginBottom: 16 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: D.paper, borderRadius: radii.pill, paddingVertical: 16,
    ...shadow.cta,
  },
  googleBtnText: { fontFamily: fontFamily.bodyBold, fontSize: 15, color: '#1B1612' },
  phoneBtn: {
    alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill,
    paddingVertical: 16, backgroundColor: D.surface, borderWidth: 1, borderColor: D.border,
  },
  phoneBtnText: { fontFamily: fontFamily.bodyBold, fontSize: 15, color: D.paper },
  demoCard: {
    gap: 12, backgroundColor: D.surface, borderRadius: 24, borderWidth: 1,
    borderColor: D.border, padding: 18, marginBottom: 24,
  },
  demoLabel: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2, color: D.paperMu },
  demoRow: { flexDirection: 'row', gap: 10 },
  demoBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
    borderRadius: radii.pill, borderWidth: 1, borderColor: D.border,
  },
  demoBtnAccent: { backgroundColor: colors.acc, borderColor: colors.acc },
  demoBtnText: { fontFamily: fontFamily.bodyBold, fontSize: 13, color: D.paper },
  demoBtnAccentText: { fontFamily: fontFamily.bodyBold, fontSize: 13, color: D.paper },
  resetLink: { alignItems: 'center', paddingVertical: 4 },
  resetText: { fontFamily: fontFamily.body, fontSize: 12, color: D.paperMu },
  terms: {
    fontFamily: fontFamily.body, fontSize: 11, color: D.paperMu,
    textAlign: 'center', lineHeight: 17, paddingHorizontal: 16,
  },
});
