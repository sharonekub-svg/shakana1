import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BrandPill,
  CelebrationBanner,
  ProgressBar,
  SavingsTracker,
  SelfUpdatingTimerRing,
  StatusRail,
  demoStyles,
} from '@/components/demo/DemoPrimitives';
import { FREE_SHIPPING_GOAL, demoStores, type DemoBrandId } from '@/demo/catalog';
import {
  getGoalProgress,
  getGroupSavings,
  getMerchantOrderState,
  getOrderItemCount,
  getOrderTotal,
  initDemoCommerceSync,
  useDemoCommerceStore,
  type DemoOrder,
  type OrderStatus,
} from '@/stores/demoCommerceStore';
import { fontFamily } from '@/theme/fonts';
import { colors, radii, shadow } from '@/theme/tokens';
import { useLocale } from '@/i18n/locale';
import { formatMoney } from '@/utils/money';

type QueueFilter = 'needsAction' | 'all' | OrderStatus;
type StoreFilter = 'all' | DemoBrandId;

const STORE_FILTERS: StoreFilter[] = ['all', 'zara', 'amazon', 'hm'];

const FILTERS: { label: string; value: QueueFilter }[] = [
  { label: 'Needs action', value: 'needsAction' },
  { label: 'All', value: 'all' },
  { label: 'Collecting', value: 'collecting' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Packing', value: 'packing' },
  { label: 'Ready', value: 'ready' },
  { label: 'Shipped', value: 'shipped' },
];

function isDisplayableMerchantOrder(order: DemoOrder) {
  return (
    !!demoStores[order.brand] &&
    Array.isArray(order.items) &&
    Array.isArray(order.participants) &&
    typeof order.id === 'string' &&
    typeof order.inviteCode === 'string' &&
    typeof order.closesAt === 'number' &&
    typeof order.createdAt === 'number'
  );
}

function getOrderPriority(order: DemoOrder, nowMs: number) {
  if (order.status === 'shipped') return { label: 'Done', tone: 'calm' as const };
  if (order.status === 'ready') return { label: 'Ship next', tone: 'hot' as const };
  if (order.status === 'packing') return { label: 'Packing', tone: 'hot' as const };
  if (order.status === 'accepted') return { label: 'Accepted', tone: 'calm' as const };
  if (order.closesAt <= nowMs) return { label: 'Timer ended', tone: 'hot' as const };
  if (order.items.length > 0) return { label: 'New items', tone: 'hot' as const };
  return { label: 'Collecting', tone: 'calm' as const };
}

const BAR_BUILDINGS = ['Tower A', 'Tower B', 'Tower C', 'Hillside', 'Garden'];
const BAR_VALUES = [12, 8, 6, 4, 3];
const BAR_MAX = 14;

export default function StoreDashboardScreen() {
  const router = useRouter();
  const { language } = useLocale();
  const orders = useDemoCommerceStore((state) => state.orders);
  const lastPulse = useDemoCommerceStore((state) => state.lastPulse);
  const demoMode = useDemoCommerceStore((state) => state.demoMode);
  const setDemoRole = useDemoCommerceStore((state) => state.setDemoRole);
  const activeParticipantId = useDemoCommerceStore((state) => state.activeParticipantId);
  const [nowMs, setNowMs] = useState(Date.now());
  const [filter, setFilter] = useState<QueueFilter>('needsAction');
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    initDemoCommerceSync();
    if (demoMode) setDemoRole('store');
  }, [demoMode, setDemoRole]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const merchantOrders = useMemo(() => orders.filter(isDisplayableMerchantOrder), [orders]);
  const visibleStoreOrders = useMemo(
    () => merchantOrders.filter((order) => storeFilter === 'all' || order.brand === storeFilter),
    [merchantOrders, storeFilter],
  );
  const activeOrders = visibleStoreOrders.filter((order) => order.status !== 'shipped');
  const readyToProcess = activeOrders.filter((order) => order.items.length > 0 || order.closesAt <= nowMs).length;
  const itemsToPick = activeOrders.reduce((total, order) => total + getOrderItemCount(order), 0);
  const totalGmv = visibleStoreOrders.reduce((total, order) => total + getOrderTotal(order), 0);
  const totalSavings = Math.round(visibleStoreOrders.reduce((total, order) => total + getGroupSavings(order), 0));
  const avgGroupSize = merchantOrders.length > 0
    ? Math.round((merchantOrders.reduce((sum, o) => sum + o.participants.length, 0) / merchantOrders.length) * 10) / 10
    : 0;
  const fulfillmentPct = visibleStoreOrders.length > 0
    ? Math.round((visibleStoreOrders.filter((o) => o.status === 'shipped').length / visibleStoreOrders.length) * 100)
    : 96;

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return visibleStoreOrders.filter((order) => {
      const store = demoStores[order.brand];
      const timerEnded = order.closesAt <= nowMs;
      const matchesFilter =
        filter === 'all' ||
        (filter === 'needsAction' && order.status !== 'shipped' && (timerEnded || order.items.length > 0)) ||
        order.status === filter;
      const matchesQuery =
        !normalizedQuery ||
        order.id.toLowerCase().includes(normalizedQuery) ||
        order.inviteCode.includes(normalizedQuery) ||
        store.name.toLowerCase().includes(normalizedQuery) ||
        (order.deliveryAddress ?? '').toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [filter, nowMs, query, visibleStoreOrders]);

  const selectedStore = storeFilter !== 'all' ? demoStores[storeFilter] : null;
  const hubName = selectedStore ? `${selectedStore.name.toUpperCase()} · TEL AVIV HUB` : 'ALL STORES · TEL AVIV HUB';

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Hero header card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.storeBadge}>
            <Text style={styles.storeBadgeText}>STORE</Text>
          </View>
          <Pressable onPress={() => router.push('/user')} accessibilityRole="button" style={styles.switchBtn}>
            <Text style={styles.switchBtnText}>User view</Text>
          </Pressable>
        </View>
        <Text style={styles.heroHub}>{hubName}</Text>
        <Text style={styles.heroSub}>Merchant dashboard · Today</Text>

        {/* Key metrics row */}
        <View style={styles.heroMetrics}>
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricValue}>{activeOrders.length || 38}</Text>
            <Text style={styles.heroMetricLabel}>Group orders</Text>
          </View>
          <View style={styles.heroMetricDivider} />
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricValue}>{formatMoney(Math.round(totalGmv) || 1482000, language)}</Text>
            <Text style={styles.heroMetricLabel}>Revenue</Text>
          </View>
          <View style={styles.heroMetricDivider} />
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricValue}>{avgGroupSize || 11.2}</Text>
            <Text style={styles.heroMetricLabel}>Avg group</Text>
          </View>
          <View style={styles.heroMetricDivider} />
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricValue}>{fulfillmentPct}%</Text>
            <Text style={styles.heroMetricLabel}>Fulfillment</Text>
          </View>
        </View>
      </View>

      <CelebrationBanner pulse={lastPulse} />

      {/* Store filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storeTabRow}>
        {STORE_FILTERS.map((brand) => {
          const store = brand !== 'all' ? demoStores[brand] : null;
          const active = storeFilter === brand;
          return (
            <Pressable
              key={brand}
              accessibilityRole="button"
              onPress={() => setStoreFilter(brand)}
              style={[styles.storeTab, active && styles.storeTabActive]}
            >
              <Text style={[styles.storeTabText, active && styles.storeTabTextActive]}>
                {store ? store.name : 'All'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Bar chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Group orders by building</Text>
        <View style={styles.chartBars}>
          {BAR_BUILDINGS.map((building, i) => (
            <View key={building} style={styles.chartBarCol}>
              <Text style={styles.chartBarValue}>{BAR_VALUES[i]}</Text>
              <View style={styles.chartBarTrack}>
                <View style={[styles.chartBarFill, { height: `${Math.round(((BAR_VALUES[i] ?? 0) / BAR_MAX) * 100)}%` }]} />
              </View>
              <Text style={styles.chartBarLabel}>{building}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.statCardHighlight]}>
          <Text style={styles.statValueHighlight}>{readyToProcess}</Text>
          <Text style={styles.statLabelHighlight}>Needs action</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{activeOrders.length}</Text>
          <Text style={styles.statLabel}>Open orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{itemsToPick}</Text>
          <Text style={styles.statLabel}>Items to pick</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatMoney(totalSavings, language)}</Text>
          <Text style={styles.statLabel}>Group savings</Text>
        </View>
      </View>

      {/* Order queue */}
      <View style={styles.queueSection}>
        <Text style={styles.queueTitle}>Active orders</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search order, code, or building"
          placeholderTextColor={colors.mu2}
          style={styles.searchInput}
          accessibilityLabel="Search merchant orders"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              onPress={() => setFilter(option.value)}
              style={[styles.filterChip, filter === option.value && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filter === option.value && styles.filterChipTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {merchantOrders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No group orders yet</Text>
          <Text style={styles.emptyBody}>Create a group order from the user side. It will appear here instantly.</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No orders match this view</Text>
          <Text style={styles.emptyBody}>Clear the search or switch filters.</Text>
        </View>
      ) : (
        <View style={styles.orderList}>
          {filteredOrders.map((order) => (
            <OrderQueueCard
              key={order.id}
              order={order}
              nowMs={nowMs}
              onOpen={() => router.push(`/store/orders/${order.id}`)}
              onTimerEnd={() => setNowMs(Date.now())}
              language={language}
            />
          ))}
        </View>
      )}

      <SavingsTracker orders={visibleStoreOrders} activeParticipantId={activeParticipantId} />
    </ScrollView>
  );
}

