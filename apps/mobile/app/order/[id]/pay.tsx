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

function ChevronRight() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.mu2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.mu} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

function LockIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z" />
      <Path d="M7 11V7a5 5 0 0110 0v4" />
    </Svg>
  );
}

function EscrowIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.mu2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Svg>
  );
}

const SWATCH_COLORS = ['#C5654B', '#D29A4A', '#6A5E50', '#1E1812', '#A89B89', '#EFE6D6'];

function swatchColor(index: number): string {
  return SWATCH_COLORS[index % SWATCH_COLORS.length] ?? SWATCH_COLORS[0]!;
}

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
  const readyPaymentMethods = Object.entries(paymentSettings).filter(([, method]) => method.enabled && method.link.trim().length > 0);
  const hasPaymentOption = readyPaymentMethods.length > 0;

  const order = data?.order;
  const me = data?.participants.find((p) => p.user_id === userId);
  const allItems = data?.items ?? [];
  const myItems = allItems.filter((item) => item.participant_id === me?.id);
  const myItemsAgorot = myItems.reduce((sum, item) => sum + Math.max(0, item.price_agorot ?? 0), 0);
  const groupTotalAgorot = allItems.reduce((sum, item) => sum + Math.max(0, item.price_agorot ?? 0), 0);
  const breakdown = order && myItemsAgorot > 0
    ? calcCommission(myItemsAgorot, groupTotalAgorot, order.store_key ?? 'manual')
    : null;
  const amountAgorot = breakdown?.totalAgorot ?? me?.amount_agorot ?? 0;
  const canPay = Boolean(order && me && amountAgorot > 0);

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
    <ScreenBase style={{ paddingTop: 20, paddingBottom: 0 }}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      {!order ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <ActivityIndicator color={colors.acc} />
        </View>
      ) : (
        <>
          <View style={styles.lockBanner}>
            <LockIcon />
            <Text style={styles.lockText}>Cart locked · review and pay</Text>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {myItems.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Your items</Text>
                <View style={styles.card}>
                  {myItems.map((item, index) => (
                    <View
                      key={item.id ?? index}
                      style={[styles.itemRow, index < myItems.length - 1 && styles.itemRowBorder]}
                    >
                      <View style={[styles.swatch, { backgroundColor: swatchColor(index) }]} />
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle} numberOfLines={2}>{item.title ?? 'Item'}</Text>
                        {item.size ? (
                          <Text style={styles.itemMeta} numberOfLines={1}>{item.size}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.itemPrice}>{formatAgorot(Math.max(0, item.price_agorot ?? 0))}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Cost breakdown</Text>
            <View style={styles.card}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Subtotal</Text>
                <Text style={styles.breakdownValue}>{formatAgorot(myItemsAgorot)}</Text>
              </View>
              {breakdown && breakdown.savingsAgorot > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Group discount</Text>
                  <Text style={[styles.breakdownValue, styles.breakdownSavings]}>−{formatAgorot(breakdown.savingsAgorot)}</Text>
                </View>
              )}
              {breakdown && breakdown.commissionAgorot > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Split shipping</Text>
                  <Text style={styles.breakdownValue}>+{formatAgorot(breakdown.commissionAgorot)}</Text>
                </View>
              )}
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownTotalLabel}>Total</Text>
                <Text style={styles.breakdownTotal}>{formatAgorot(amountAgorot)}</Text>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Payment method</Text>
            <View style={styles.card}>
              {!hasPaymentOption ? (
                <Pressable
                  style={styles.methodRow}
                  onPress={() => router.push('/profile/payment')}
                  accessibilityRole="button"
                >
                  <View style={styles.methodBadge}>
                    <PlusIcon />
                  </View>
                  <Text style={styles.addMethodText}>Add payment option</Text>
                  <ChevronRight />
                </Pressable>
              ) : (
                <>
                  {readyPaymentMethods.map(([key, method], index) => (
                    <Pressable
                      key={key}
                      style={[styles.methodRow, index < readyPaymentMethods.length - 1 && styles.methodRowBorder]}
                      onPress={() => {
                        if (/^https?:\/\//i.test(method.link)) void Linking.openURL(method.link);
                      }}
                      accessibilityRole="button"
                    >
                      <View style={styles.methodBadge}>
                        <Text style={styles.methodBadgeText}>{key.slice(0, 2).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.methodName}>{key.toUpperCase()}</Text>
                        <Text style={styles.methodLink} numberOfLines={1}>{method.link}</Text>
                      </View>
                      <ChevronRight />
                    </Pressable>
                  ))}
                  <View style={styles.addMethodSeparator} />
                  <Pressable
                    style={[styles.methodRow, { paddingBottom: 4 }]}
                    onPress={() => router.push('/profile/payment')}
                    accessibilityRole="button"
                  >
                    <View style={styles.methodBadge}>
                      <PlusIcon />
                    </View>
                    <Text style={styles.addMethodText}>+ Add method</Text>
                  </Pressable>
                </>
              )}
            </View>

            <View style={{ height: 120 }} />
          </ScrollView>

          <View style={styles.pinnedBottom}>
            <Pressable
              onPress={go}
              disabled={(!canPay && hasPaymentOption) || pay.isPending}
              style={[styles.ctaBtn, ((!canPay && hasPaymentOption) || pay.isPending) && { opacity: 0.6 }]}
              accessibilityRole="button"
            >
              {pay.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.ctaBtnText}>
                  {hasPaymentOption
                    ? `Pay ${formatAgorot(amountAgorot)} · join group`
                    : 'Add payment option'}
                </Text>
              )}
            </Pressable>
            <View style={styles.escrowNote}>
              <EscrowIcon />
              <Text style={styles.escrowText}>Held in escrow until delivery confirmed</Text>
            </View>
          </View>
        </>
      )}
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.tx,
    fontStyle: 'italic',
  },
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.ink,
    borderRadius: radii.sm,
    paddingVertical: 11,
    marginBottom: 20,
  },
  lockText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.white,
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: fontFamily.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    color: colors.mu2,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
    borderRadius: 20,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,24,18,0.07)',
  },
  swatch: {
    width: 40,
    height: 52,
    borderRadius: 10,
  },
  itemInfo: {
    flex: 1,
    gap: 3,
  },
  itemTitle: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    color: colors.tx,
    lineHeight: 18,
  },
  itemMeta: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mu,
  },
  itemPrice: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.tx,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  breakdownLabel: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.mu,
  },
  breakdownValue: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    color: colors.tx,
  },
  breakdownSavings: {
    color: '#1F8A5B',
  },
  breakdownDivider: {
    height: 1,
    marginVertical: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(30,24,18,0.10)',
    borderStyle: 'dotted',
  },
  breakdownTotalLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: colors.tx,
  },
  breakdownTotal: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.tx,
    fontStyle: 'italic',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  methodRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,24,18,0.07)',
  },
  methodBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.s2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodBadgeText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    color: colors.tx,
  },
  methodName: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.tx,
  },
  methodLink: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mu,
  },
  addMethodSeparator: {
    height: 1,
    backgroundColor: 'rgba(30,24,18,0.07)',
    marginHorizontal: -16,
  },
  addMethodText: {
    flex: 1,
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    color: colors.mu,
  },
  pinnedBottom: {
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 0,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(30,24,18,0.08)',
    backgroundColor: colors.bg,
  },
  ctaBtn: {
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.acc,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    ...shadow.cta,
  },
  ctaBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    color: colors.white,
    letterSpacing: 0.2,
  },
  escrowNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  escrowText: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.mu2,
  },
});
