import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { BackBtn } from '@/components/primitives/BackBtn';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useLocale } from '@/i18n/locale';

const STEPS_EN = [
  {
    number: '1',
    title: 'Find a product, or join a neighbour',
    body: 'Share a link from Amazon, Zara, AliExpress or any store — or open an order someone in your building already started.',
  },
  {
    number: '2',
    title: 'Invite the building',
    body: 'Send the join link on WhatsApp. Set a timer (6–72h). Only verified residents of your building can join.',
  },
  {
    number: '3',
    title: 'Pay into escrow',
    body: 'Each neighbour pays their share. Money is held by Stripe — not by Shakana, not by the organiser.',
  },
  {
    number: '4',
    title: 'Order ships together',
    body: 'When the timer ends, the order is placed as one. Shipping cost is split, often saving ₪20–60 per person.',
  },
  {
    number: '5',
    title: 'Confirm receipt → escrow released',
    body: 'When everyone confirms their item arrived, the seller is paid. If something goes wrong, you get a refund.',
  },
];

const STEPS_HE = [
  {
    number: '1',
    title: 'מצא מוצר או הצטרף לשכן',
    body: 'שתף קישור מאמזון, זארה, AliExpress או כל חנות — או הצטרף להזמנה שכבר נפתחה בבניין שלך.',
  },
  {
    number: '2',
    title: 'הזמן את הבניין',
    body: 'שלח קישור הצטרפות בוואטסאפ. הגדר טיימר (6–72 שעות). רק דיירים מאומתים בבניין שלך יכולים להצטרף.',
  },
  {
    number: '3',
    title: 'שלם לנאמנות',
    body: 'כל שכן משלם את חלקו. הכסף מוחזק על ידי Stripe — לא על ידי שכנה ולא על ידי מארגן ההזמנה.',
  },
  {
    number: '4',
    title: 'ההזמנה נשלחת יחד',
    body: 'כשהטיימר מסתיים — ההזמנה מבוצעת כאחת. עלות המשלוח מתחלקת, חיסכון ממוצע של ₪20–60 לאדם.',
  },
  {
    number: '5',
    title: 'אישור קבלה → שחרור הנאמנות',
    body: 'כשכולם מאשרים שהמוצר הגיע — המוכר מקבל את הכסף. אם משהו השתבש, אתה מקבל החזר מלא.',
  },
];

const WHY_EN = [
  { icon: 'ship', title: 'Split shipping', body: 'Six neighbours, one delivery. Shipping divides — often ₪5–15 per person instead of ₪50.' },
  { icon: 'shield', title: 'Escrow-protected', body: 'Stripe holds the money until every neighbour confirms delivery. No item, no payment.' },
  { icon: 'users', title: 'Building-verified', body: 'Only residents of your actual building can join. We verify the address before you see the order.' },
  { icon: 'leaf', title: 'One truck, not six', body: 'A single delivery to the lobby instead of six separate runs. Less packaging, less traffic, lower footprint.' },
];

const WHY_HE = [
  { icon: 'ship', title: 'משלוח משותף', body: 'שישה שכנים, משלוח אחד. העלות מתחלקת — לרוב ₪5–15 לאדם במקום ₪50.' },
  { icon: 'shield', title: 'מוגן בנאמנות', body: 'Stripe מחזיק בכסף עד שכל שכן מאשר קבלה. בלי מוצר — אין תשלום.' },
  { icon: 'users', title: 'מאומת לפי בניין', body: 'רק דיירים אמיתיים של הבניין שלך יכולים להצטרף. הכתובת מאומתת לפני שאתה רואה את ההזמנה.' },
  { icon: 'leaf', title: 'משאית אחת, לא שש', body: 'משלוח אחד ללובי במקום שישה. פחות אריזות, פחות פקקים, פחות זיהום.' },
];

const FAQ_EN = [
  { q: 'What if I don\'t know my neighbours?', a: 'Most don\'t. Drop a flyer in the lobby or post the WhatsApp link in your building group.' },
  { q: 'What if my item doesn\'t arrive?', a: 'You open a dispute in the app. The escrow refunds you — the seller has not been paid yet.' },
  { q: 'What does Shakana charge?', a: 'A small platform fee (3%) is added on top. Free shipping savings always exceed it.' },
];

const FAQ_HE = [
  { q: 'מה אם אני לא מכיר את השכנים שלי?', a: 'רוב המשתמשים לא. תלה פתק בלובי או שלח את קישור הוואטסאפ בקבוצת הבניין.' },
  { q: 'מה אם המוצר שלי לא מגיע?', a: 'פותח דיווח באפליקציה. הנאמנות מחזירה לך את הכסף — המוכר עדיין לא קיבל תשלום.' },
  { q: 'כמה שכנה גובה?', a: 'עמלת פלטפורמה קטנה (3%) מתווספת לעלות. החיסכון במשלוח תמיד גדול ממנה.' },
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

function LeafIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.acc} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M11 20A7 7 0 014 13c0-2 1-4 3-6 3-3 9-4 14-4-1 6-2 11-5 14-2 2-4 3-5 3z" />
      <Path d="M2 22c5-5 9-7 14-7" />
    </Svg>
  );
}

