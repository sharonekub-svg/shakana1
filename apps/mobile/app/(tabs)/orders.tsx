import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useAuthStore } from '@/stores/authStore';
import { useUserOrders } from '@/api/orders';
import { formatAgorot } from '@/utils/format';
import { formatCompactDuration } from '@/utils/timer';
import { track } from '@/lib/posthog';
import { useLocale } from '@/i18n/locale';

export default function OrdersTab() {
  const router = useRouter();
  const { language, t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const { data: orders = [], isLoading } = useUserOrders(user?.id);
  const openOrders = orders.filter((order) => !['completed', 'cancelled'].includes(order.status)).length;
  const completedOrders = orders.filter((order) => order.status === 'completed').length;

  const orderTimingLabel = (closesAt?: string | null) => {
    if (!closesAt) return language === 'he' ? 'ללא טיימר' : 'No timer';
    const remaining = new Date(closesAt).getTime() - Date.now();
    return remaining > 0
      ? `${language === 'he' ? 'נסגר בעוד' : 'closes in'} ${formatCompactDuration(remaining)}`
      : language === 'he' ? 'הטיימר הסתיים' : 'timer ended';
  };

  const STATUS_LABEL: Record<string, Record<string, string>> = {
    open: { he: 'פתוחה', en: 'OPEN' },
    locked: { he: 'נעולה', en: 'LOCKED' },
    paying: { he: 'תשלום', en: 'PAYING' },
    escrow: { he: 'נאמנות', en: 'ESCROW' },
    delivered: { he: 'נמסר', en: 'DELIVERED' },
    completed: { he: 'הושלם', en: 'DONE' },
    cancelled: { he: 'בוטל', en: 'CANCELLED' },
  };
  const statusLabel = (s: string) => STATUS_LABEL[s]?.[language] ?? s.toUpperCase();

  const stats = [
    { label: t('tabs.home.openOrders'), value: String(openOrders) },
    { label: t('tabs.home.completed'), value: String(completedOrders) },
    { label: language === 'he' ? 'קישורי שיתוף' : 'Invite links', value: '1' },
  ];

  const newOrder = () => {
    track('start_order_clicked');
    router.push('/order/new');
  };

  return (
    <ScreenBase padded={false} safeEdges={['top']}>
      {/* App bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.kicker}>SHAKANA</Text>
          <Text style={styles.title}>{t('tabs.orders.title')}</Text>
        </View>
        <Pressable
          onPress={newOrder}
          style={({ pressed }) => [styles.newBtn, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
        >
          <Text style={styles.newBtnText}>+ {t('tabs.orders.newOrder')}</Text>
        </Pressable>
      </View>

      {/* Dark stats strip */}
      <View style={styles.statsStrip}>
        {stats.map((stat, i) => (
          <View key={stat.label} style={[styles.statCell, i < stats.length - 1 && styles.statCellBorder]}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Order list / empty state */}
      {isLoading || orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>{t('tabs.orders.noOrdersTitle')}</Text>
          <Text style={styles.emptyBody}>{t('tabs.orders.noOrdersBody')}</Text>
          <Pressable
            onPress={newOrder}
            style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Text style={styles.emptyBtnText}>+ {t('tabs.orders.newOrder')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.88 }]}
              onPress={() => router.push(`/order/${item.id}`)}
              accessibilityRole="button"
            >
              <View style={styles.rowBadge}>
                <Text style={styles.rowBadgeText}>{(item.store_label ?? 'ORD').slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={styles.rowBody}>
                {item.store_label ? (
                  <Text style={styles.rowStore} numberOfLines={1}>{item.store_label}</Text>
                ) : null}
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.product_title ?? item.product_url}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {formatAgorot(item.product_price_agorot)} · {orderTimingLabel(item.closes_at)}
                  {item.estimated_shipping_agorot
                    ? ` · ${formatAgorot(item.estimated_shipping_agorot)} ${language === 'he' ? 'משלוח' : 'shipping'}`
                    : ''}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>{statusLabel(item.status)}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 2.4,
    color: colors.acc,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    fontStyle: 'italic',
    color: colors.tx,
    lineHeight: 34,
  },
  newBtn: {
    backgroundColor: colors.acc,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBtnText: {
    color: '#FAF6EF',
    fontSize: 12,
    fontFamily: fontFamily.bodyBold,
    letterSpacing: 0.6,
  },

  statsStrip: {
    flexDirection: 'row',
    backgroundColor: '#1E1812',
    marginHorizontal: 20,
    borderRadius: 20,
    marginBottom: 16,
    paddingVertical: 18,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statCellBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.12)',
  },
  statValue: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    fontStyle: 'italic',
    color: '#FAF6EF',
    lineHeight: 32,
  },
  statLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: 'rgba(250,246,239,0.55)',
    textTransform: 'uppercase',
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAF6EF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
    padding: 14,
  },
  rowBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EFE6D6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBadgeText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.mu,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowStore: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.mu2,
    textTransform: 'uppercase',
  },
  rowTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: colors.tx,
    lineHeight: 20,
  },
  rowSub: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mu,
    lineHeight: 17,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  statusPill: {
    paddingHorizontal: 10,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.accLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.acc,
    textTransform: 'uppercase',
  },
  chevron: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 22,
    color: colors.mu2,
    lineHeight: 24,
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    fontStyle: 'italic',
    color: colors.tx,
    textAlign: 'center',
    lineHeight: 30,
  },
  emptyBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.mu,
    textAlign: 'center',
    lineHeight: 21,
  },
  emptyBtn: {
    marginTop: 8,
    height: 52,
    paddingHorizontal: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.acc,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    letterSpacing: 0.6,
    color: '#FAF6EF',
  },
});
