import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import { demoStores, type DemoBrandId } from '@/demo/catalog';
import {
  getGoalProgress,
  getMerchantOrderState,
  getOrderItemCount,
  getOrderTotal,
  initDemoCommerceSync,
  useDemoCommerceStore,
  type DemoOrder,
  type OrderStatus,
} from '@/stores/demoCommerceStore';
import { BackBtn } from '@/components/primitives/BackBtn';
import { fontFamily } from '@/theme/fonts';
import { colors, radii, shadow } from '@/theme/tokens';
import { useLocale } from '@/i18n/locale';
import { formatMoney } from '@/utils/money';
import { formatCompactDuration } from '@/utils/timer';

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

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEK_VALUES = [6, 9, 7, 11, 18, 8, 5];
const WEEK_MAX = 18;

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

function SearchIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zm6-2.5 3.5 3.5"
        stroke="#6A5E50"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SettingsIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Line x1="2" y1="5" x2="18" y2="5" stroke="#6A5E50" strokeWidth={1.6} strokeLinecap="round" />
      <Line x1="2" y1="10" x2="18" y2="10" stroke="#6A5E50" strokeWidth={1.6} strokeLinecap="round" />
      <Line x1="2" y1="15" x2="18" y2="15" stroke="#6A5E50" strokeWidth={1.6} strokeLinecap="round" />
      <Rect x="5" y="3" width="3" height="4" rx="1.5" fill="#F4EDE3" stroke="#6A5E50" strokeWidth={1.4} />
      <Rect x="12" y="8" width="3" height="4" rx="1.5" fill="#F4EDE3" stroke="#6A5E50" strokeWidth={1.4} />
    </Svg>
  );
}

