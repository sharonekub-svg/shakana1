import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useDemoStore, listOrders, calcTotals } from '@/demo/store';
import { getProduct, BRAND_META } from '@/demo/products';

export default function StoreDashboard() {
  const router = useRouter();
  const orders = useDemoStore((s) => s.orders);
  const setRole = useDemoStore((s) => s.setRole);

  const all = useMemo(() => listOrders(orders).filter((o) => o.status !== 'open'), [orders]);
  const live = all.filter((o) => o.status !== 'shipped');
  const done = all.filter((o) => o.status === 'shipped');

  return (
    <ScrollView style={s.wrap} contentContainerStyle={s.content}>
      <View style={s.header}>
        <View>
          <Text style={s.brand}>shakana <Text style={s.brandSub}>· Merchant</Text></Text>
          <Text style={s.title}>Agent M Dashboard</Text>
          <Text style={s.sub}>Live group orders from H&M and Zara</Text>
        </View>
        <Pressable onPress={() => { setRole(null); router.replace('/login'); }} style={s.logoutBtn}>
          <Text style={s.logoutTxt}>Logout</Text>
        </Pressable>
      </View>

      <View style={s.statsRow}>
        <Stat label="Live orders" value={String(live.length)} />
        <Stat label="Items to pack" value={String(live.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.qty, 0), 0))} />
        <Stat label="Customers" value={String(live.reduce((sum, o) => sum + o.participants.length, 0))} />
        <Stat label="Shipped today" value={String(done.length)} />
      </View>

      <Text style={s.section}>Incoming live orders</Text>
      {live.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No live orders yet</Text>
          <Text style={s.emptySub}>Open the user app, build a group cart, and submit. It will appear here instantly.</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {live.map((o) => {
            const totals = calcTotals(o, (pid) => getProduct(pid)?.price ?? 0);
            const meta = BRAND_META[o.brand];
            const minutesLeft = Math.max(0, Math.round((o.expiresAt - Date.now()) / 60000));
            return (
              <Pressable key={o.id} onPress={() => router.push(`/store/orders/${o.id}`)} style={s.row}>
                <View style={[s.brandBadge, { backgroundColor: meta.accent }]}><Text style={s.brandBadgeTxt}>{meta.logo}</Text></View>
                <View style={{ flex: 1 }}>
                  <View style={s.rowTop}>
                    <Text style={s.rowTitle}>#{o.id.slice(-6).toUpperCase()} · {o.storeName}</Text>
                    <StatusPill status={o.status} />
                  </View>
                  <Text style={s.rowMeta}>{o.participants.length} customers · {totals.totalCount} items · ₪{totals.itemsTotal.toFixed(0)}</Text>
                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: `${Math.round(totals.goalProgress * 100)}%` }]} />
                  </View>
                  <Text style={s.rowFoot}>Goal ₪{o.goal} · {Math.round(totals.goalProgress * 100)}% · ⏱ {minutesLeft}m</Text>
                </View>
                <Text style={s.arrow}>→</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {done.length > 0 && (
        <>
          <Text style={s.section}>Recently shipped</Text>
          <View style={{ gap: 8 }}>
            {done.map((o) => (
              <Pressable key={o.id} onPress={() => router.push(`/store/orders/${o.id}`)} style={[s.row, { opacity: 0.65 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>#{o.id.slice(-6).toUpperCase()} · {o.storeName}</Text>
                  <Text style={s.rowMeta}>Shipped · {o.participants.length} customers</Text>
                </View>
                <Text style={s.arrow}>→</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statVal}>{value}</Text>
      <Text style={s.statLbl}>{label}</Text>
    </View>
  );
}

export function StatusPill({ status }: { status: string }) {
  const fallback = { bg: '#F6F4EE', fg: '#707070' };
  const colors: Record<string, { bg: string; fg: string }> = {
    submitted: { bg: '#FFF1D6', fg: '#8A5A00' },
    accepted: { bg: '#E0EBFF', fg: '#1F47A8' },
    packing: { bg: '#FFE7D6', fg: '#A8431F' },
    ready: { bg: '#E8F5EA', fg: '#1F5A2A' },
    shipped: { bg: '#EDE9DD', fg: '#404040' },
    open: fallback,
  };
  const c = colors[status] ?? fallback;
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: c.bg }}>
      <Text style={{ fontSize: 10, fontWeight: '800', color: c.fg, letterSpacing: 0.5 }}>{status.toUpperCase()}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F4F2EC' },
  content: { padding: 24, paddingBottom: 60, gap: 14, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 },
  brand: { fontSize: 14, fontWeight: '800', color: '#707070' },
  brandSub: { color: '#C8B086' },
  title: { fontSize: 26, fontWeight: '900', color: '#171717', letterSpacing: -0.5, marginTop: 4 },
  sub: { fontSize: 13, color: '#707070', marginTop: 2 },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#E5E1D8', backgroundColor: '#fff' },
  logoutTxt: { fontSize: 12, color: '#707070', fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginVertical: 8 },
  stat: { flexGrow: 1, flexBasis: 160, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#EDE9DD' },
  statVal: { fontSize: 24, fontWeight: '900', color: '#171717' },
  statLbl: { fontSize: 12, color: '#707070', marginTop: 2 },
  section: { fontSize: 16, fontWeight: '800', color: '#171717', marginTop: 8 },
  empty: { backgroundColor: '#fff', padding: 24, borderRadius: 18, borderWidth: 1, borderColor: '#EDE9DD', alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#171717' },
  emptySub: { fontSize: 13, color: '#707070', textAlign: 'center', marginTop: 4 },
  row: { flexDirection: 'row', backgroundColor: '#fff', padding: 14, borderRadius: 16, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#EDE9DD' },
  brandBadge: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brandBadgeTxt: { color: '#fff', fontWeight: '900', fontSize: 12 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  rowTitle: { fontSize: 14, fontWeight: '800', color: '#171717' },
  rowMeta: { fontSize: 12, color: '#707070', marginTop: 2 },
  rowFoot: { fontSize: 11, color: '#707070', marginTop: 4 },
  progressTrack: { height: 6, backgroundColor: '#EDE9DD', borderRadius: 999, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3F8F4D' } as any,
  arrow: { fontSize: 22, color: '#171717' },
});
