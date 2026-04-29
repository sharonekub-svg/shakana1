import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ShakanaMark } from '@/components/primitives/ShakanaMark';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useAuthStore } from '@/stores/authStore';
import { useUserOrders } from '@/api/orders';
import { formatAgorot } from '@/utils/format';
import { track } from '@/lib/posthog';
import { useLocale } from '@/i18n/locale';

export default function OrdersTab() {
  const router = useRouter();
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const { data: orders = [], isLoading } = useUserOrders(user?.id);

  const newOrder = () => {
    track('start_order_clicked');
    router.push('/order/new');
  };

  return (
    <ScreenBase padded={false} safeEdges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View style={styles.logoBubble}>
            <ShakanaMark size={44} />
          </View>
          <View>
            <Text style={styles.kicker}>SHAKANA</Text>
            <Text style={styles.title}>{t('tabs.orders.title')}</Text>
          </View>
        </View>
        <Pressable onPress={newOrder} style={styles.newBtn} accessibilityRole="button">
          <Text style={styles.newBtnText}>{t('tabs.orders.newOrder')}</Text>
        </Pressable>
      </View>

      {isLoading || orders.length === 0 ? (
        <EmptyState
          badge="ORD"
          title={t('tabs.orders.noOrdersTitle')}
          subtitle={t('tabs.orders.noOrdersBody')}
          cta={t('tabs.orders.newOrder')}
          onCta={newOrder}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28, gap: 12 }}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { transform: [{ scale: 0.99 }] }]}
              onPress={() => router.push(`/order/${item.id}`)}
              accessibilityRole="button"
            >
              <View style={styles.rowTop}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{(item.store_label ?? 'ORD').slice(0, 3).toUpperCase()}</Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.product_title ?? item.product_url}
              </Text>
              <Text style={styles.rowSub}>
                {formatAgorot(item.product_price_agorot)} ֲ· {item.max_participants} {t('tabs.orders.seats')}
              </Text>
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
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logoBubble: {
    width: 52,
    height: 52,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.br,
    ...shadow.card,
  },
  kicker: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 2.4,
    color: colors.acc,
    marginBottom: 4,
  },
  title: { fontFamily: fontFamily.display, fontSize: 26, color: colors.tx },
  newBtn: {
    backgroundColor: colors.navy,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.cta,
  },
  newBtnText: { color: colors.white, fontSize: 12, fontFamily: fontFamily.bodyBold, letterSpacing: 1.2 },
  row: {
    backgroundColor: colors.white,
    borderRadius: 26,
    padding: 16,
    borderColor: colors.br,
    borderWidth: 1,
    gap: 8,
    ...shadow.card,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.br,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardSoft,
  },
  badgeText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.tx,
  },
  statusPill: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.accLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.acc,
  },
  rowTitle: { fontFamily: fontFamily.bodyBold, fontSize: 16, color: colors.tx },
  rowSub: { fontFamily: fontFamily.body, fontSize: 13, color: colors.mu },
});
