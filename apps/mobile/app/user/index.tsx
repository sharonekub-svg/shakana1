import { View, Text, Pressable, StyleSheet, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useDemoStore, listOrders, DEMO_USER_META } from '@/demo/store';
import { BRAND_META } from '@/demo/products';

export default function UserHome() {
  const router = useRouter();
  const orders = useDemoStore((s) => s.orders);
  const activeUser = useDemoStore((s) => s.activeUser);
  const setActiveUser = useDemoStore((s) => s.setActiveUser);
  const setRole = useDemoStore((s) => s.setRole);
  const userOrders = listOrders(orders).filter((o) => o.participants.some((p) => p.id === activeUser));

  return (
    <ScrollView style={s.wrap} contentContainerStyle={s.content}>
      <View style={s.topbar}>
        <View>
          <Text style={s.brand}>shakana</Text>
          <Text style={s.greeting}>Hey {DEMO_USER_META[activeUser].name} {DEMO_USER_META[activeUser].avatar}</Text>
        </View>
        <View style={s.userSwitch}>
          {(['A', 'B', 'C'] as const).map((u) => (
            <Pressable key={u} onPress={() => setActiveUser(u)} style={[s.chip, activeUser === u && s.chipActive]}>
              <Text style={[s.chipTxt, activeUser === u && s.chipTxtActive]}>{DEMO_USER_META[u].avatar} {DEMO_USER_META[u].name}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => { setRole(null); router.replace('/login'); }} style={s.logoutBtn}>
            <Text style={s.logoutTxt}>Logout</Text>
          </Pressable>
        </View>
      </View>

      <Text style={s.sectionTitle}>Pick a store</Text>
      <Text style={s.sectionSub}>Tap to browse and start a group order with friends.</Text>

      <View style={s.grid}>
        {(['hm', 'zara'] as const).map((b) => {
          const meta = BRAND_META[b];
          return (
            <Pressable key={b} onPress={() => router.push(`/user/store/${b}`)} style={s.storeCard}>
              <Image source={{ uri: meta.cover }} style={s.storeCover} />
              <View style={s.storeOverlay} />
              <View style={s.storeMeta}>
                <View style={[s.logoBadge, { backgroundColor: meta.accent }]}><Text style={s.logoTxt}>{meta.logo}</Text></View>
                <Text style={s.storeName}>{meta.name}</Text>
                <Text style={s.storeTag}>{meta.tagline}</Text>
                <View style={s.row}>
                  <Text style={s.tag}>Free shipping ₪{meta.goal}+</Text>
                  <Text style={s.tag}>30-45 min pack</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {userOrders.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Your group orders</Text>
          <View style={{ gap: 10 }}>
            {userOrders.map((o) => (
              <Pressable key={o.id} onPress={() => router.push(`/user/group/${o.id}`)} style={s.orderRow}>
                <View>
                  <Text style={s.orderBrand}>{o.storeName}</Text>
                  <Text style={s.orderMeta}>{o.participants.length} joined • {o.items.length} items • Status: {o.status}</Text>
                </View>
                <Text style={s.arrow}>→</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {userOrders.length === 0 && (
        <View style={s.emptyBox}>
          <Text style={s.emptyTitle}>No active group orders</Text>
          <Text style={s.emptySub}>Pick a store above to create your first one.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F6F4EE' },
  content: { padding: 20, paddingBottom: 60, gap: 16 },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  brand: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, color: '#171717' },
  greeting: { fontSize: 13, color: '#707070', marginTop: 2 },
  userSwitch: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E1D8' },
  chipActive: { backgroundColor: '#171717', borderColor: '#171717' },
  chipTxt: { fontSize: 12, color: '#171717', fontWeight: '600' },
  chipTxtActive: { color: '#fff' },
  logoutBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E1D8' },
  logoutTxt: { fontSize: 12, color: '#707070', fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#171717', marginTop: 8 },
  sectionSub: { fontSize: 13, color: '#707070', marginTop: -4 },
  grid: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  storeCard: { flexGrow: 1, flexBasis: 280, height: 220, borderRadius: 22, overflow: 'hidden', backgroundColor: '#171717' },
  storeCover: { ...StyleSheet.absoluteFillObject, opacity: 0.55 } as any,
  storeOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' } as any,
  storeMeta: { padding: 16, gap: 6, justifyContent: 'flex-end', flex: 1 },
  logoBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  logoTxt: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  storeName: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  storeTag: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  row: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  tag: { fontSize: 11, color: '#fff', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  orderRow: { backgroundColor: '#fff', padding: 14, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#EDE9DD' },
  orderBrand: { fontSize: 15, fontWeight: '800', color: '#171717' },
  orderMeta: { fontSize: 12, color: '#707070', marginTop: 2 },
  arrow: { fontSize: 22, color: '#171717' },
  emptyBox: { backgroundColor: '#fff', padding: 22, borderRadius: 18, borderWidth: 1, borderColor: '#EDE9DD', alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#171717' },
  emptySub: { fontSize: 13, color: '#707070', marginTop: 4 },
});
