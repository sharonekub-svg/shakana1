import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { PrimaryBtn } from '@/components/primitives/Button';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useConfirmDelivery, useOrder } from '@/api/orders';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { formatAgorot } from '@/utils/format';

function Lock() {
  return (
    <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="11" width="16" height="10" rx="2" stroke={colors.white} strokeWidth={2} />
      <Path d="M8 11V8a4 4 0 018 0v3" stroke={colors.white} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export default function Escrow() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useOrder(id);
  const userId = useAuthStore((s) => s.user?.id);
  const confirm = useConfirmDelivery();
  const pushToast = useUiStore((s) => s.pushToast);

  const order = data?.order;
  const paidCount = data?.participants.filter((p) => p.status === 'paid').length ?? 0;
  const total = order?.max_participants ?? 0;
  const allPaid = total > 0 && paidCount >= total;
  const isCreator = order && userId === order.creator_id;

  const onDelivered = async () => {
    if (!order) return;
    try {
      await confirm.mutateAsync(order.id);
      router.replace(`/order/${order.id}/complete`);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'לא ניתן לסמן כהגיע', 'error');
    }
  };

  if (isLoading || !order) {
    return (
      <ScreenBase style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.acc} />
      </ScreenBase>
    );
  }

  return (
    <ScreenBase style={{ paddingTop: 20, paddingBottom: 36 }}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.replace('/(tabs)/orders')} />
        <Text style={styles.headerTitle}>נאמנות</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.lockBox}>
        <Lock />
        <Text style={styles.lockTitle}>הכסף נשמר בנאמנות</Text>
        <Text style={styles.lockSub}>
          {allPaid
            ? 'כל המשתתפים שילמו. הכסף יועבר רק לאחר אישור מסירה.'
            : `שילמו ${paidCount} מתוך ${total} משתתפים. ממתין לשאר…`}
        </Text>
        <Text style={styles.amount}>{formatAgorot(order.product_price_agorot)}</Text>
      </View>

      <View style={{ flex: 1 }} />

      {isCreator ? (
        <PrimaryBtn
          label="המשלוח הגיע — שחרר תשלום"
          onPress={onDelivered}
          loading={confirm.isPending}
          disabled={!allPaid}
        />
      ) : (
        <Text style={styles.waitNote}>רק יוצר ההזמנה יכול לסמן שההזמנה הגיעה.</Text>
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
  lockBox: {
    backgroundColor: colors.grn,
    borderRadius: radii.xxl,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  lockTitle: { fontFamily: fontFamily.display, fontSize: 22, color: colors.white },
  lockSub: {
    fontFamily: fontFamily.body,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  amount: { fontFamily: fontFamily.display, fontSize: 32, color: colors.white, marginTop: 8 },
  waitNote: {
    textAlign: 'center',
    color: colors.mu,
    fontSize: 13,
    fontFamily: fontFamily.body,
    paddingVertical: 14,
  },
});
