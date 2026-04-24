import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useOrder } from '@/api/orders';
import { buildZaraCartUrl } from '@/lib/zara';
import { formatAgorot } from '@/utils/format';
import { useUiStore } from '@/stores/uiStore';

function Check() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44" fill="none">
      <Path
        d="M10 22l9 9 15-18"
        stroke="white"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function Complete() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useOrder(id);
  const pushToast = useUiStore((s) => s.pushToast);

  if (isLoading || !data) {
    return (
      <ScreenBase style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.acc} />
      </ScreenBase>
    );
  }

  const isZara = (data.order.product_url ?? '').includes('zara.com');
  const zaraUrl = buildZaraCartUrl(data.order.id, data.items);

  const openZara = async () => {
    try {
      await Linking.openURL(zaraUrl);
    } catch {
      pushToast('לא ניתן לפתוח את ZARA', 'error');
    }
  };

  return (
    <ScreenBase style={{ paddingTop: 20, paddingBottom: 36 }}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.replace('/(tabs)/orders')} />
        <Text style={styles.headerTitle}>הושלם</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.heroBlock}>
        <View style={styles.circle}>
          <Check />
        </View>
        <Text style={styles.title}>ההזמנה הושלמה!</Text>
        <Text style={styles.sub}>הכסף שוחרר לספק וההזמנה תגיע אליך בקרוב.</Text>
      </View>

      <View style={styles.receipt}>
        <Text style={styles.receiptTitle}>קבלה</Text>
        <View style={styles.receiptRow}>
          <Text style={styles.rowK}>סכום כולל</Text>
          <Text style={styles.rowV}>{formatAgorot(data.order.product_price_agorot)}</Text>
        </View>
        <View style={styles.receiptRow}>
          <Text style={styles.rowK}>משתתפים</Text>
          <Text style={styles.rowV}>{data.participants.length}</Text>
        </View>
      </View>

      {isZara ? (
        <Pressable
          onPress={openZara}
          style={({ pressed }) => [styles.zaraBtn, pressed && { opacity: 0.9 }]}
          accessibilityRole="button"
        >
          <Text style={styles.zaraLabel}>פתח סל ZARA 🛍️</Text>
        </Pressable>
      ) : null}
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
  heroBlock: { alignItems: 'center', gap: 14, marginTop: 16, marginBottom: 28 },
  circle: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.grn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fontFamily.display, fontSize: 28, color: colors.tx },
  sub: { fontFamily: fontFamily.body, fontSize: 15, color: colors.mu, textAlign: 'center' },
  receipt: {
    backgroundColor: colors.white,
    borderColor: colors.br,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 18,
    gap: 10,
    marginBottom: 24,
  },
  receiptTitle: { fontFamily: fontFamily.bodySemi, fontSize: 15, color: colors.tx, marginBottom: 4 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rowK: { fontFamily: fontFamily.body, color: colors.mu, fontSize: 14 },
  rowV: { fontFamily: fontFamily.bodySemi, color: colors.tx, fontSize: 14 },
  zaraBtn: {
    backgroundColor: colors.tx,
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  zaraLabel: { color: colors.white, fontFamily: fontFamily.bodySemi, fontSize: 16 },
});