function HeroIllustration() {
  return (
    <Svg width="100%" height={140} viewBox="0 0 320 140" fill="none">
      <Rect x="60" y="22" width="200" height="98" rx="12" fill={colors.s2} stroke={colors.br} strokeWidth={1.5} />
      <Rect x="78" y="42" width="48" height="64" rx="4" fill={colors.s1} stroke={colors.br} strokeWidth={1.2} />
      <Rect x="136" y="42" width="48" height="64" rx="4" fill={colors.s1} stroke={colors.br} strokeWidth={1.2} />
      <Rect x="194" y="42" width="48" height="64" rx="4" fill={colors.s1} stroke={colors.br} strokeWidth={1.2} />
      <Circle cx={102} cy={62} r={6} fill={colors.acc} />
      <Circle cx={160} cy={62} r={6} fill={colors.acc} />
      <Circle cx={218} cy={62} r={6} fill={colors.acc} />
      <Path d="M40 120h240" stroke={colors.br} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M150 120l8-12h4l8 12" stroke={colors.acc} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill={colors.accLight} />
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

export default function HowItWorksScreen() {
  const router = useRouter();
  const { language } = useLocale();
  const isHe = language === 'he';

  function goToLogin() {
    router.replace('/(auth)/welcome');
  }

  const steps = isHe ? STEPS_HE : STEPS_EN;
  const why = isHe ? WHY_HE : WHY_EN;
  const faq = isHe ? FAQ_HE : FAQ_EN;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <BackBtn fallback="/(auth)/welcome" />
        <Pressable onPress={goToLogin} hitSlop={10} accessibilityRole="button">
          <Text style={styles.skipText}>{isHe ? 'דלג ›' : 'Skip ›'}</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.kicker}>SHAKANA</Text>
        <Text style={styles.heroTitle}>{isHe ? 'איך זה עובד' : 'How it works'}</Text>
        <Text style={styles.heroSub}>{isHe
          ? 'הזמנה קבוצתית מכל חנות באינטרנט — עם השכנים שלך, במשלוח אחד, בכסף שמור בנאמנות.'
          : 'Group ordering from any online store — with your neighbours, one shipment, money held safely in escrow.'}</Text>
        <View style={styles.heroArt}>
          <HeroIllustration />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{isHe ? 'חמשת השלבים' : 'THE FIVE STEPS'}</Text>
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

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{isHe ? 'למה שכנה' : 'WHY SHAKANA'}</Text>
        <View style={styles.whyGrid}>
          {why.map((item) => (
            <View key={item.icon} style={styles.whyCard}>
              <View style={styles.whyIcon}>
                {item.icon === 'ship' && <ShipIcon />}
                {item.icon === 'shield' && <ShieldIcon />}
                {item.icon === 'users' && <UsersIcon />}
                {item.icon === 'leaf' && <LeafIcon />}
              </View>
              <Text style={styles.whyTitle}>{item.title}</Text>
              <Text style={styles.whyBody}>{item.body}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{isHe ? 'שאלות נפוצות' : 'COMMON QUESTIONS'}</Text>
        <View style={styles.faqList}>
          {faq.map((item) => (
            <View key={item.q} style={styles.faqCard}>
              <Text style={styles.faqQ}>{item.q}</Text>
              <Text style={styles.faqA}>{item.a}</Text>
            </View>
          ))}
        </View>
      </View>

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

  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  skipText: { fontFamily: fontFamily.bodyBold, fontSize: 15, color: colors.mu },

  hero: { gap: 8, marginBottom: 28 },
  kicker: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2.4, color: colors.acc, textTransform: 'uppercase' },
  heroTitle: { fontFamily: fontFamily.display, fontSize: 36, color: colors.tx, lineHeight: 40 },
  heroSub: { fontFamily: fontFamily.body, fontSize: 15, color: colors.mu, lineHeight: 23 },
  heroArt: { marginTop: 12, borderRadius: radii.xl, overflow: 'hidden' },

  section: { gap: 12, marginBottom: 28 },
  sectionLabel: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2, color: colors.mu, textTransform: 'uppercase' },

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

  whyGrid: { gap: 12 },
  whyCard: { backgroundColor: colors.s1, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.br, padding: 18, gap: 8, ...shadow.card },
  whyIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accLight, alignItems: 'center', justifyContent: 'center' },
  whyTitle: { fontFamily: fontFamily.bodyBold, fontSize: 15, color: colors.tx },
  whyBody: { fontFamily: fontFamily.body, fontSize: 13, color: colors.mu, lineHeight: 20 },

  faqList: { gap: 10 },
  faqCard: { backgroundColor: colors.s1, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.br, padding: 16, gap: 6 },
  faqQ: { fontFamily: fontFamily.bodyBold, fontSize: 14, color: colors.tx },
  faqA: { fontFamily: fontFamily.body, fontSize: 13, color: colors.mu, lineHeight: 20 },

  ctaBtn: { backgroundColor: colors.acc, borderRadius: radii.pill, minHeight: 54, alignItems: 'center', justifyContent: 'center', ...shadow.cta },
  ctaBtnText: { fontFamily: fontFamily.bodyBold, fontSize: 16, color: colors.s1 },
});
