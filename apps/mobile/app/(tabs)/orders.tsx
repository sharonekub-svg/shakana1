import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { EmptyState } from '@/components/primitives/EmptyState';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useAuthStore } from '@/stores/authStore';
import { useUserOrders } from '@/api/orders';
import { formatAgorot } from '@/utils/format';
import { track } from '@/lib/posthog';

export default function OrdersTab() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: orders = [], isLoading } = useUserOrders(user?.id);

  const newOrder = () => {
    track('start_order_clicked');
    router.push('/order/new');
  };

  return (
    <ScreenBase padded={false} safeEdges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>הזמנות</Text>
        <Pressable onPress={newOrder} style={styles.newBtn} accessibilityRole="button">
          <Text style={styles.newBtnText}>+ חדשה</Text>
        </Pressable>
      </View>

      {isLoading || orders.length === 0 ? (
        <EmptyState
          icon="🛍️"
          title="אין הזמנות עדיין"
          subtitle="צור הזמנה קבוצתית עם שכניך ופצל את עלות המשלוח."
          cta="צור הזמנה קבוצתית"
          onCta={newOrder}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/order/${item.id}`)}
              accessibilityRole="button"
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.product_title ?? item.product_url}
                </Text>
                <Text style={styles.rowSub}>
                  {item.status} · {formatAgorot(item.product_price_agorot)}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontFamily: fontFamily.display, fontSize: 24, color: colors.tx },
  newBtn: {
    backgroundColor: colors.acc,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
    shadowColor: colors.acc,
    shadowOpacity: 0.27,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  newBtnText: { color: colors.white, fontSize: 14, fontFamily: fontFamily.bodySemi },
  row: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 14,
    borderColor: colors.br,
    borderWidth: 1,
  },
  rowTitle: { fontFamily: fontFamily.bodySemi, fontSize: 15, color: colors.tx },
  rowSub: { fontFamily: fontFamily.body, fontSize: 13, color: colors.mu, marginTop: 4 },
});
