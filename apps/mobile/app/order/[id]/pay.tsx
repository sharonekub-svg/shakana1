import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { usePayForOrder } from '@/api/payments';
import { useOrder } from '@/api/orders';
import { calcCommission, formatAgorot } from '@/utils/format';
import { useUiStore } from '@/stores/uiStore';
import { usePaymentSettingsStore } from '@/stores/paymentSettingsStore';
import { useAuthStore } from '@/stores/authStore';

function LockIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.mu} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z" />
      <Path d="M7 11V7a5 5 0 0110 0v4" />
    </Svg>
  );
}

const TOTAL_STEPS = 3;

export default function Pay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data } = useOrder(id);
  const userId = useAuthStore((s) => s.user?.id);
  const pay = usePayForOrder(String(id));
  const pushToast = useUiStore((s) => s.pushToast);
  const paymentSettings = usePaymentSettingsStore((s) => s.settings);
  const loadPayments = usePaymentSettingsStore((s) => s.load);
  const paymentsHydrated = usePaymentSettingsStore((s) => s.hydrated);

  const order = data?.order;
  const me = data?.participants.find((p) => p.user_id === userId);
  const allItems = data?.items ?? [];
  const myItems = allItems.filter((item) => item.participant_id === me?.id);
  const myItemsAgorot = myItems.reduce((sum, item) => sum + Math.max(0, item.price_agorot ?? 0), 0);
  const groupTotalAgorot = allItems.reduce((sum, item) => sum + Math.max(0, item.price_agorot ?? 0), 0);
  const participantCount = data?.participants.length ?? 1;
  const readyPaymentMethods = Object.entries(paymentSettings).filter(([, method]) => method.enabled && method.link.trim().length > 0);
  const hasPaymentOption = readyPaymentMethods.length > 0;

  const breakdown = order && myItemsAgorot > 0
    ? calcCommission(myItemsAgorot, groupTotalAgorot, order.store_key ?? 'manual')
    : null;
  const amountAgorot = breakdown?.totalAgorot ?? me?.amount_agorot ?? 0;
  const canPay = Boolean(order && me && amountAgorot > 0);

  const estimatedShipping =
    typeof order?.estimated_shipping_agorot === 'number' && order.estimated_shipping_agorot > 0
      ? order.estimated_shipping_agorot
      : 3000;
  const splitShippingAgorot = Math.round(estimatedShipping / Math.max(1, participantCount));
  const productOnlyAgorot = amountAgorot - splitShippingAgorot;
  const groupDiscount = breakdown ? Math.max(0, myItemsAgorot - breakdown.totalAgorot + splitShippingAgorot) : 0;

  useEffect(() => {
    if (pay.isSuccess) router.replace(`/order/${id}/escrow`);
  }, [pay.isSuccess, id, router]);

  useEffect(() => {
    if (!paymentsHydrated) void loadPayments();
  }, [loadPayments, paymentsHydrated]);

  const go = async () => {
    if (!me) {
      pushToast('You need to join this order before paying.', 'error');
      router.replace(`/order/${id}`);
      return;
    }
    if (!hasPaymentOption) {
      pushToast('Add Bit, PayBox, Venmo, or another payment option first.', 'error');
      router.push('/profile/payment');
      return;
    }
    try {
      await pay.mutateAsync();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Payment failed.', 'error');
    }
  };

  return (
    <ScreenBase padded={false} safeEdges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <Text style={styles.headerKicker}>SHAKANA</Text>
        <View style={{ width: 40 }} />
      </View>

      {!order ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <ActivityIndicator color={colors.acc} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Step indicator */}
          <View style={styles.stepRow}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <View key={i} style={[styles.stepDot, i + 1 <= TOTAL_STEPS && styles.stepDotActive, i + 1 === TOTAL_STEPS && styles.stepDotCurrent]} />
            ))}
            <Text style={styles.stepLabel}>STEP {TOTAL_STEPS} OF {TOTAL_STEPS}</Text>
          </View>

          {/* Title */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Review & pay</Text>
            <Text style={styles.subtitle}>
              {order.store_label ? `${order.store_label} · ` : ''}{order.product_title ?? 'Your order'}
            </Text>
          </View>

          {/* Items list */}
          <View style={styles.itemsCard}>
            <Text style={styles.itemsCardTitle}>Your items</Text>
            {myItems.length === 0 ? (
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{order.product_title ?? 'Main product'}</Text>
                </View>
                <View style={styles.privateBadge}>
                  <LockIcon />
                  <Text style={styles.privateBadgeText}>PRIVATE</Text>
                </View>
                <Text style={styles.itemPrice}>{formatAgorot(order.product_price_agorot)}</Text>
              </View>
            ) : myItems.map((item, i) => (
              <View key={item.id} style={[styles.itemRow, i > 0 && styles.itemRowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.title}</Text>
                  {item.size ? <Text style={styles.itemMeta}>{item.size}</Text> : null}
                </View>
                <View style={styles.privateBadge}>
                  <LockIcon />
                  <Text style={styles.privateBadgeText}>PRIVATE</Text>
                </View>
                <Text style={styles.itemPrice}>{formatAgorot(item.price_agorot)}</Text>
              </View>
            ))}
          </View>

          {/* Cost breakdown */}
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>Cost breakdown</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Product price</Text>
              <Text style={styles.breakdownValue}>{formatAgorot(myItemsAgorot || order.product_price_agorot)}</Text>
            </View>
            {groupDiscount > 0 ? (
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, styles.breakdownLabelGreen]}>Group discount</Text>
                <Text style={[styles.breakdownValue, styles.breakdownValueGreen]}>−{formatAgorot(groupDiscount)}</Text>
              </View>
            ) : null}
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Split shipping ({participantCount} neighbors)</Text>
              <Text style={styles.breakdownValue}>{formatAgorot(splitShippingAgorot)}</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabelTotal}>Total</Text>
              <Text style={styles.breakdownValueTotal}>{formatAgorot(amountAgorot)}</Text>
            </View>
          </View>

          {/* Payment methods */}
          {!hasPaymentOption ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>Payment option required</Text>
              <Text style={styles.warningBody}>
                Add Bit, PayBox, Venmo, or another payment option to continue.
              </Text>
              <Pressable onPress={() => router.push('/profile/payment')} style={styles.warningBtn} accessibilityRole="button">
                <Text style={styles.warningBtnText}>Set up payment</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.methodsCard}>
              <Text style={styles.methodsTitle}>Pay via</Text>
              {readyPaymentMethods.map(([key, method]) => (
                <Pressable
                  key={key}
                  style={styles.methodRow}
                  accessibilityRole="button"
                  onPress={() => {
                    if (/^https?:\/\//i.test(method.link)) void Linking.openURL(method.link);
                  }}
                >
                  <Text style={styles.methodName}>{key.toUpperCase()}</Text>
                  <Text style={styles.methodLink} numberOfLines={1}>{method.link}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Fine print */}
          <View style={styles.finePrintRow}>
            <LockIcon />
            <Text style={styles.finePrint}>
              Your order details are private. Neighbors only see the group total. Minimum 5 neighbors required for free shipping.
            </Text>
          </View>

          {/* CTA */}
          <Pressable
            accessibilityRole="button"
            onPress={() => void go()}
            disabled={(!canPay && hasPaymentOption) || pay.isPending}
            style={({ pressed }) => [
              styles.payBtn,
              (!canPay && hasPaymentOption) && styles.payBtnDisabled,
              pressed && canPay && { opacity: 0.92 },
            ]}
          >
            <Text style={styles.payBtnText}>
              {pay.isPending
                ? 'Processing...'
                : !hasPaymentOption
                  ? 'Add payment option'
                  : `Pay ${formatAgorot(amountAgorot)} & join group`}
            </Text>
          </Pressable>

        </ScrollView>
      )}
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerKicker: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 2.4,
    color: colors.acc,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 48,
    gap: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.br,
  },
  stepDotActive: {
    backgroundColor: colors.acc,
    opacity: 0.4,
  },
  stepDotCurrent: {
    opacity: 1,
    width: 22,
    borderRadius: 4,
  },
  stepLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.mu2,
    marginLeft: 4,
  },
  titleBlock: { gap: 6 },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    color: colors.tx,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.mu,
    lineHeight: 20,
  },
  itemsCard: {
    backgroundColor: colors.white,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.br,
    padding: 18,
    gap: 0,
    ...shadow.card,
  },
  itemsCardTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.mu,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  itemRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.br,
  },
  itemName: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: colors.tx,
  },
  itemMeta: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mu,
    marginTop: 2,
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.s2,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  privateBadgeText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.mu,
  },
  itemPrice: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: colors.tx,
  },
  breakdownCard: {
    backgroundColor: colors.white,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.br,
    padding: 18,
    gap: 12,
    ...shadow.card,
  },
  breakdownTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.mu,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.mu,
    flex: 1,
  },
  breakdownLabelGreen: {
    color: '#3D7A52',
  },
  breakdownValue: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    color: colors.tx,
  },
  breakdownValueGreen: {
    color: '#3D7A52',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.br,
    marginVertical: 2,
  },
  breakdownLabelTotal: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    color: colors.tx,
    flex: 1,
  },
  breakdownValueTotal: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.tx,
  },
  warningCard: {
    backgroundColor: colors.cardSoft,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.br,
    padding: 18,
    gap: 8,
  },
  warningTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: colors.tx,
  },
  warningBody: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.mu,
    lineHeight: 20,
  },
  warningBtn: {
    marginTop: 4,
    backgroundColor: colors.acc,
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  warningBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.white,
  },
  methodsCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.br,
    padding: 18,
    gap: 10,
    ...shadow.card,
  },
  methodsTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.mu,
    textTransform: 'uppercase',
  },
  methodRow: {
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.br,
  },
  methodName: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.tx,
  },
  methodLink: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.acc,
  },
  finePrintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 4,
  },
  finePrint: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mu2,
    lineHeight: 18,
    flex: 1,
  },
  payBtn: {
    backgroundColor: colors.acc,
    borderRadius: radii.pill,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
    ...shadow.cta,
  },
  payBtnDisabled: {
    backgroundColor: colors.br,
  },
  payBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    color: colors.white,
    letterSpacing: 0.4,
  },
});
