import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { PrimaryBtn } from '@/components/primitives/Button';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { usePayForOrder } from '@/api/payments';
import { useOrder } from '@/api/orders';
import { formatAgorot } from '@/utils/format';
import { useUiStore } from '@/stores/uiStore';
import { usePaymentSettingsStore } from '@/stores/paymentSettingsStore';

export default function Pay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data } = useOrder(id);
  const pay = usePayForOrder(String(id));
  const pushToast = useUiStore((s) => s.pushToast);
  const paymentSettings = usePaymentSettingsStore((s) => s.settings);
  const loadPayments = usePaymentSettingsStore((s) => s.load);
  const paymentsHydrated = usePaymentSettingsStore((s) => s.hydrated);
  const hasPaymentOption = Object.values(paymentSettings).some((method) => method.enabled);

  const order = data?.order;
  const perPerson = order ? Math.ceil(order.product_price_agorot / order.max_participants) : 0;

  useEffect(() => {
    if (pay.isSuccess) router.replace(`/order/${id}/escrow`);
  }, [pay.isSuccess, id, router]);

  useEffect(() => {
    if (!paymentsHydrated) void loadPayments();
  }, [loadPayments, paymentsHydrated]);

  const go = async () => {
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
    <ScreenBase style={{ paddingTop: 20, paddingBottom: 36 }}>
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
        <View style={{ flex: 1 }}>
          <View style={styles.card}>
            <Text style={styles.lead}>Your share</Text>
            <Text style={styles.amount}>{formatAgorot(perPerson)}</Text>
            <Text style={styles.note}>
              Add a payment option like Bit, PayBox, Venmo, or cash before confirming.
            </Text>
          </View>

          {!hasPaymentOption ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>Payment option required</Text>
              <Text style={styles.warningBody}>Set up at least one way for people to pay before continuing.</Text>
            </View>
          ) : null}

          <View style={{ flex: 1 }} />

          <PrimaryBtn
            label={hasPaymentOption ? 'Confirm payment' : 'Add payment option'}
            onPress={go}
            loading={pay.isPending}
          />
        </View>
      )}
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitle: { fontFamily: fontFamily.display, fontSize: 22, color: colors.tx },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 24,
    borderColor: colors.br,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  lead: { fontFamily: fontFamily.body, fontSize: 14, color: colors.mu },
  amount: { fontFamily: fontFamily.display, fontSize: 40, color: colors.tx },
  note: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.mu,
    textAlign: 'center',
    maxWidth: 260,
    marginTop: 4,
    lineHeight: 20,
  },
  warningCard: {
    marginTop: 14,
    backgroundColor: colors.cardSoft,
    borderRadius: radii.md,
    padding: 16,
    borderColor: colors.br,
    borderWidth: 1,
    gap: 6,
  },
  warningTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.tx,
  },
  warningBody: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mu,
  },
});
