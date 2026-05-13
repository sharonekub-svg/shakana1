import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { PrimaryBtn, SecondaryBtn } from '@/components/primitives/Button';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useOrder } from '@/api/orders';
import { formatAgorot } from '@/utils/format';
import { useLocale } from '@/i18n/locale';

export default function OrderCreated() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { language } = useLocale();
  const isHebrew = language === 'he';
  const { data } = useOrder(id);

  const order = data?.order;
  const participantCount = Math.max(1, data?.participants.length ?? 1);
  const deliveryFeeAgorot = order?.estimated_shipping_agorot ?? 0;
  const maxParticipants = order?.max_participants ?? 12;
  const savingsPerPerson = deliveryFeeAgorot > 0
    ? Math.floor(deliveryFeeAgorot * (1 - 1 / maxParticipants))
    : 0;
  const perPersonNow = Math.ceil(deliveryFeeAgorot / participantCount);

  const copy = isHebrew
    ? {
        eyebrow: 'ההזמנה נפתחה',
        title: 'כל הכבוד, פתחת הזמנה!',
        subtitle: 'שלח את הקישור לשכנים ותחסכו ביחד על המשלוח.',
        savingsTitle: 'החיסכון הפוטנציאלי',
        savingsBody: 'כך נחלק דמי המשלוח כשהקבוצה תהיה מלאה.',
        perPersonNow: 'משלוח כרגע לאדם',
        perPersonFull: 'משלוח כשהקבוצה מלאה',
        productLabel: 'המוצר',
        storeLabel: 'חנות',
        goToOrder: 'צפה בהזמנה',
        shareAgain: 'שתף קישור שוב',
        goHome: 'חזרה לבית',
      }
    : {
        eyebrow: 'Order opened',
        title: 'You made it!',
        subtitle: 'Send the link to your neighbors and save on shipping together.',
        savingsTitle: 'Potential savings',
        savingsBody: 'Here\'s how delivery splits when the group is full.',
        perPersonNow: 'Shipping per person now',
        perPersonFull: 'Shipping when full group',
        productLabel: 'Product',
        storeLabel: 'Store',
        goToOrder: 'View my order',
        shareAgain: 'Share invite again',
        goHome: 'Back to home',
      };

  return (
    <ScreenBase style={styles.screen}>
      <View style={styles.celebCard}>
        <View style={styles.checkMark}>
          <Text style={styles.checkText}>✓</Text>
        </View>
        <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
      </View>

      {order ? (
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{copy.productLabel}</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{order.product_title}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{copy.storeLabel}</Text>
            <Text style={styles.detailValue}>{order.store_label}</Text>
          </View>
        </View>
      ) : null}

      {deliveryFeeAgorot > 0 ? (
        <View style={styles.savingsCard}>
          <Text style={styles.savingsEyebrow}>{copy.savingsTitle}</Text>
          <Text style={styles.savingsNote}>{copy.savingsBody}</Text>
          <View style={styles.savingsGrid}>
            <View style={styles.savingsItem}>
              <Text style={styles.savingsNum}>{formatAgorot(perPersonNow)}</Text>
              <Text style={styles.savingsItemLabel}>{copy.perPersonNow}</Text>
            </View>
            <View style={styles.savingsDivider} />
            <View style={styles.savingsItem}>
              <Text style={[styles.savingsNum, styles.savingsNumGreen]}>{formatAgorot(Math.ceil(deliveryFeeAgorot / maxParticipants))}</Text>
              <Text style={styles.savingsItemLabel}>{copy.perPersonFull}</Text>
            </View>
          </View>
          {savingsPerPerson > 0 ? (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsBadgeText}>
                {isHebrew ? `חסכון של עד ${formatAgorot(savingsPerPerson)} לאדם` : `Save up to ${formatAgorot(savingsPerPerson)} per person`}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        <PrimaryBtn label={copy.goToOrder} onPress={() => router.replace(`/order/${id}`)} />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/order/${id}/invite`)}
          style={styles.shareBtn}
        >
          <Text style={styles.shareBtnText}>{copy.shareAgain}</Text>
        </Pressable>
        <SecondaryBtn label={copy.goHome} onPress={() => router.replace('/(tabs)/building')} />
      </View>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: 32,
    paddingBottom: 40,
    gap: 16,
    justifyContent: 'center',
  },
  celebCard: {
    alignItems: 'center',
    gap: 10,
    padding: 24,
    borderRadius: radii.xl,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
    ...shadow.card,
  },
  checkMark: {
    width: 72,
    height: 72,
    borderRadius: radii.xl,
    backgroundColor: colors.acc,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  checkText: {
    fontSize: 34,
    color: colors.white,
    fontFamily: fontFamily.display,
  },
  eyebrow: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.acc,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 34,
    color: colors.tx,
    textAlign: 'center',
    lineHeight: 38,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.mu,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  detailCard: {
    padding: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
    gap: 10,
    ...shadow.card,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  detailLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: colors.mu,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailValue: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.tx,
    flex: 1,
    textAlign: 'right',
  },
  divider: { height: 1, backgroundColor: colors.br },
  savingsCard: {
    padding: 18,
    borderRadius: radii.xl,
    backgroundColor: colors.goldLight,
    borderWidth: 1,
    borderColor: colors.br,
    gap: 12,
    ...shadow.card,
  },
  savingsEyebrow: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.acc,
    textTransform: 'uppercase',
  },
  savingsNote: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.mu,
    lineHeight: 19,
    marginTop: -4,
  },
  savingsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savingsItem: { flex: 1, alignItems: 'center', gap: 4 },
  savingsNum: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    color: colors.tx,
  },
  savingsNumGreen: { color: colors.acc },
  savingsItemLabel: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.mu,
    textAlign: 'center',
    lineHeight: 15,
  },
  savingsDivider: { width: 1, height: 48, backgroundColor: colors.br },
  savingsBadge: {
    padding: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.acc,
    alignItems: 'center',
  },
  savingsBadgeText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.white,
  },
  actions: { gap: 10 },
  shareBtn: {
    minHeight: 50,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.acc,
    backgroundColor: colors.goldLight,
  },
  shareBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.acc,
  },
});
