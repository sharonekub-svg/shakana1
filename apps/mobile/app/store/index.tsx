import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BrandPill,
  Card,
  CelebrationBanner,
  DemoButton,
  DemoPage,
  EmptyNotice,
  ProgressBar,
  SavingsTracker,
  SectionTitle,
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
import { colors } from '@/theme/tokens';

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

export default function StoreDashboardScreen() {
  const router = useRouter();
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

  const selectedStoreName = storeFilter === 'all' ? 'All stores' : demoStores[storeFilter].name;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <DemoPage wide>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.logo}>Agent M</Text>
            <Text style={styles.title}>Merchant dashboard</Text>
            <Text style={styles.muted}>Choose Zara, Amazon, or H&M, then track only that store's orders and items.</Text>
          </View>
          <View style={styles.topActions}>
            <DemoButton label="User view" onPress={() => router.push('/user')} tone="light" style={styles.smallBtn} />
            <DemoButton label="Login" onPress={() => router.push('/login')} tone="light" style={styles.smallBtn} />
          </View>
        </View>

        <CelebrationBanner pulse={lastPulse} />

        <View style={styles.storeSwitcher}>
          {STORE_FILTERS.map((brand) => (
            <StoreFilterCard
              key={brand}
              brand={brand}
              orders={brand === 'all' ? merchantOrders : merchantOrders.filter((order) => order.brand === brand)}
              active={storeFilter === brand}
              onPress={() => setStoreFilter(brand)}
            />
          ))}
        </View>

        <View style={styles.metricsGrid}>
          <Metric label="Needs action" value={String(readyToProcess)} highlight />
          <Metric label="Open orders" value={String(activeOrders.length)} />
          <Metric label="Items to pick" value={String(itemsToPick)} />
          <Metric label="Total GMV" value={`₪${totalGmv}`} />
          <Metric label="Group savings" value={`₪${totalSavings}`} />
        </View>

        <View style={styles.queueHeader}>
          <SectionTitle title={`${selectedStoreName} order queue`} kicker="Store-specific work queue" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search order, code, brand, or address"
            style={styles.searchInput}
            accessibilityLabel="Search merchant orders"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              active={filter === option.value}
              onPress={() => setFilter(option.value)}
            />
          ))}
        </ScrollView>

        {merchantOrders.length === 0 ? (
          <EmptyNotice
            title="No group orders yet"
            body="Open the user demo, choose Amazon, H&M, or Zara, and create a group order. It will appear here instantly."
          />
        ) : visibleStoreOrders.length === 0 ? (
          <EmptyNotice
            title={`No ${selectedStoreName} orders yet`}
            body="Choose another store, or create a new group order from the user side for this merchant."
          />
        ) : filteredOrders.length === 0 ? (
          <EmptyNotice
            title="No orders match this view"
            body="Clear the search or switch filters to see the rest of the merchant queue."
          />
        ) : (
          <View style={styles.orderList}>
            {filteredOrders.map((order) => (
              <OrderQueueCard
                key={order.id}
                order={order}
                nowMs={nowMs}
                onOpen={() => router.push(`/store/orders/${order.id}`)}
                onTimerEnd={() => setNowMs(Date.now())}
              />
            ))}
          </View>
        )}

        <SavingsTracker orders={visibleStoreOrders} activeParticipantId={activeParticipantId} />
      </DemoPage>
    </ScrollView>
  );
}

function StoreFilterCard({
  brand,
  orders,
  active,
  onPress,
}: {
  brand: StoreFilter;
  orders: DemoOrder[];
  active: boolean;
  onPress: () => void;
}) {
  const label = brand === 'all' ? 'All stores' : demoStores[brand].name;
  const accent = brand === 'all' ? colors.acc : demoStores[brand].accent;
  const openOrders = orders.filter((order) => order.status !== 'shipped');
  const totalItems = orders.reduce((total, order) => total + getOrderItemCount(order), 0);
  const totalValue = orders.reduce((total, order) => total + getOrderTotal(order), 0);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.storeFilterCard,
        active && styles.storeFilterCardActive,
        { borderColor: active ? accent : colors.br },
        pressed && demoStyles.pressed,
      ]}
    >
      <View style={styles.storeFilterTop}>
        {brand === 'all' ? <Text style={styles.storeFilterLogo}>ALL</Text> : <BrandPill brand={brand} />}
        <Text style={[styles.storeFilterStatus, active && { color: accent }]}>
          {active ? 'Selected' : 'Open'}
        </Text>
      </View>
      <Text style={styles.storeFilterTitle}>{label}</Text>
      <Text style={styles.muted}>{openOrders.length} open orders</Text>
      <View style={styles.storeFilterStats}>
        <Stat label="Items" value={String(totalItems)} />
        <Stat label="Value" value={`ג‚×${totalValue}`} />
      </View>
    </Pressable>
  );
}