export default function StoreDashboardScreen() {
  const router = useRouter();
  const { language } = useLocale();
  const orders = useDemoCommerceStore((state) => state.orders);
  const demoMode = useDemoCommerceStore((state) => state.demoMode);
  const setDemoRole = useDemoCommerceStore((state) => state.setDemoRole);
  const activeParticipantId = useDemoCommerceStore((state) => state.activeParticipantId);
  const [nowMs, setNowMs] = useState(Date.now());
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('all');

  useEffect(() => {
    initDemoCommerceSync();
    if (demoMode) setDemoRole('store');
  }, [demoMode, setDemoRole]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const merchantOrders = useMemo(() => orders.filter(isDisplayableMerchantOrder), [orders]);
  const visibleStoreOrders = useMemo(
    () => merchantOrders.filter((order) => storeFilter === 'all' || order.brand === storeFilter),
    [merchantOrders, storeFilter],
  );
  const activeOrders = visibleStoreOrders.filter((order) => order.status !== 'shipped');
  const totalGmv = visibleStoreOrders.reduce((total, order) => total + getOrderTotal(order), 0);
  const avgGroupSize =
    merchantOrders.length > 0
      ? Math.round(
          (merchantOrders.reduce((sum, o) => sum + o.participants.length, 0) / merchantOrders.length) * 10,
        ) / 10
      : 11.2;
  const fulfillmentPct =
    visibleStoreOrders.length > 0
      ? Math.round(
          (visibleStoreOrders.filter((o) => o.status === 'shipped').length / visibleStoreOrders.length) * 100,
        )
      : 96;

  const displayOrders = activeOrders.slice(0, 5);

  const firstActiveBrand =
    activeOrders.length > 0 ? activeOrders[0]?.brand ?? null : storeFilter !== 'all' ? storeFilter : null;
  const firstStore = firstActiveBrand ? demoStores[firstActiveBrand] : null;
  const avatarLetter = firstStore ? (firstStore.name[0] ?? 'Z').toUpperCase() : 'Z';
  const hubName = firstStore
    ? `${firstStore.name.toUpperCase()} · TEL AVIV HUB`
    : 'ZARA · TEL AVIV HUB';

  const todayOrders = activeOrders.length || 38;
  const revenueDisplay = totalGmv > 0 ? formatMoney(Math.round(totalGmv), language) : '₪14,820';

  const todayDayIndex = new Date(nowMs).getDay();
  const chartCurrentIndex = todayDayIndex === 0 ? 6 : todayDayIndex - 1;

  const totalBuyers = activeOrders.reduce((sum, o) => sum + o.participants.length, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.bg}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.backRow}>
          <BackBtn fallback="/(tabs)/building" />
        </View>
        {/* Top header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{avatarLetter}</Text>
            </View>
            <View style={styles.headerMeta}>
              <Text style={styles.hubLabel}>{hubName}</Text>
              <Text style={styles.dashTitle}>Store dashboard</Text>
            </View>
          </View>
          <View style={styles.headerIcons}>
            <Pressable accessibilityRole="button" style={styles.iconBtn}>
              <SearchIcon />
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.iconBtn}>
              <SettingsIcon />
            </Pressable>
          </View>
        </View>

        {/* 2×2 Metric grid */}
        <View style={styles.metricGrid}>
          {/* Cell 1 — light cream */}
          <View style={[styles.metricCell, styles.metricCellCream]}>
            <Text style={styles.metricCellLabel}>TODAY'S GROUP ORDERS</Text>
            <Text style={styles.metricCellNumber}>{todayOrders}</Text>
            <Text style={styles.metricCellGreen}>+12 vs yesterday</Text>
          </View>

          {/* Cell 2 — dark ink */}
          <View style={[styles.metricCell, styles.metricCellInk]}>
            <Text style={styles.metricCellLabelWhite}>REVENUE</Text>
            <Text style={styles.metricCellNumberWhite}>{revenueDisplay}</Text>
            <Text style={styles.metricCellMutedWhite}>+₪2,140 this week</Text>
          </View>

          {/* Cell 3 — light cream */}
          <View style={[styles.metricCell, styles.metricCellCream]}>
            <Text style={styles.metricCellLabel}>AVG GROUP SIZE</Text>
            <Text style={styles.metricCellNumber}>{avgGroupSize}</Text>
            <Text style={styles.metricCellGreen}>+0.8</Text>
          </View>

          {/* Cell 4 — clay red */}
          <View style={[styles.metricCell, styles.metricCellClay]}>
            <Text style={styles.metricCellLabelWhite}>FULFILLMENT</Text>
            <Text style={styles.metricCellNumberWhite}>{fulfillmentPct}%</Text>
          </View>
        </View>

        {/* Chart section */}
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartSubLabel}>LAST 7 DAYS</Text>
              <Text style={styles.chartTitle}>Group orders by building</Text>
            </View>
            <View style={styles.weekToggle}>
              <Text style={styles.weekToggleText}>Week</Text>
            </View>
          </View>

          <View style={styles.chartBars}>
            {WEEK_DAYS.map((day, i) => {
              const val = WEEK_VALUES[i] ?? 0;
              const heightPct = (val / WEEK_MAX) * 100;
              const isCurrent = i === chartCurrentIndex;
              return (
                <View key={`${day}-${i}`} style={styles.chartBarCol}>
                  <View style={styles.chartBarTrack}>
                    <View
                      style={[
                        styles.chartBarFill,
                        { height: `${heightPct}%` as any },
                        isCurrent && styles.chartBarFillActive,
                      ]}
                    />
                  </View>
                  <Text style={[styles.chartBarDay, isCurrent && styles.chartBarDayActive]}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Active group orders header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ACTIVE GROUP ORDERS</Text>
          <Text style={styles.sectionMeta}>
            {activeOrders.length} open · {totalBuyers || 41} buyers
          </Text>
        </View>

        {/* Order cards */}
        {displayOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No active group orders</Text>
            <Text style={styles.emptyBody}>Create a group order from the user side — it will appear here instantly.</Text>
          </View>
        ) : (
          <View style={styles.orderList}>
            {displayOrders.map((order) => (
              <DashboardOrderCard
                key={order.id}
                order={order}
                nowMs={nowMs}
                onOpen={() => router.push(`/store/orders/${order.id}`)}
                language={language}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DashboardOrderCard({
  order,
  nowMs,
  onOpen,
  language,
}: {
  order: DemoOrder;
  nowMs: number;
  onOpen: () => void;
  language: 'he' | 'en';
}) {
  const store = demoStores[order.brand];
  if (!store) return null;

  const progress = getGoalProgress(order);
  const timeLeft = Math.max(0, order.closesAt - nowMs);
  const timerDisplay = formatCompactDuration(timeLeft);
  const totalItems = getOrderItemCount(order);
  const total = getOrderTotal(order);
  const isReady = order.status === 'ready';

  const address = order.deliveryAddress ?? 'Ben Yehuda 14';
  const addressParts = address.split(',');
  const addressMain = addressParts[0]?.trim() ?? address;
  const addressSub = `Tel Aviv · ${store.name} · Maya R. · 3B`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [styles.orderCard, pressed && styles.orderCardPressed]}
    >
      <View style={styles.orderCardTop}>
        <View style={styles.orderCardAddress}>
          <Text style={styles.orderCardAddressMain}>{addressMain}</Text>
          <Text style={styles.orderCardAddressSub}>{addressSub}</Text>
        </View>
        <View style={styles.orderCardRight}>
          {isReady && (
            <View style={styles.readyBadge}>
              <Text style={styles.readyBadgeText}>READY</Text>
            </View>
          )}
          <Text style={styles.orderCardTotal}>{formatMoney(total || 284000, language)}</Text>
        </View>
      </View>

      <View style={styles.orderCardBottom}>
        <View style={styles.orderCardStat}>
          <Text style={styles.orderCardStatIcon}>#</Text>
          <Text style={styles.orderCardStatText}>{order.participants.length || 14}</Text>
        </View>
        <View style={styles.orderCardDivider} />
        <View style={styles.orderCardStat}>
          <Text style={styles.orderCardStatText}>⏱ {timerDisplay}</Text>
        </View>
        <View style={styles.orderCardDivider} />
        <View style={styles.orderCardStat}>
          <Text style={styles.orderCardStatText}>
            {totalItems}/{order.participants.length || 14}
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4EDE3',
  },
  bg: {
    flex: 1,
    backgroundColor: '#F4EDE3',
  },
  backRow: { paddingHorizontal: 18, paddingTop: 14, alignSelf: 'flex-start' },
  content: {
    paddingBottom: 60,
    gap: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5A3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fontFamily.display,
    fontSize: 16,
    color: '#FAF6EF',
  },
  headerMeta: {
    flex: 1,
  },
  hubLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#6A5E50',
    textTransform: 'uppercase',
  },
  dashTitle: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: '#1E1812',
    lineHeight: 28,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF6EF',
    borderWidth: 1,
    borderColor: '#E1D5C4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Metric grid
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  metricCell: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 20,
    padding: 18,
    gap: 4,
    minHeight: 130,
    justifyContent: 'flex-end',
  },
  metricCellCream: {
    backgroundColor: '#FAF6EF',
    borderWidth: 1,
    borderColor: '#E1D5C4',
  },
  metricCellInk: {
    backgroundColor: '#1E1812',
  },
  metricCellClay: {
    backgroundColor: '#C5654B',
  },
  metricCellLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 9,
    letterSpacing: 1.4,
    color: '#6A5E50',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metricCellLabelWhite: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 9,
    letterSpacing: 1.4,
    color: 'rgba(250,246,239,0.7)',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metricCellNumber: {
    fontFamily: fontFamily.display,
    fontSize: 44,
    color: '#1E1812',
    lineHeight: 50,
  },
  metricCellNumberWhite: {
    fontFamily: fontFamily.display,
    fontSize: 36,
    color: '#FAF6EF',
    lineHeight: 44,
  },
  metricCellGreen: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    color: '#3A8A5C',
    marginTop: 2,
  },
  metricCellMutedWhite: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    color: 'rgba(250,246,239,0.55)',
    marginTop: 2,
  },

  // Chart
  chartSection: {
    marginHorizontal: 16,
    backgroundColor: '#FAF6EF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E1D5C4',
    padding: 18,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  chartSubLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 9,
    letterSpacing: 1.4,
    color: '#6A5E50',
    textTransform: 'uppercase',
  },
  chartTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: '#1E1812',
    marginTop: 2,
  },
  weekToggle: {
    backgroundColor: '#1E1812',
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  weekToggleText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    color: '#FAF6EF',
  },
  chartBars: {
    flexDirection: 'row',
    gap: 6,
    height: 90,
    alignItems: 'flex-end',
  },
  chartBarCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBarTrack: {
    width: '100%',
    flex: 1,
    backgroundColor: '#E1D5C4',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: '#A89B89',
    borderRadius: 6,
  },
  chartBarFillActive: {
    backgroundColor: '#C5654B',
  },
  chartBarDay: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    color: '#A89B89',
    textAlign: 'center',
  },
  chartBarDayActive: {
    color: '#C5654B',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: '#1E1812',
    textTransform: 'uppercase',
  },
  sectionMeta: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    color: '#6A5E50',
  },

  // Empty
  emptyCard: {
    marginHorizontal: 16,
    backgroundColor: '#FAF6EF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E1D5C4',
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fontFamily.display,
    fontSize: 17,
    color: '#1E1812',
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: '#6A5E50',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Order list
  orderList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#FAF6EF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E1D5C4',
    padding: 18,
    gap: 14,
  },
  orderCardPressed: {
    opacity: 0.85,
  },
  orderCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  orderCardAddress: {
    flex: 1,
    gap: 3,
  },
  orderCardAddressMain: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    color: '#1E1812',
  },
  orderCardAddressSub: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: '#6A5E50',
  },
  orderCardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  readyBadge: {
    backgroundColor: '#2F7A50',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  readyBadgeText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    color: '#FAF6EF',
    textTransform: 'uppercase',
  },
  orderCardTotal: {
    fontFamily: fontFamily.display,
    fontSize: 17,
    color: '#1E1812',
  },
  orderCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orderCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderCardStatIcon: {
    fontSize: 13,
  },
  orderCardStatText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: '#6A5E50',
  },
  orderCardDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E1D5C4',
    marginHorizontal: 2,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E1D5C4',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#C5654B',
    borderRadius: 4,
  },
});
