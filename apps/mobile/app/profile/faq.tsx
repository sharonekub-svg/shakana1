import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useLocale } from '@/i18n/locale';

const FAQ_HE = [
  {
    q: 'מתי הכסף יורד מהחשבון?',
    a: 'הכסף מוחזק בנאמנות (escrow) ברגע שאתה מצטרף להזמנה. הוא עובר לחנות רק לאחר שכל המשתתפים אישרו קבלת המוצר.',
  },
  {
    q: 'מה אם המוצר לא הגיע?',
    a: 'אל תאשר קבלה לפני שקיבלת את המוצר בפועל. אם לא הגיע — פנה אלינו דרך כפתור "דיווח על בעיה" ונטפל מולך ומול החנות.',
  },
  {
    q: 'איך מבטלים הזמנה?',
    a: 'מי שיצר את ההזמנה (המארגן) יכול לבטל אותה בתוך 14 יום מיום ההזמנה — על פי חוק הגנת הצרכן. לחץ על "בקש ביטול" בתוך מסך ה-escrow.',
  },
  {
    q: 'מי מחלק את החבילות לשכנים?',
    a: 'החבילה מגיעה לכתובת המארגן. המארגן מחלק לשכנים — לכן תמיד מומלץ להכיר את השכנים לפני שפותחים קבוצה. המארגן מקבל בונוס קטן בשביל זה.',
  },
  {
    q: 'מה אם הקבוצה לא הגיעה למינימום?',
    a: 'אם הטיימר נגמר לפני שמספיק שכנים הצטרפו — ההזמנה מבוטלת אוטומטית וכולם מקבלים החזר מלא.',
  },
  {
    q: 'האם הנתונים שלי מאובטחים?',
    a: 'כן. אנחנו משתמשים ב-Stripe לכל התשלומים — אנחנו לא שומרים פרטי כרטיס אשראי. הנתונים מוצפנים ומאובטחים.',
  },
  {
    q: 'איך יוצרים קשר עם התמיכה?',
    a: 'לחץ על "רוצה לדווח על בעיה?" בתפריט הפרופיל — נקרא ונחזור אליך תוך 24 שעות.',
  },
];

const FAQ_EN = [
  {
    q: 'When does money leave my account?',
    a: 'Your payment is held in escrow the moment you join an order. It transfers to the store only after all participants confirm delivery.',
  },
  {
    q: "What if my item doesn't arrive?",
    a: "Don't confirm delivery until you physically receive your item. If it's missing, tap \"Report a bug\" and we'll handle it with the store.",
  },
  {
    q: 'How do I cancel an order?',
    a: 'The order creator can cancel within 14 days of the order date under Israeli Consumer Protection Law. Tap "Request refund" inside the escrow screen.',
  },
  {
    q: 'Who distributes the packages to neighbors?',
    a: "The package arrives to the creator's address. The creator distributes to neighbors — which is why we recommend knowing your neighbors before starting a group. The creator gets a small bonus for this.",
  },
  {
    q: "What if the group doesn't reach the minimum?",
    a: "If the timer runs out before enough neighbors join, the order is automatically cancelled and everyone gets a full refund.",
  },
  {
    q: 'Is my data secure?',
    a: "Yes. We use Stripe for all payments — we never store card details. Everything is encrypted and secure.",
  },
  {
    q: 'How do I contact support?',
    a: 'Tap "Wanna report a bug?" in the Profile menu — we read everything and reply within 24 hours.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen((v) => !v)} style={styles.item}>
      <View style={styles.itemHeader}>
        <Text style={styles.question}>{q}</Text>
        <Text style={styles.chevron}>{open ? '−' : '+'}</Text>
      </View>
      {open ? <Text style={styles.answer}>{a}</Text> : null}
    </Pressable>
  );
}

export default function FAQScreen() {
  const router = useRouter();
  const { language } = useLocale();
  const isHebrew = language === 'he';
  const items = isHebrew ? FAQ_HE : FAQ_EN;

  return (
    <ScreenBase style={styles.screen}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>SHAKANA</Text>
          <Text style={styles.title}>
            {isHebrew ? 'שאלות נפוצות' : 'FAQ'}
          </Text>
          <Text style={styles.subtitle}>
            {isHebrew
              ? 'כל מה שרצית לדעת ולא העזת לשאול.'
              : 'Everything you wanted to know.'}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {items.map((item, i) => (
          <FAQItem key={i} q={item.q} a={item.a} />
        ))}
      </ScrollView>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 20, paddingBottom: 36, gap: 22 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  kicker: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2.4, color: colors.acc, marginBottom: 6 },
  title: { fontFamily: fontFamily.display, fontSize: 28, color: colors.tx, lineHeight: 34 },
  subtitle: { marginTop: 8, fontFamily: fontFamily.body, fontSize: 14, lineHeight: 21, color: colors.mu },
  list: { gap: 10, paddingBottom: 20 },
  item: {
    borderWidth: 1,
    borderColor: colors.br,
    borderRadius: radii.xl,
    backgroundColor: colors.s1,
    padding: 16,
    ...shadow.card,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  question: {
    flex: 1,
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: colors.tx,
    lineHeight: 22,
  },
  chevron: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 20,
    color: colors.acc,
    lineHeight: 24,
  },
  answer: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.mu,
    lineHeight: 22,
  },
});
