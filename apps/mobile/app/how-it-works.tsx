import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useLocale } from '@/i18n/locale';

const STEPS_EN = [
  {
    number: '1',
    title: 'Enter your address',
    body: 'Tell us where you live. We\'ll show you active group orders in your building.',
  },
  {
    number: '2',
    title: 'Choose a store',
    body: 'Pick from Zara, Amazon, H&M and more. One order per store, per building.',
  },
  {
    number: '3',
    title: 'Add your name',
    body: 'Your neighbors see your first name when they join. Nothing else is shared.',
  },
  {
    number: '4',
    title: 'Browse & add items',
    body: 'Open the store catalog, pick what you want, and add items to the shared cart.',
  },
  {
    number: '5',
    title: 'Launch & share',
    body: 'Set a timer. Send the invite link to your stairwell. When the timer ends, the order is placed together.',
  },
];

const STEPS_HE = [
  {
    number: '1',
    title: 'הכנס את הכתובת שלך',
    body: 'ספר לנו איפה אתה גר. נציג לך הזמנות קבוצתיות פעילות בבניין שלך.',
  },
  {
    number: '2',
    title: 'בחר חנות',
    body: 'בחר מזארה, אמזון, H&M ועוד. הזמנה אחת לחנות, לבניין.',
  },
  {
    number: '3',
    title: 'הוסף את שמך',
    body: 'השכנים שלך רואים את שמך הפרטי כשהם מצטרפים. שום דבר אחר לא משותף.',
  },
  {
    number: '4',
    title: 'גלוש והוסף פריטים',
    body: 'פתח את קטלוג החנות, בחר מה שתרצה, והוסף פריטים לסל המשותף.',
  },
  {
    number: '5',
    title: 'השק ושתף',
    body: 'הגדר טיימר. שלח את קישור ההצטרפות לשכניך. כשהטיימר מסתיים — ההזמנה מתבצעת יחד.',
  },
];

const WHY_EN = [
  { icon: 'ship', title: 'Split shipping', body: 'Everyone shares the delivery cost equally — often just ₪5–15 each.' },
  { icon: 'shield', title: 'Safe payments', body: 'Money is held in escrow and released only when all items are confirmed received.' },
  { icon: 'users', title: 'Real neighbors', body: 'Only verified residents of your building can join your group order.' },
];

const WHY_HE = [
  { icon: 'ship', title: 'פיצול משלוח', body: 'כולם חולקים את עלות המשלוח שווה בשווה — לרוב רק ₪5–15 לאחד.' },
  { icon: 'shield', title: 'תשלומים בטוחים', body: 'הכסף מוחזק בנאמנות ומשוחרר רק כשכל הפריטים אושרו כהתקבלו.' },
  { icon: 'users', title: 'שכנים אמיתיים', body: 'רק דיירים מאומתים בבניין שלך יכולים להצטרף להזמנה הקבוצתית שלך.' },
];

function ShipIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.acc} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 17h18M5 17l1-7h12l1 7M9 17V9M15 17V9M12 3v6" />
    </Svg>
  );
}

function ShieldIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.acc} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2L3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6l-9-4z" />
      <Path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

function UsersIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.acc} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <Circle cx={9} cy={7} r={4} />
      <Path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </Svg>
  );
}

function StepDot({ number, active }: { number: string; active?: boolean }) {
  return (
    <View style={[styles.stepDot, active && styles.stepDotActive]}>
      <Text style={[styles.stepDotText, active && styles.stepDotTextActive]}>{number}</Text>
    </View>
  );
}

const ONBOARDING_KEY = 'shakana_seen_onboarding';

