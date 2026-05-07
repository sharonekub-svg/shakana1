import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BrandPill,
  Card,
  CelebrationBanner,
  DemoButton,
  DemoPage,
  EmptyNotice,
  SavingsPanel,
  SavingsTracker,
  SectionTitle,
  SelfUpdatingTimerRing,
  StatusRail,
} from '@/components/demo/DemoPrimitives';
import { demoStores } from '@/demo/catalog';
import {
  getMerchantOrderState,
  getMasterPickingList,
  getOrderItemCount,
  getOrderTotal,
  getProductLine,
  initDemoCommerceSync,
  useDemoCommerceStore,
  type OrderStatus,
} from '@/stores/demoCommerceStore';
import { fontFamily } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

export default function StoreOrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const orders = useDemoCommerceStore((state) => state.orders);
  const updateStatus = useDemoCommerceStore((state) => state.updateStatus);
  const demoMode = useDemoCommerceStore((state) => state.demoMode);
  const setDemoRole = useDemoCommerceStore((state) => state.setDemoRole);
  const lastPulse = useDemoCommerceStore((state) => state.lastPulse);
  const activeParticipantId = useDemoCommerceStore((state) => state.activeParticipantId);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    initDemoCommerceSync();
    if (demoMode) setDemoRole('store');
  }, [demoMode, setDemoRole]);

  const order = orders.find((candidate) => candidate.id === params.orderId);

  if (!order) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <DemoPage wide>
          <DemoButton label="Back to dashboard" onPress={() => router.replace('/store')} tone="light" style={styles.backBtn} />
          <EmptyNotice
            title="Order not found"
            body="The group order may have been reset. Return to the dashboard or create a new user order."
          />
        </DemoPage>
      </ScrollView>
    );
  }

  const store = demoStores[order.brand];
  const pickingList = getMasterPickingList(order);
  const statuses: OrderStatus[] = ['accepted', 'packing', 'ready', 'shipped'];
  const statusLabels: Record<OrderStatus, string> = {
    collecting: 'Collecting',
    accepted: 'Accepted',
    packing: 'Packing',
    ready: 'Ready',
    shipped: 'Shipped',
  };
  const merchantState = getMerchantOrderState(order, nowMs);
  const nextStep =
    order.status === 'collecting'
      ? 'Accept the order when the cart closes or once there are items ready to process.'
      : order.status === 'accepted'
        ? 'Start packing from the master picking list.'
        : order.status === 'packing'
          ? 'Mark ready when every line is packed.'
          : order.status === 'ready'
            ? 'Ship the package to the delivery address.'
            : 'This order has been shipped.';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <DemoPage wide>
        <View style={styles.topBar}>
          <View style={styles.brandHeader}>
            <BrandPill brand={order.brand} />
            <View>
              <Text style={styles.title}>{order.id}</Text>
              <Text style={styles.muted}>{store.name} consolidated group order</Text>
            </View>
          </View>
          <View style={styles.topActions}>
            <DemoButton label="Dashboard" onPress={() => router.push('/store')} tone="light" style={styles.backBtn} />
            <DemoButton label="User view" onPress={() => router.push('/user')} tone="light" style={styles.backBtn} />
          </View>
        </View>

        <CelebrationBanner pulse={lastPulse} />

        <Card style={styles.summary}>
          <View style={styles.summaryTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.panelLabel}>Current operation</Text>
              <Text style={styles.operationTitle}>{merchantState}</Text>
              <Text style={styles.muted}>{nextStep}</Text>
            </View>
            <SelfUpdatingTimerRing
              closesAt={order.closesAt}
              createdAt={order.createdAt}
              onTimerEnd={() => setNowMs(Date.now())}
              label="left"
            />
          </View>

          <View style={styles.summaryGrid}>
            <Metric label="Status" value={merchantState} />
            <Metric label="Participants" value={String(order.participants.length)} />
            <Metric label="Total items" value={String(getOrderItemCount(order))} />
            <Metric label="Total price" value={`₪${getOrderTotal(order)}`} />
            <Metric label="Delivery" value={order.deliveryAddress ? 'Address ready' : 'Missing'} />
          </View>

          <View style={styles.deliveryBox}>
            <Text style={styles.itemName}>Delivery address</Text>
            <Text style={styles.muted}>{order.deliveryAddress || 'No delivery address added yet.'}</Text>
          </View>

          <StatusRail status={order.status} />
          <Text style={styles.muted}>{order.lastEvent}</Text>
        </Card>

        <Card style={styles.actionPanel}>
          <View>
            <Text style={styles.panelLabel}>Status actions</Text>
            <Text style={styles.muted}>These changes update the user cart instantly.</Text>
          </View>
          <View style={styles.actions}>
            {statuses.map((status) => (
              <DemoButton
                key={status}
                label={status === 'accepted' ? 'Accept Order' : `Mark ${statusLabels[status]}`}
                onPress={() => updateStatus(order.id, status)}
                tone={order.status === status ? 'accent' : 'light'}
                style={styles.statusButton}
              />
            ))}
          </View>
        </Card>

        <View style={styles.grid}>
          <View style={styles.left}>
            <SectionTitle title="Master picking list" kicker="Pick these exact items first" />
            <Card style={styles.listCard}>
              {pickingList.length === 0 ? (
                <Text style={styles.muted}>No items yet. This list updates live as users add exact sizes and colors.</Text>
              ) : (
                pickingList.map(({ product, item, quantity }) => (
                  <View key={`${product.id}-${item.size}-${item.color}`} style={styles.pickRow}>
                    <Image source={{ uri: product.image }} style={styles.pickImage} resizeMode="cover" />
                    <View style={styles.qtyBadge}>
                      <Text style={styles.qtyBadgeText}>{quantity}x</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{product.name}</Text>
                      <Text style={styles.muted}>Size {item.size} | {item.color} | {product.sku} | {product.stockStatus}</Text>
                      <Text style={styles.pickMeta}>Shelf task: pick, verify variant, place in order {order.id}</Text>
                    </View>
                  </View>
                ))
              )}
            </Card>
          </View>

          <View style={styles.right}>
            <SectionTitle title="User breakdown" kicker="Buyer-by-buyer fulfillment" />
            <Card style={styles.listCard}>
              {order.participants.map((participant) => {
                const participantItems = order.items.filter((item) => item.participantId === participant.id);
                return (
                  <View key={participant.id} style={styles.userBlock}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.userName}>{participant.name}</Text>
                      <Text style={styles.muted}>{participantItems.length} lines</Text>
                    </View>
                    {participantItems.length === 0 ? (
                      <Text style={styles.muted}>Joined, no items yet.</Text>
                    ) : (
                      participantItems.map((item) => {
                        const line = getProductLine(item);
                        return (
                          <View key={item.id} style={styles.breakdownLine}>
                            {line.product?.image ? (
                              <Image source={{ uri: line.product.image }} style={styles.breakdownImage} resizeMode="cover" />
                            ) : null}
                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemName}>{line.displayName}</Text>
                              <Text style={styles.muted}>
                                {item.quantity}x | Size {item.size} | {item.color} | ₪{line.lineTotal}
                                {item.private ? ' | Private for friends' : ''}
                              </Text>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                );
              })}
            </Card>
          </View>
        </View>

        <SavingsPanel order={order} />
        <SavingsTracker orders={orders} activeParticipantId={activeParticipantId} />
      </DemoPage>
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
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
    flexWrap: 'wrap',
    gap: 12,
  },
  brandHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  topActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  backBtn: { width: 150, minHeight: 40 },
  title: { color: colors.tx, fontFamily: fontFamily.display, fontSize: 36 },
  muted: { color: colors.mu, fontFamily: fontFamily.body, fontSize: 14, lineHeight: 21 },
  summary: { gap: 14 },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  panelLabel: {
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  operationTitle: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 34,
  },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  deliveryBox: {
    gap: 4,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.br,
    padding: 12,
  },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    flexGrow: 1,
    flexBasis: 160,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.s2,
  },
  metricValue: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 21 },
  actionPanel: { gap: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusButton: { flexGrow: 1, flexBasis: 170 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16 },
  left: { flexGrow: 1, flexBasis: 520, gap: 12 },
  right: { flexGrow: 1, flexBasis: 440, gap: 12 },
  listCard: { gap: 12 },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.br,
    paddingBottom: 12,
  },
  pickImage: {
    width: 64,
    height: 76,
    borderRadius: 8,
    backgroundColor: colors.s2,
  },
  qtyBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.tx,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBadgeText: { color: '#FFFFFF', fontFamily: fontFamily.bodyBold, fontSize: 15 },
  itemName: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 15 },
  pickMeta: { color: colors.acc, fontFamily: fontFamily.bodySemi, fontSize: 12, marginTop: 2 },
  userBlock: { gap: 8, borderBottomWidth: 1, borderBottomColor: colors.br, paddingBottom: 12 },
  userName: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 17 },
  breakdownLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.s2,
  },
  breakdownImage: {
    width: 48,
    height: 58,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
});
