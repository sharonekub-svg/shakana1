import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDemoStore, calcTotals } from '@/demo/store';
import { getProduct, BRAND_META } from '@/demo/products';
import type { OrderStatus } from '@/demo/types';
import { StatusPill } from '../index';

const NEXT: Record<OrderStatus, OrderStatus | null> = {
  open: 'submitted',
  submitted: 'accepted',
  accepted: 'packing',
  packing: 'ready',
  ready: 'shipped',
  shipped: null,
};

const ACTION_LABEL: Record<OrderStatus, string> = {
  open: 'Submit',
  submitted: 'Accept order',
  accepted: 'Mark as Packing',
  packing: 'Mark as Ready',
  ready: 'Mark as Shipped',
  shipped: 'Done',
};

export default function OrderDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId: string | string[] }>();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const order = useDemoStore((s) => s.orders[orderId ?? '']);
  const setStatus = useDemoStore((s) => s.setStatus);

  const totals = useMemo(() => order ? calcTotals(order, (pid) => getProduct(pid)?.price ?? 0) : null, [order]);

  if (!order || !totals) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyTitle}>Order not found</Text>
        <Pressable onPress={() => router.replace('/store')} style={s.btnDark}><Text style={s.btnDarkTxt}>Back to dashboard</Text></Pressable>
      </View>
    );
  }

  const meta = BRAND_META[order.brand];
  const next = NEXT[order.status];

  // Master picking list (qty x product+variant), aggregated
  const picking = useMemo(() => {
    const map = new Map<string, { product: ReturnType<typeof getProduct>; size: string; color: string; qty: number }>();
    for (const it of order.items) {
      const p = getProduct(it.productId);
      if (!p) continue;
      const k = `${p.id}|${it.size}|${it.color}`;
      const ex = map.get(k);
      if (ex) ex.qty += it.qty;
      else map.set(k, { product: p, size: it.size, color: it.color, qty: it.qty });
    }
    return Array.from(map.values());
  }, [order.items]);

  return (
    <ScrollView style={s.wrap} contentContainerStyle={s.content}>
      <Pressable onPress={() => router.replace('/store')} style={s.backBtn}><Text style={s.backTxt}>← Dashboard</Text></Pressable>

      <View style={s.head}>
        <View style={[s.brandBadge, { backgroundColor: meta.accent }]}><Text style={s.brandBadgeTxt}>{meta.logo}</Text></View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <Text style={s.h1}>Order #{order.id.slice(-6).toUpperCase()}</Text>
            <StatusPill status={order.status} />
          </View>
          <Text style={s.h1Sub}>{order.storeName} · {order.participants.length} customers · {totals.totalCount} items · ₪{totals.itemsTotal.toFixed(0)}</Text>
        </View>
      </View>

      {/* Status actions */}
      <View style={s.statusCard}>
        <Text style={s.cardTitle}>Order workflow</Text>
        <View style={s.statusBtns}>
          {(['accepted', 'packing', 'ready', 'shipped'] as OrderStatus[]).map((st) => {
            const active = order.status === st;
            return (
              <Pressable
                key={st}
                onPress={() => setStatus(order.id, st)}
                style={[s.statusBtn, active && s.statusBtnActive]}
              >
                <Text style={[s.statusBtnTxt, active && { color: '#fff' }]}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
              </Pressable>
            );
          })}
        </View>
        {next && order.status !== 'shipped' && (
          <Pressable onPress={() => setStatus(order.id, next)} style={s.primaryBtn}>
            <Text style={s.primaryBtnTxt}>{ACTION_LABEL[order.status]} →</Text>
          </Pressable>
        )}
        {order.status === 'shipped' && (
          <View style={[s.statusBox, { backgroundColor: '#E8F5EA', borderColor: '#BFE0C5' }]}>
            <Text style={{ color: '#1F5A2A', fontWeight: '800' }}>Order shipped 🚚 — customer notified.</Text>
          </View>
        )}
      </View>

      {/* Master picking list */}
      <View style={s.card}>
        <Text style={s.cardTitle}>📦 Master picking list ({picking.length} SKUs · {picking.reduce((s, p) => s + p.qty, 0)} units)</Text>
        <View style={{ gap: 8, marginTop: 8 }}>
          {picking.map((p, i) => (
            <View key={i} style={s.pickRow}>
              {p.product ? <Image source={{ uri: p.product.image }} style={s.pickImg} /> : null}
              <View style={{ flex: 1 }}>
                <Text style={s.pickName}>{p.qty}× {p.product?.name}</Text>
                <Text style={s.pickMeta}>SKU {p.product?.sku} · Size {p.size} · Color {p.color}</Text>
              </View>
              <Text style={s.pickQty}>×{p.qty}</Text>
            </View>
          ))}
          {picking.length === 0 && <Text style={{ color: '#707070', fontSize: 13 }}>No items in this order yet.</Text>}
        </View>
      </View>

      {/* User breakdown */}
      <View style={s.card}>
        <Text style={s.cardTitle}>👥 User breakdown</Text>
        <View style={{ gap: 10, marginTop: 8 }}>
          {order.participants.map((p) => {
            const items = order.items.filter((it) => it.userId === p.id);
            const total = items.reduce((sum, it) => sum + (getProduct(it.productId)?.price ?? 0) * it.qty, 0);
            return (
              <View key={p.id} style={s.userBlock}>
                <View style={s.userHead}>
                  <Text style={s.userName}>{p.avatar} {p.name}{p.id === order.ownerId ? ' · host' : ''}</Text>
                  <Text style={s.userTotal}>₪{total.toFixed(0)}</Text>
                </View>
                {items.length === 0 ? (
                  <Text style={s.userEmpty}>No items added</Text>
                ) : (
                  <View style={{ gap: 4 }}>
                    {items.map((it) => {
                      const prod = getProduct(it.productId);
                      return (
                        <Text key={it.id} style={s.userItem}>
                          • {it.qty}× {prod?.name} — Size {it.size}, {it.color}{it.isPrivate ? ' 🔒 (private from peers)' : ''}
                        </Text>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Totals */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Totals</Text>
        <View style={s.totalRow}><Text style={s.totalLbl}>Items</Text><Text style={s.totalVal}>₪{totals.itemsTotal.toFixed(0)}</Text></View>
        <View style={s.totalRow}><Text style={s.totalLbl}>Delivery</Text><Text style={s.totalVal}>₪{order.totalDeliveryFee.toFixed(0)}</Text></View>
        <View style={[s.totalRow, { borderTopWidth: 1, borderColor: '#EDE9DD', paddingTop: 8, marginTop: 4 }]}>
          <Text style={[s.totalLbl, { fontWeight: '800', color: '#171717' }]}>Grand total</Text>
          <Text style={[s.totalVal, { fontWeight: '900' }]}>₪{totals.grandTotal.toFixed(0)}</Text>
        </View>
        <Text style={{ fontSize: 12, color: '#707070', marginTop: 6 }}>Group saved customers ₪{totals.totalGroupSavings.toFixed(0)} on shared delivery.</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F4F2EC' },
  content: { padding: 24, paddingBottom: 60, gap: 14, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 14, backgroundColor: '#F4F2EC' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#171717' },
  backBtn: { alignSelf: 'flex-start', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#E5E1D8' },
  backTxt: { fontSize: 12, fontWeight: '700', color: '#171717' },
  head: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#EDE9DD' },
  brandBadge: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandBadgeTxt: { color: '#fff', fontWeight: '900', fontSize: 14 },
  h1: { fontSize: 18, fontWeight: '900', color: '#171717' },
  h1Sub: { fontSize: 12, color: '#707070', marginTop: 2 },
  statusCard: { backgroundColor: '#fff', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#EDE9DD', gap: 12 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#171717' },
  statusBtns: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#E5E1D8', backgroundColor: '#fff' },
  statusBtnActive: { backgroundColor: '#171717', borderColor: '#171717' },
  statusBtnTxt: { fontSize: 12, fontWeight: '700', color: '#171717' },
  primaryBtn: { backgroundColor: '#171717', paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
  primaryBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  statusBox: { padding: 12, borderRadius: 12, borderWidth: 1 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#EDE9DD' },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: '#FAFAF7', borderRadius: 12 },
  pickImg: { width: 44, height: 44, borderRadius: 8 } as any,
  pickName: { fontSize: 14, fontWeight: '800', color: '#171717' },
  pickMeta: { fontSize: 11, color: '#707070', marginTop: 2 },
  pickQty: { fontSize: 16, fontWeight: '900', color: '#171717' },
  userBlock: { padding: 12, backgroundColor: '#FAFAF7', borderRadius: 14, gap: 6 },
  userHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userName: { fontSize: 14, fontWeight: '800', color: '#171717' },
  userTotal: { fontSize: 14, fontWeight: '800', color: '#171717' },
  userItem: { fontSize: 12, color: '#404040', lineHeight: 18 },
  userEmpty: { fontSize: 12, color: '#A5A19A', fontStyle: 'italic' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLbl: { fontSize: 13, color: '#707070' },
  totalVal: { fontSize: 14, fontWeight: '700', color: '#171717' },
  btnDark: { backgroundColor: '#171717', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999 },
  btnDarkTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
