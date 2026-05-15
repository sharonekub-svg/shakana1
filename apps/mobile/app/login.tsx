import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { useGoogleSignIn } from '@/api/auth';
import { initDemoCommerceSync, useDemoCommerceStore } from '@/stores/demoCommerceStore';
import { useUiStore } from '@/stores/uiStore';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useLocale } from '@/i18n/locale';
import { consumePendingInvite } from '@/lib/deeplinks';
import { env } from '@/lib/env';

const D = {
  bg:      '#FFFFFF',
  surface: '#FFFFFF',
  border:  '#E8E8E8',
  paper:   '#000000',
  paperMu: '#767676',
  acc:     '#000000',
  hot:     '#FF2D55',
  hotSoft: '#FFF0F3',
  ink:     '#000000',
} as const;

function ShakanaLogoFull({ size = 36 }: { size?: number }) {
  const c = size / 2;
  const r = size / 2;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Svg width={size} height={size} viewBox="0 0 36 36">
        <Circle cx={c} cy={c} r={r - 1} fill="none" stroke={D.hot} strokeWidth={1.5} />
        <Circle cx={c} cy={c} r={r * 0.72} fill="none" stroke={D.hot} strokeWidth={1.5} />
        <Circle cx={c} cy={c} r={r * 0.44} fill="none" stroke={D.hot} strokeWidth={1.5} />
        <Circle cx={c} cy={c} r={r * 0.16} fill={D.hot} />
      </Svg>
      <Text style={{ fontFamily: fontFamily.display, fontSize: size * 0.72, color: D.paper, lineHeight: size * 0.86, letterSpacing: -0.3 }}>
        shakana
      </Text>
    </View>
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

  const continueAsUser = async () => {
    if (!env.enableDemo) return;
    setDemoMode(true); setDemoRole('user');
    const pendingInvite = await consumePendingInvite();
    if (pendingInvite) {
      router.replace(`/user?join=${encodeURIComponent(pendingInvite)}` as any);
    } else {
      router.replace('/user');
    }
  };
  const continueAsStore = () => {
    if (!env.enableDemo) return;
    setDemoMode(true); setDemoRole('store'); router.replace('/store');
  };

  return (
    <ScrollView style={s.bg} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* Top bar */}
      <View style={s.topBar}>
        <ShakanaLogoFull size={32} />
        <View style={s.langPill}>
          <Pressable onPress={() => void setLanguage('en')} accessibilityRole="button"
            style={[s.langBtn, language === 'en' && s.langBtnOn]}>
            <Text style={[s.langBtnTx, language === 'en' && s.langBtnTxOn]}>EN</Text>
          </Pressable>
          <Pressable onPress={() => void setLanguage('he')} accessibilityRole="button"
            style={[s.langBtn, language === 'he' && s.langBtnOn]}>
            <Text style={[s.langBtnTx, language === 'he' && s.langBtnTxOn]}>עב</Text>
          </Pressable>
        </View>
      </View>

      {/* Hero */}
      <View style={s.hero}>
        <Text style={s.heroKicker}>שכנה · neighbors</Text>
        <Text style={s.heroHeadline}>
          {isHebrew ? 'למה לשלם ₪45\nמשלוח לבד?' : 'Why pay ₪45\nshipping alone?'}
        </Text>
        <Text style={s.heroSub}>
          {isHebrew
            ? 'פתח הזמנה קבוצתית, הזמן שכנים, וחלקו את המשלוח — כולם חוסכים.'
            : 'Start a group order, invite your neighbors, split the shipping — everyone saves.'}
        </Text>
      </View>

      {/* Dark savings card */}
      <View style={s.savingsCard}>
        <View style={s.savingsLeft}>
          <Text style={s.savingsAmount}>₪30+</Text>
          <Text style={s.savingsLabel}>{isHebrew ? 'חסכון ממוצע להזמנה' : 'avg. saved per order'}</Text>
        </View>
        <View style={s.savingsDivider} />
        <View style={s.savingsRight}>
          <Text style={s.savingsSocial}>{isHebrew ? 'שכנים כבר חוסכים ביחד' : 'Neighbors saving together'}</Text>
          <Text style={s.savingsSocialSub}>{isHebrew ? 'זרא · H&M · איקאה · Amazon' : 'Zara · H&M · IKEA · Amazon'}</Text>
        </View>
      </View>

      {/* Bento grid */}
      <View style={s.bento}>
        <View style={[s.bentoCard, s.bentoWide]}>
          <Text style={s.bentoEmoji}>₪</Text>
          <Text style={s.bentoTitle}>{isHebrew ? 'חוסכים ₪20–60 להזמנה' : 'Save ₪20–60 per order'}</Text>
          <Text style={s.bentoBody}>{isHebrew ? '4 שכנים = משלוח אחד. כל אחד משלם רבע.' : '4 neighbors, one shipment. Each pays a quarter.'}</Text>
        </View>
        <View style={s.bentoCard}>
          <Text style={s.bentoEmoji}>15"</Text>
          <Text style={s.bentoTitle}>{isHebrew ? '15 שניות לשיתוף' : '15 sec to invite'}</Text>
          <Text style={s.bentoBody}>{isHebrew ? 'קישור ישיר לוואטסאפ.' : 'One WhatsApp link.'}</Text>
        </View>
        <View style={s.bentoCard}>
          <Text style={s.bentoEmoji}>§</Text>
          <Text style={s.bentoTitle}>{isHebrew ? 'כסף בנאמנות' : 'Escrow protected'}</Text>
          <Text style={s.bentoBody}>{isHebrew ? 'Stripe מחזיק עד לאישור קבלה.' : 'Stripe holds until delivery confirmed.'}</Text>
        </View>
      </View>

      {/* Story video — web only */}
      {Platform.OS === 'web' ? (
        <View style={s.storyWrap}>
          <View style={s.storyHeader}>
            <Text style={s.storyKicker}>{isHebrew ? 'איך זה עובד' : 'HOW IT WORKS'}</Text>
            <Text style={s.storyTitle}>{isHebrew ? 'ראו את הזרימה בפעולה' : 'See the flow in action'}</Text>
          </View>
          {/* @ts-ignore – iframe is valid on web */}
          <iframe
            src="/shakana-story.html"
            title="Shakana story"
            style={{
              width: '100%',
              height: 420,
              border: 'none',
              borderRadius: 20,
              display: 'block',
            } as any}
          />
        </View>
      ) : null}

      {/* Auth */}
      <View style={s.authGroup}>
        <Pressable
          accessibilityRole="button"
          onPress={() => googleSignIn.mutate(undefined, {
            onError: (e) => pushToast(e instanceof Error ? e.message : isHebrew ? 'שגיאה בכניסה' : 'Sign-in error', 'error'),
          })}
          disabled={googleSignIn.isPending}
          style={({ pressed }) => [s.googleBtn, pressed && { opacity: 0.9 }]}
        >
          <GoogleIcon />
          <Text style={s.googleBtnTx}>
            {googleSignIn.isPending ? (isHebrew ? 'פותח...' : 'Opening...') : (isHebrew ? 'המשך עם Google' : 'Continue with Google')}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/phone')}
          style={({ pressed }) => [s.phoneBtn, pressed && { opacity: 0.88 }]}>
          <Text style={s.phoneBtnTx}>{isHebrew ? 'המשך עם טלפון' : 'Continue with phone'}</Text>
        </Pressable>
      </View>

      {env.enableDemo ? (
        <View style={s.demoCard}>
          <Text style={s.demoLabel}>{isHebrew ? 'כניסה לדמו' : 'DEMO ENTRY'}</Text>
          <View style={s.demoRow}>
            <Pressable accessibilityRole="button" onPress={continueAsUser}
              style={({ pressed }) => [s.demoBtn, s.demoBtnAccent, pressed && { opacity: 0.9 }]}>
              <Text style={s.demoBtnAccentTx}>{isHebrew ? 'כניסה כמשתמש' : 'Enter as User'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={continueAsStore}
              style={({ pressed }) => [s.demoBtn, pressed && { opacity: 0.9 }]}>
              <Text style={s.demoBtnTx}>{isHebrew ? 'כניסה כחנות' : 'Enter as Store'}</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button"
            onPress={() => { resetDemo(); router.replace('/login'); }} style={s.resetLink}>
            <Text style={s.resetTx}>{isHebrew ? 'איפוס דמו' : 'Reset demo'}</Text>
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
  bg:      { flex: 1, backgroundColor: D.bg },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 56, gap: 22, maxWidth: 920, width: '100%', alignSelf: 'center' },

  topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 52, paddingBottom: 4 },
  langPill:    { flexDirection: 'row', gap: 2, backgroundColor: D.surface, borderRadius: radii.pill, padding: 3, borderWidth: 1, borderColor: D.border, ...shadow.glass },
  langBtn:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill },
  langBtnOn:   { backgroundColor: D.ink },
  langBtnTx:   { fontFamily: fontFamily.bodyBold, fontSize: 12, color: D.paperMu },
  langBtnTxOn: { color: '#FFFFFF' },

  hero:         { gap: 10 },
  heroKicker:   { fontFamily: fontFamily.bodyBold, fontSize: 11, letterSpacing: 2.4, color: D.hot },
  heroHeadline: { fontFamily: fontFamily.display, fontSize: 40, lineHeight: 46, color: D.paper },
  heroSub:      { fontFamily: fontFamily.body, fontSize: 15, lineHeight: 22, color: D.paperMu },

  savingsCard:      { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: D.ink, borderRadius: 24, padding: 20, ...shadow.cta },
  savingsLeft:      { gap: 4 },
  savingsAmount:    { fontFamily: fontFamily.display, fontSize: 42, lineHeight: 44, color: D.hot, letterSpacing: -1 },
  savingsLabel:     { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 1.4, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' },
  savingsDivider:   { width: 1, height: 48, backgroundColor: 'rgba(255,255,255,0.15)' },
  savingsRight:     { flex: 1, gap: 5 },
  savingsSocial:    { fontFamily: fontFamily.bodyBold, fontSize: 13, color: '#FFFFFF', lineHeight: 18 },
  savingsSocialSub: { fontFamily: fontFamily.body, fontSize: 12, color: 'rgba(255,255,255,0.55)' },

  bento:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bentoCard: { flexGrow: 1, flexBasis: 180, minHeight: 128, gap: 8, padding: 16, borderRadius: 24, backgroundColor: D.surface, borderWidth: 1, borderColor: D.border, ...shadow.card },
  bentoWide: { flexBasis: 300, backgroundColor: D.hotSoft, borderColor: '#FFCCD6' },
  bentoEmoji:{ fontSize: 22, lineHeight: 28 },
  bentoTitle:{ fontFamily: fontFamily.bodyBold, fontSize: 15, color: D.paper },
  bentoBody: { fontFamily: fontFamily.body, fontSize: 13, lineHeight: 19, color: D.paperMu },

  storyWrap:   { gap: 14, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: D.border },
  storyHeader: { gap: 4, paddingHorizontal: 20, paddingTop: 18 },
  storyKicker: { fontFamily: fontFamily.bodyBold, fontSize: 11, letterSpacing: 2.2, color: D.hot },
  storyTitle:  { fontFamily: fontFamily.display, fontSize: 22, lineHeight: 26, color: D.paper },

  authGroup:     { gap: 10 },
  googleBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: D.acc, borderRadius: radii.pill, paddingVertical: 17, ...shadow.cta },
  googleBtnTx:   { fontFamily: fontFamily.bodyBold, fontSize: 15, color: '#FFFFFF' },
  phoneBtn:      { alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, paddingVertical: 17, backgroundColor: D.surface, borderWidth: 1, borderColor: D.border },
  phoneBtnTx:    { fontFamily: fontFamily.bodyBold, fontSize: 15, color: D.paper },

  demoCard:        { gap: 12, backgroundColor: D.surface, borderRadius: 24, borderWidth: 1, borderColor: D.border, padding: 18 },
  demoLabel:       { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2, color: D.paperMu },
  demoRow:         { flexDirection: 'row', gap: 10 },
  demoBtn:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: radii.pill, borderWidth: 1, borderColor: D.border },
  demoBtnAccent:   { backgroundColor: D.acc, borderColor: D.acc },
  demoBtnTx:       { fontFamily: fontFamily.bodyBold, fontSize: 13, color: D.paper },
  demoBtnAccentTx: { fontFamily: fontFamily.bodyBold, fontSize: 13, color: '#FFFFFF' },
  resetLink:       { alignItems: 'center', paddingVertical: 4 },
  resetTx:         { fontFamily: fontFamily.body, fontSize: 12, color: D.paperMu },

  terms: { fontFamily: fontFamily.body, fontSize: 11, color: D.paperMu, textAlign: 'center', lineHeight: 17, paddingHorizontal: 16 },
});