export default function HowItWorksScreen() {
  const router = useRouter();
  const { language } = useLocale();
  const isHe = language === 'he';

  function goToLogin() {
    AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {});
    router.replace('/(auth)/welcome');
  }

  const steps = isHe ? STEPS_HE : STEPS_EN;
  const why = isHe ? WHY_HE : WHY_EN;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Skip — go straight to login */}
      <Pressable onPress={goToLogin} style={styles.back} accessibilityRole="button">
        <Text style={styles.backText}>{isHe ? 'דלג ›' : 'Skip ›'}</Text>
      </Pressable>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.kicker}>SHAKANA</Text>
        <Text style={styles.heroTitle}>{isHe ? 'איך זה עובד' : 'How it works'}</Text>
        <Text style={styles.heroSub}>{isHe
          ? 'הזמנה קבוצתית בבניין שלך — פשוטה, חסכונית ובטוחה.'
          : 'Group ordering in your building — simple, affordable and safe.'}</Text>
      </View>

      {/* Steps */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{isHe ? 'שלבים' : 'THE STEPS'}</Text>
        <View style={styles.stepsCard}>
          {steps.map((step, i) => (
            <View key={step.number}>
              <View style={styles.stepRow}>
                <View style={styles.stepLeft}>
                  <StepDot number={step.number} active={i === 0} />
                  {i < steps.length - 1 && <View style={styles.stepLine} />}
                </View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepBodyText}>{step.body}</Text>
                  {i < steps.length - 1 && <View style={{ height: 20 }} />}
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Why Shakana */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{isHe ? 'למה שכנה' : 'WHY SHAKANA'}</Text>
        <View style={styles.whyGrid}>
          {why.map((item) => (
            <View key={item.icon} style={styles.whyCard}>
              <View style={styles.whyIcon}>
                {item.icon === 'ship' && <ShipIcon />}
                {item.icon === 'shield' && <ShieldIcon />}
                {item.icon === 'users' && <UsersIcon />}
              </View>
              <Text style={styles.whyTitle}>{item.title}</Text>
              <Text style={styles.whyBody}>{item.body}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA */}
      <Pressable onPress={goToLogin} style={styles.ctaBtn} accessibilityRole="button">
        <Text style={styles.ctaBtnText}>{isHe ? 'בואו נתחיל' : "Let's get started"}</Text>
      </Pressable>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  back: { marginBottom: 8, alignSelf: 'flex-start' },
  backText: { fontFamily: fontFamily.bodyBold, fontSize: 15, color: colors.mu },

  hero: { gap: 8, marginBottom: 28 },
  kicker: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2.4, color: colors.acc, textTransform: 'uppercase' },
  heroTitle: { fontFamily: fontFamily.display, fontSize: 36, color: colors.tx, lineHeight: 40 },
  heroSub: { fontFamily: fontFamily.body, fontSize: 15, color: colors.mu, lineHeight: 23 },

  section: { gap: 12, marginBottom: 28 },
  sectionLabel: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2, color: colors.mu, textTransform: 'uppercase' },

  // Steps
  stepsCard: { backgroundColor: colors.s1, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.br, padding: 20, ...shadow.card },
  stepRow: { flexDirection: 'row', gap: 14 },
  stepLeft: { alignItems: 'center', width: 32 },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.s2, borderWidth: 1.5, borderColor: colors.br, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: colors.acc, borderColor: colors.acc },
  stepDotText: { fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.mu },
  stepDotTextActive: { color: colors.s1 },
  stepLine: { flex: 1, width: 1.5, backgroundColor: colors.br, marginTop: 4 },
  stepBody: { flex: 1, paddingTop: 4 },
  stepTitle: { fontFamily: fontFamily.bodyBold, fontSize: 15, color: colors.tx, marginBottom: 4 },
  stepBodyText: { fontFamily: fontFamily.body, fontSize: 13, color: colors.mu, lineHeight: 20 },

  // Why
  whyGrid: { gap: 12 },
  whyCard: { backgroundColor: colors.s1, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.br, padding: 18, gap: 8, ...shadow.card },
  whyIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accLight, alignItems: 'center', justifyContent: 'center' },
  whyTitle: { fontFamily: fontFamily.bodyBold, fontSize: 15, color: colors.tx },
  whyBody: { fontFamily: fontFamily.body, fontSize: 13, color: colors.mu, lineHeight: 20 },

  // CTA
  ctaBtn: { backgroundColor: colors.acc, borderRadius: radii.pill, minHeight: 54, alignItems: 'center', justifyContent: 'center', ...shadow.cta },
  ctaBtnText: { fontFamily: fontFamily.bodyBold, fontSize: 16, color: colors.s1 },
});