function OrderQueueCard({
  order,
  nowMs,
  onOpen,
  onTimerEnd,
  language,
}: {
  order: DemoOrder;
  nowMs: number;
  onOpen: () => void;
  onTimerEnd?: () => void;
  language: 'he' | 'en';
}) {
  const store = demoStores[order.brand];
  if (!store) return null;
  const progress = getGoalProgress(order);
  const minutesLeft = Math.max(0, Math.ceil((order.closesAt - nowMs) / 60000));
  const merchantState = getMerchantOrderState(order, nowMs);
  const priority = getOrderPriority(order, nowMs);
  const totalItems = getOrderItemCount(order);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [styles.orderCard, pressed && demoStyles.pressed]}
    >
      <View style={styles.orderCardTop}>
        <BrandPill brand={order.brand} />
        <View style={styles.orderCardMeta}>
          <Text style={styles.orderCardId}>{order.id}</Text>
          <Text style={styles.orderCardSub}>
            Code {order.inviteCode} · {minutesLeft > 0 ? `${minutesLeft}m left` : 'ended'}
          </Text>
        </View>
        <View style={[styles.priorityChip, priority.tone === 'hot' && styles.priorityChipHot]}>
          <Text style={[styles.priorityChipText, priority.tone === 'hot' && styles.priorityChipTextHot]}>
            {priority.label}
          </Text>
        </View>
      </View>

      <View style={styles.orderCardStats}>
        <View style={styles.orderStat}>
          <Text style={styles.orderStatValue}>{order.participants.length}</Text>
          <Text style={styles.orderStatLabel}>Neighbors</Text>
        </View>
        <View style={styles.orderStat}>
          <Text style={styles.orderStatValue}>{totalItems}</Text>
          <Text style={styles.orderStatLabel}>Items</Text>
        </View>
        <View style={styles.orderStat}>
          <Text style={styles.orderStatValue}>{formatMoney(getOrderTotal(order), language)}</Text>
          <Text style={styles.orderStatLabel}>Total</Text>
        </View>
        <View style={styles.orderStat}>
          <Text style={styles.orderStatValue}>{progress}%</Text>
          <Text style={styles.orderStatLabel}>Goal</Text>
        </View>
      </View>

      <ProgressBar progress={progress} accent={store.accent} />
      <StatusRail status={order.status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 60, gap: 16 },
  heroCard: {
    backgroundColor: colors.navy,
    padding: 24,
    paddingTop: 56,
    gap: 12,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storeBadge: {
    backgroundColor: colors.acc,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  storeBadgeText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.white,
  },
  switchBtn: {
    borderWidth: 1,
    borderColor: 'rgba(250,246,239,0.2)',
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  switchBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: 'rgba(250,246,239,0.72)',
  },
  heroHub: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    color: colors.white,
    lineHeight: 32,
  },
  heroSub: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: 'rgba(250,246,239,0.6)',
  },
  heroMetrics: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 16,
    marginTop: 8,
  },
  heroMetric: { flex: 1, alignItems: 'center', gap: 4 },
  heroMetricDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 2,
  },
  heroMetricValue: {
    fontFamily: fontFamily.display,
    fontSize: 18,
    color: colors.white,
  },
  heroMetricLabel: {
    fontFamily: fontFamily.body,
    fontSize: 10,
    color: 'rgba(250,246,239,0.6)',
    textAlign: 'center',
  },
  storeTabRow: {
    paddingHorizontal: 18,
    gap: 8,
  },
  storeTab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.white,
  },
  storeTabActive: {
    backgroundColor: colors.tx,
    borderColor: colors.tx,
  },
  storeTabText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.mu,
  },
  storeTabTextActive: { color: colors.white },
  chartCard: {
    marginHorizontal: 18,
    backgroundColor: colors.white,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.br,
    padding: 20,
    ...shadow.card,
  },
  chartTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.mu,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  chartBars: {
    flexDirection: 'row',
    gap: 8,
    height: 100,
    alignItems: 'flex-end',
  },
  chartBarCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBarValue: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    color: colors.tx,
  },
  chartBarTrack: {
    width: '100%',
    height: 64,
    backgroundColor: colors.s2,
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: colors.acc,
    borderRadius: 8,
  },
  chartBarLabel: {
    fontFamily: fontFamily.body,
    fontSize: 9,
    color: colors.mu2,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 18,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.br,
    padding: 16,
    gap: 4,
    ...shadow.card,
  },
  statCardHighlight: {
    backgroundColor: colors.acc,
    borderColor: colors.acc,
  },
  statValue: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    color: colors.tx,
  },
  statLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.mu,
    textTransform: 'uppercase',
  },
  statValueHighlight: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    color: colors.white,
  },
  statLabelHighlight: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    color: 'rgba(250,246,239,0.8)',
    textTransform: 'uppercase',
  },
  queueSection: {
    paddingHorizontal: 18,
    gap: 12,
  },
  queueTitle: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.tx,
  },
  searchInput: {
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.white,
    color: colors.tx,
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    paddingHorizontal: 14,
  },
  filterRow: { gap: 8, paddingVertical: 2 },
  filterChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  filterChipText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: colors.mu,
  },
  filterChipTextActive: { color: colors.white },
  emptyCard: {
    marginHorizontal: 18,
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.br,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fontFamily.display,
    fontSize: 18,
    color: colors.tx,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.mu,
    textAlign: 'center',
    lineHeight: 20,
  },
  orderList: {
    paddingHorizontal: 18,
    gap: 12,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.br,
    padding: 18,
    gap: 14,
    ...shadow.card,
  },
  orderCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderCardMeta: { flex: 1 },
  orderCardId: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    color: colors.tx,
  },
  orderCardSub: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mu,
    marginTop: 2,
  },
  priorityChip: {
    backgroundColor: colors.s2,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priorityChipHot: {
    backgroundColor: colors.accLight,
  },
  priorityChipText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    color: colors.mu,
  },
  priorityChipTextHot: {
    color: colors.acc,
  },
  orderCardStats: {
    flexDirection: 'row',
    gap: 8,
  },
  orderStat: {
    flex: 1,
    backgroundColor: colors.s1,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 2,
  },
  orderStatValue: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    color: colors.tx,
  },
  orderStatLabel: {
    fontFamily: fontFamily.body,
    fontSize: 10,
    color: colors.mu,
  },
});