function OrderQueueCard({
  order,
  nowMs,
  onOpen,
  onTimerEnd,
}: {
  order: DemoOrder;
  nowMs: number;
  onOpen: () => void;
  onTimerEnd?: () => void;
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
      <View style={styles.orderHeader}>
        <View style={styles.brandHeader}>
          <BrandPill brand={order.brand} />
          <View style={styles.orderIdentity}>
            <View style={styles.inlineRow}>
              <Text style={styles.orderId}>{order.id}</Text>
              <Text style={[styles.priorityBadge, priority.tone === 'hot' && styles.priorityHot]}>
                {priority.label}
              </Text>
            </View>
            <Text style={styles.muted}>
              {store.name} | Code {order.inviteCode} | {minutesLeft > 0 ? `${minutesLeft} min left` : 'timer ended'}
            </Text>
          </View>
        </View>
        <View style={styles.orderHeaderRight}>
          <SelfUpdatingTimerRing
            closesAt={order.closesAt}
            createdAt={order.createdAt}
            onTimerEnd={onTimerEnd}
            label="left"
          />
          <Text style={[styles.statusBadge, { borderColor: store.accent }]}>{merchantState}</Text>
        </View>
      </View>

      <View style={styles.fulfillmentStrip}>
        <View>
          <Text style={styles.fulfillmentTitle}>
            {totalItems > 0 ? `${totalItems} units ready for picking` : 'Waiting for cart items'}
          </Text>
          <Text style={styles.muted}>{order.deliveryAddress || 'Delivery address not added yet'}</Text>
        </View>
        <Text style={styles.openText}>Open order</Text>
      </View>

      <View style={styles.orderStats}>
        <Stat label="Participants" value={String(order.participants.length)} />
        <Stat label="Items" value={String(totalItems)} />
        <Stat label="Total" value={`₪${getOrderTotal(order)}`} />
        <Stat label="Goal" value={`${progress}%`} />
      </View>

      <ProgressBar progress={progress} accent={store.accent} />
      <Text style={styles.muted}>
        ₪{getOrderTotal(order)} / ₪{FREE_SHIPPING_GOAL} toward free shipping. Group saved ₪{Math.round(getGroupSavings(order))}.
      </Text>
      <StatusRail status={order.status} />
    </Pressable>
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

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && demoStyles.pressed]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Metric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card style={highlight ? styles.metricHighlighted : styles.metric}>
      <Text style={[styles.metricValue, highlight && styles.metricValueHighlighted]}>{value}</Text>
      <Text style={[styles.muted, highlight && styles.metricLabelHighlighted]}>{label}</Text>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  topActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  smallBtn: { flexGrow: 1, flexBasis: 132, minHeight: 40 },
  logo: {
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  title: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 32,
    lineHeight: 36,
  },
  storeSwitcher: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  storeFilterCard: {
    flexGrow: 1,
    flexBasis: 210,
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.white,
    padding: 14,
  },
  storeFilterCardActive: {
    backgroundColor: colors.s2,
  },
  storeFilterTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  storeFilterLogo: {
    overflow: 'hidden',
    borderRadius: 6,
    backgroundColor: colors.tx,
    color: '#FFFFFF',
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  storeFilterStatus: {
    color: colors.mu,
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
  },
  storeFilterTitle: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 24,
  },
  storeFilterStats: {
    flexDirection: 'row',
    gap: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metric: {
    flexGrow: 1,
    flexBasis: 145,
  },
  metricHighlighted: {
    flexGrow: 1,
    flexBasis: 145,
    backgroundColor: colors.acc,
    borderColor: colors.acc,
  },
  metricValue: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 28,
  },
  metricValueHighlighted: {
    color: '#FFFFFF',
    fontSize: 34,
  },
  metricLabelHighlighted: {
    color: 'rgba(255,255,255,0.72)',
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  searchInput: {
    flexGrow: 1,
    flexBasis: 240,
    maxWidth: 520,
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brBr,
    backgroundColor: colors.white,
    color: colors.tx,
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    paddingHorizontal: 14,
  },
  filterRow: { gap: 8, paddingVertical: 4 },
  filterChip: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChipActive: {
    backgroundColor: colors.tx,
    borderColor: colors.tx,
  },
  filterChipText: {
    color: colors.mu,
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
  },
  filterChipTextActive: { color: '#FFFFFF' },
  orderList: { gap: 12 },
  orderCard: {
    gap: 14,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.white,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  brandHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 },
  orderIdentity: { flex: 1, minWidth: 210 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  orderHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  orderId: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 18 },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
  },
  priorityBadge: {
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: colors.s2,
    color: colors.mu,
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  priorityHot: {
    backgroundColor: colors.goldLight,
    color: colors.acc,
  },
  fulfillmentStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
    borderRadius: 8,
    backgroundColor: colors.s2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fulfillmentTitle: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 14 },
  openText: { color: colors.acc, fontFamily: fontFamily.bodyBold, fontSize: 13 },
  orderStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    flexGrow: 1,
    flexBasis: 100,
    borderRadius: 8,
    backgroundColor: colors.s2,
    padding: 12,
  },
  statValue: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 20 },
  statLabel: { color: colors.mu, fontFamily: fontFamily.body, fontSize: 12 },
  muted: { color: colors.mu, fontFamily: fontFamily.body, fontSize: 14, lineHeight: 21 },
});
