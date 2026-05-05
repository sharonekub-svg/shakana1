import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDemoStore, calcTotals, DEMO_USER_META } from '@/demo/store';
import { getProduct, BRAND_META } from '@/demo/products';
import type { DemoUserId, OrderStatus } from '@/demo/types';

const STATUS_FLOW: { key: OrderStatus; label: string }[] = [
  { key: 'submitted', label: 'Sent to store' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'packing', label: 'Packing' },
  { key: 'ready', label: 'Ready' },
  { key: 'shipped', label: 'Shipped' },
];

export default function GroupOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const order = useDemoStore((s) => s.orders[id ?? '']);
  const activeUser = useDemoStore((s) => s.activeUser);
  const setActiveUser = useDemoStore((s) => s.setActiveUser);
  const joinAs = useDemoStore((s) => s.joinAs);
  const removeItem = useDemoStore((s) => s.removeItem);
  const togglePrivate = useDemoStore((s) => s.togglePrivate);
  const setStatus = useDemoStore((s) => s.setStatus);

  const totals = useMemo(() => order ? calcTotals(order, (pid) => getProduct(pid)?.price ?? 0) : null, [order]);

  if (!order || !totals) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyTitle}>Order not found</Text>
        <Pressable onPress={() => router.replace('/user')} style={s.btnDark}><Text style={s.btnDarkTxt}>Back to stores</Text></Pressable>
      </View>
    );
  }

  const meta = BRAND_META[order.brand];
  const inviteUrl = (Platform.OS === 'web' && typeof window !== 'undefined') ? `${window.location.origin}/user/group/${order.id}` : `https://shakana.demo/join/${order.id}`;
  const inviteMsg = `🚀 ${DEMO_USER_META[order.ownerId as DemoUserId]?.name ?? 'Sharone'} is ordering from ${order.storeName}! 15 mins left to join and save on delivery. Join here: ${inviteUrl} Code: ${order.joinCode}`;

  const isParticipant = order.participants.some((p) => p.id === activeUser);
  const flowIdx = STATUS_FLOW.findIndex((s) => s.key === order.status);

  function copyInvite() {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(inviteMsg).catch(() => {});
    }
  }

  const safeOrder = order;
  function submitToStore() {
    if (safeOrder.items.length === 0) return;
    setStatus(safeOrder.id, 'submitted');
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F6F4EE' }} contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 14 }}>
      <View style={s.topbar}>
        <Pressable onPress={() => router.replace(`/user/store/${order.brand}`)} style={s.backBtn}><Text style={s.backTxt}>← Keep shopping</Text></Pressable>
        <View style={[s.brandPill, { backgroundColor: meta.accent }]}><Text style={s.brandPillTxt}>{meta.logo}</Text></View>
      </View>

      <View style={s.heroCard}>
        <Text style={s.heroTitle}>Group order · {order.storeName}</Text>
        <Text style={s.heroMeta}>{order.participants.length} joined • {totals.totalCount} items • ₪{totals.itemsTotal}</Text>

        <View style={s.statusTrack}>
          {STATUS_FLOW.map((st, i) => {
            const reached = order.status !== 'open' && i <= flowIdx;
            const current = order.status === st.key;
            return (
              <View key={st.key} style={s.stepWrap}>
                <View style={[s.stepDot, reached && s.stepDotOn, current && s.stepDotCurrent]} />
                <Text style={[s.stepTxt, reached && { color: '#171717', fontWeight: '700' }]}>{st.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Savings card */}
      <View style={s.savingsCard}>
        <Text style={s.savingsTitle}>💰 You're saving with friends</Text>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${Math.round(totals.goalProgress * 100)}%` }]} />
        </View>
        <Text style={s.progressTxt}>
          {totals.remainingToGoal === 0
            ? '🎉 Free shipping unlocked!'
            : `Only ₪${totals.remainingToGoal.toFixed(0)} left to unlock free shipping`}
        </Text>
        <View style={s.savingsRow}>
          <View style={s.savingsCell}><Text style={s.savingsLbl}>Your delivery</Text><Text style={s.savingsVal}>₪{totals.sharedDeliveryPerUser.toFixed(0)} <Text style={s.strike}>₪{order.individualDeliveryFee}</Text></Text></View>
          <View style={s.savingsCell}><Text style={s.savingsLbl}>You saved</Text><Text style={[s.savingsVal, { color: '#3F8F4D' }]}>₪{totals.personalSavings.toFixed(0)}</Text></View>
          <View style={s.savingsCell}><Text style={s.savingsLbl}>Group saved</Text><Text style={[s.savingsVal, { color: '#3F8F4D' }]}>₪{totals.totalGroupSavings.toFixed(0)}</Text></View>
        </View>
      </View>

      {/* Invite */}
      <View style={s.inviteCard}>
        <Text style={s.sectionTitle}>Share with friends</Text>
        <View style={s.codeRow}>
          <View style={s.codeBox}><Text style={s.codeLbl}>Join code</Text><Text style={s.codeVal}>{order.joinCode}</Text></View>
          <Pressable onPress={copyInvite} style={s.copyBtn}><Text style={s.copyTxt}>Copy invite</Text></Pressable>
        </View>
        <Text style={s.inviteMsg} numberOfLines={3}>{inviteMsg}</Text>
        <View style={s.simRow}>
          <Text style={s.simLbl}>Simulate friend join:</Text>
          {(['B', 'C'] as const).map((u) => {
            const already = order.participants.some((p) => p.id === u);
            return (
              <Pressable
                key={u}
                onPress={() => { joinAs(order.id, u); setActiveUser(u); }}
                style={[s.simBtn, already && { backgroundColor: '#EDE9DD' }]}
                disabled={already}
              >
                <Text style={s.simTxt}>{already ? `✓ ${DEMO_USER_META[u].name}` : `+ ${DEMO_USER_META[u].name}`}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Participants */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Participants ({order.participants.length})</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          {order.participants.map((p) => (
            <Pressable key={p.id} onPress={() => setActiveUser(p.id as DemoUserId)} style={[s.partChip, activeUser === p.id && s.partChipActive]}>
              <Text style={[s.partTxt, activeUser === p.id && { color: '#fff' }]}>{p.avatar} {p.name}{p.id === order.ownerId ? ' · host' : ''}{activeUser === p.id ? ' · you' : ''}</Text>
            </Pressable>
          ))}
        </View>
        {!isParticipant && (
          <Pressable onPress={() => joinAs(order.id, activeUser)} style={[s.btnDark, { marginTop: 10 }]}>
            <Text style={s.btnDarkTxt}>Join this order as {DEMO_USER_META[activeUser].name}</Text>
          </Pressable>
        )}
      </View>

      {/* Items */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Cart ({order.items.length})</Text>
        {order.items.length === 0 ? (
          <Pressable onPress={() => router.push(`/user/store/${order.brand}`)} style={[s.btnDark, { marginTop: 10 }]}>
            <Text style={s.btnDarkTxt}>Add your first product</Text>
          </Pressable>
        ) : (
          <View style={{ gap: 10, marginTop: 6 }}>
            {order.items.map((it) => {
              const product = getProduct(it.productId);
              if (!product) return null;
              const isMine = it.userId === activeUser;
              const visible = !it.isPrivate || isMine;
              const buyer = order.participants.find((p) => p.id === it.userId);
              return (
                <View key={it.id} style={s.itemRow}>
                  {visible ? (
                    <Image source={{ uri: product.image }} style={s.itemImg} />
                  ) : (
                    <View style={[s.itemImg, { backgroundColor: '#EDE9DD', alignItems: 'center', justifyContent: 'center' }]}><Text style={{ fontSize: 22 }}>🎁</Text></View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName}>{visible ? product.name : 'Private item'}</Text>
                    {visible ? (
                      <Text style={s.itemMeta}>{it.color} · {it.size} · ×{it.qty}</Text>
                    ) : (
                      <Text style={s.itemMeta}>Hidden by {buyer?.name ?? 'buyer'}</Text>
                    )}
                    <Text style={s.itemBuyer}>{buyer?.avatar} {buyer?.name}{it.isPrivate ? ' · private' : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={s.itemPrice}>₪{product.price * it.qty}</Text>
                    {isMine && (
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <Pressable onPress={() => togglePrivate(order.id, it.id)} style={s.miniBtn}><Text style={s.miniBtnTxt}>{it.isPrivate ? 'Make public' : 'Private'}</Text></Pressable>
                        <Pressable onPress={() => removeItem(order.id, it.id)} style={[s.miniBtn, { backgroundColor: '#FBE9E7' }]}><Text style={[s.miniBtnTxt, { color: '#C0392B' }]}>Remove</Text></Pressable>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Totals */}
      <View style={s.card}>
        <View style={s.totalRow}><Text style={s.totalLbl}>Items</Text><Text style={s.totalVal}>₪{totals.itemsTotal.toFixed(0)}</Text></View>
        <View style={s.totalRow}><Text style={s.totalLbl}>Delivery (split ÷ {order.participants.length})</Text><Text style={s.totalVal}>₪{totals.sharedDeliveryPerUser.toFixed(0)}</Text></View>
        <View style={[s.totalRow, { borderTopWidth: 1, borderColor: '#EDE9DD', paddingTop: 8, marginTop: 4 }]}>
          <Text style={[s.totalLbl, { fontWeight: '800', color: '#171717' }]}>Group total</Text>
          <Text style={[s.totalVal, { fontWeight: '900' }]}>₪{totals.grandTotal.toFixed(0)}</Text>
        </View>
      </View>

      {order.status === 'open' ? (
        <Pressable
          disabled={order.items.length === 0}
          onPress={submitToStore}
          style={[s.submitBtn, { backgroundColor: order.items.length === 0 ? '#C9C5BC' : '#171717' }]}
        >
          <Text style={s.submitTxt}>{order.items.length === 0 ? 'Add items first' : `Send to ${meta.name} merchant →`}</Text>
        </Pressable>
      ) : (
        <View style={s.statusBox}>
          <Text style={s.statusBoxTitle}>Live order status: {STATUS_FLOW.find((x) => x.key === order.status)?.label ?? order.status}</Text>
          <Text style={s.statusBoxSub}>Updates instantly when the merchant changes status.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 14, backgroundColor: '#F6F4EE' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#171717' },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#E5E1D8' },
  backTxt: { fontSize: 12, fontWeight: '700', color: '#171717' },
  brandPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  brandPillTxt: { color: '#fff', fontWeight: '900', fontSize: 12 },
  heroCard: { backgroundColor: '#fff', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#EDE9DD' },
  heroTitle: { fontSize: 18, fontWeight: '900', color: '#171717' },
  heroMeta: { fontSize: 13, color: '#707070', marginTop: 2 },
  statusTrack: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 4 },
  stepWrap: { flex: 1, alignItems: 'center', gap: 4 },
  stepDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: '#E5E1D8' },
  stepDotOn: { backgroundColor: '#3F8F4D' },
  stepDotCurrent: { width: 14, height: 14, borderRadius: 999, backgroundColor: '#3F8F4D', shadowColor: '#3F8F4D', shadowOpacity: 0.4, shadowRadius: 8 },
  stepTxt: { fontSize: 10, color: '#A5A19A', textAlign: 'center' },
  savingsCard: { backgroundColor: '#FFF8E5', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#F2E5B0', gap: 8 },
  savingsTitle: { fontSize: 14, fontWeight: '800', color: '#171717' },
  progressTrack: { height: 10, backgroundColor: '#fff', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3F8F4D', borderRadius: 999 } as any,
  progressTxt: { fontSize: 12, fontWeight: '700', color: '#171717' },
  savingsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  savingsCell: { flex: 1, backgroundColor: '#fff', padding: 10, borderRadius: 12 },
  savingsLbl: { fontSize: 11, color: '#707070' },
  savingsVal: { fontSize: 15, fontWeight: '800', color: '#171717', marginTop: 2 },
  strike: { textDecorationLine: 'line-through', color: '#A5A19A', fontWeight: '500', fontSize: 12 },
  inviteCard: { backgroundColor: '#fff', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#EDE9DD', gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#171717' },
  codeRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  codeBox: { flex: 1, backgroundColor: '#F6F4EE', padding: 12, borderRadius: 14, alignItems: 'center' },
  codeLbl: { fontSize: 11, color: '#707070' },
  codeVal: { fontSize: 28, fontWeight: '900', color: '#171717', letterSpacing: 4 },
  copyBtn: { backgroundColor: '#171717', paddingHorizontal: 14, justifyContent: 'center', borderRadius: 14 },
  copyTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  inviteMsg: { fontSize: 12, color: '#404040', backgroundColor: '#F6F4EE', padding: 10, borderRadius: 12, lineHeight: 18 },
  simRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 },
  simLbl: { fontSize: 12, color: '#707070' },
  simBtn: { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#C8B086', borderRadius: 999 },
  simTxt: { fontSize: 12, fontWeight: '800', color: '#171717' },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#EDE9DD' },
  partChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#E5E1D8', backgroundColor: '#fff' },
  partChipActive: { backgroundColor: '#171717', borderColor: '#171717' },
  partTxt: { fontSize: 12, color: '#171717', fontWeight: '600' },
  itemRow: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 10, borderRadius: 14, backgroundColor: '#FAFAF7' },
  itemImg: { width: 56, height: 56, borderRadius: 10 } as any,
  itemName: { fontSize: 14, fontWeight: '700', color: '#171717' },
  itemMeta: { fontSize: 12, color: '#707070', marginTop: 2 },
  itemBuyer: { fontSize: 11, color: '#A5A19A', marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '800', color: '#171717' },
  miniBtn: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#EDE9DD', borderRadius: 999 },
  miniBtnTxt: { fontSize: 10, fontWeight: '700', color: '#171717' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLbl: { fontSize: 13, color: '#707070' },
  totalVal: { fontSize: 14, fontWeight: '700', color: '#171717' },
  submitBtn: { paddingVertical: 16, borderRadius: 999, alignItems: 'center' },
  submitTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  statusBox: { backgroundColor: '#E8F5EA', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#BFE0C5' },
  statusBoxTitle: { fontSize: 14, fontWeight: '800', color: '#1F5A2A' },
  statusBoxSub: { fontSize: 12, color: '#3F8F4D', marginTop: 2 },
  btnDark: { backgroundColor: '#171717', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999, alignItems: 'center' },
  btnDarkTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
