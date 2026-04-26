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

export default function Pay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data } = useOrder(id);
  const pay = usePayForOrder(String(id));
  const pushToast = useUiStore((s) => s.pushToast);

  const order = data?.order;
  const perPerson = order ? Math.ceil(order.product_price_agorot / order.max_participants) : 0;

  useEffect(() => {
    if (pay.isSuccess) router.replace(`/order/${id}/escrow`);
  }, [pay.isSuccess, id, router]);

  const go = async () => {
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
              The total is reserved until the rest of the group completes the order.
            </Text>
          </View>

          <View style={{ flex: 1 }} />

          <PrimaryBtn label="Confirm payment" onPress={go} loading={pay.isPending} />
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
});
