import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BRAND_META, productsByBrand } from '@/demo/products';
import type { Brand, Category, Product } from '@/demo/types';
import { useDemoStore, listOrders } from '@/demo/store';

const CATS: { key: Category; label: string }[] = [
  { key: 'best', label: 'Best Sellers' },
  { key: 'new', label: 'New Arrivals' },
  { key: 'shirts', label: 'Shirts' },
  { key: 'pants', label: 'Pants' },
  { key: 'dresses', label: 'Dresses' },
  { key: 'accessories', label: 'Accessories' },
];

export default function StorePage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ brand: string | string[] }>();
  const brand = Array.isArray(params.brand) ? params.brand[0] : params.brand;
  const b = (brand === 'hm' || brand === 'zara' ? brand : 'hm') as Brand;
  const meta = BRAND_META[b];
  const products = useMemo(() => productsByBrand(b), [b]);
  const [activeCat, setActiveCat] = useState<Category>('best');
  const filtered = useMemo(() => {
    if (activeCat === 'best' || activeCat === 'new') {
      return products.filter((p) => (activeCat === 'best' ? p.badge === 'Bestseller' : p.badge === 'New') || true).slice(0, 12);
    }
    return products.filter((p) => p.category === activeCat);
  }, [activeCat, products]);

  const [picked, setPicked] = useState<Product | null>(null);

  const orders = useDemoStore((s) => s.orders);
  const activeUser = useDemoStore((s) => s.activeUser);
  const createOrder = useDemoStore((s) => s.createOrder);
  const addItem = useDemoStore((s) => s.addItem);

  const myActiveOrder = listOrders(orders).find(
    (o) => o.brand === b && o.status === 'open' && o.participants.some((p) => p.id === activeUser),
  );

  function onAdd(product: Product, size: string, color: string, qty: number, isPrivate: boolean) {
    let orderId = myActiveOrder?.id;
    if (!orderId) orderId = createOrder(b);
    addItem(orderId, { productId: product.id, size, color, qty, isPrivate });
    setPicked(null);
    router.push(`/user/group/${orderId}`);
  }

  return (
    <View style={s.wrap}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.hero, { backgroundColor: meta.accent }]}>
          <Image source={{ uri: meta.cover }} style={s.heroImg} />
          <View style={s.heroOverlay} />
          <View style={s.heroContent}>
            <Pressable onPress={() => router.back()} style={s.backBtn}><Text style={s.backTxt}>← Back</Text></Pressable>
            <View style={[s.logoBadge, { backgroundColor: meta.accent === '#000000' ? '#fff' : meta.accent }]}>
              <Text style={[s.logoTxt, { color: meta.accent === '#000000' ? '#000' : '#fff' }]}>{meta.logo}</Text>
            </View>
            <Text style={s.heroTitle}>{meta.name}</Text>
            <Text style={s.heroTag}>{meta.tagline}</Text>
            <View style={s.heroBadges}>
              <Text style={s.heroBadge}>⚡ Group order saves on delivery</Text>
              <Text style={s.heroBadge}>🚚 Free shipping over ₪{meta.goal}</Text>
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cats}>
          {CATS.map((c) => (
            <Pressable key={c.key} onPress={() => setActiveCat(c.key)} style={[s.cat, activeCat === c.key && s.catActive]}>
              <Text style={[s.catTxt, activeCat === c.key && s.catTxtActive]}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {filtered.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyTxt}>No products in this category yet.</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {filtered.map((p) => (
              <Pressable key={p.id} onPress={() => setPicked(p)} style={s.card}>
                <Image source={{ uri: p.image }} style={s.cardImg} />
                {p.badge ? <View style={s.cardBadge}><Text style={s.cardBadgeTxt}>{p.badge}</Text></View> : null}
                <View style={s.cardBody}>
                  <Text style={s.cardName} numberOfLines={1}>{p.name}</Text>
                  <Text style={s.cardSku}>{p.sku}</Text>
                  <View style={s.cardRow}>
                    <Text style={s.cardPrice}>₪{p.price}</Text>
                    <Text style={s.cardStock}>{p.inStock ? 'In stock' : 'Out'}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {myActiveOrder ? (
          <Pressable onPress={() => router.push(`/user/group/${myActiveOrder.id}`)} style={s.activeBar}>
            <Text style={s.activeBarTxt}>Open active group order ({myActiveOrder.items.length} items, {myActiveOrder.participants.length} joined)</Text>
            <Text style={{ color: '#fff' }}>→</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <ProductModal product={picked} onClose={() => setPicked(null)} onAdd={onAdd} brandAccent={meta.accent} />
    </View>
  );
}

function ProductModal({
  product, onClose, onAdd, brandAccent,
}: {
  product: Product | null;
  onClose: () => void;
  onAdd: (p: Product, size: string, color: string, qty: number, isPrivate: boolean) => void;
  brandAccent: string;
}) {
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [isPrivate, setIsPrivate] = useState(false);

  // reset on product change
  useEffect(() => { setSize(null); setColor(null); setQty(1); setIsPrivate(false); }, [product?.id]);

  if (!product) return null;
  const canAdd = !!size && !!color && product.inStock;

  return (
    <Modal animationType="slide" transparent visible={!!product} onRequestClose={onClose}>
      <View style={ms.backdrop}>
        <Pressable style={ms.dismiss} onPress={onClose} />
        <View style={ms.sheet}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
            <Pressable onPress={onClose} style={ms.closeBtn}><Text style={ms.closeTxt}>✕ Close</Text></Pressable>
            <Image source={{ uri: product.image }} style={ms.img} />
            <Text style={ms.name}>{product.name}</Text>
            <Text style={ms.sku}>SKU {product.sku}</Text>
            <Text style={ms.desc}>{product.description}</Text>
            <Text style={ms.price}>₪{product.price}</Text>

            <Text style={ms.lbl}>Color {color ? <Text style={ms.lblPick}>· {color}</Text> : <Text style={ms.lblReq}> · required</Text>}</Text>
            <View style={ms.opts}>
              {product.colors.map((c) => (
                <Pressable key={c} onPress={() => setColor(c)} style={[ms.opt, color === c && { borderColor: brandAccent, backgroundColor: brandAccent + '15' }]}>
                  <Text style={[ms.optTxt, color === c && { color: brandAccent, fontWeight: '800' }]}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={ms.lbl}>Size {size ? <Text style={ms.lblPick}>· {size}</Text> : <Text style={ms.lblReq}> · required</Text>}</Text>
            <View style={ms.opts}>
              {product.sizes.map((sz) => (
                <Pressable key={sz} onPress={() => setSize(sz)} style={[ms.opt, size === sz && { borderColor: brandAccent, backgroundColor: brandAccent + '15' }]}>
                  <Text style={[ms.optTxt, size === sz && { color: brandAccent, fontWeight: '800' }]}>{sz}</Text>
                </Pressable>
              ))}
            </View>

            <View style={ms.qtyRow}>
              <Text style={ms.lbl}>Quantity</Text>
              <View style={ms.qty}>
                <Pressable onPress={() => setQty(Math.max(1, qty - 1))} style={ms.qBtn}><Text style={ms.qBtnTxt}>−</Text></Pressable>
                <Text style={ms.qVal}>{qty}</Text>
                <Pressable onPress={() => setQty(qty + 1)} style={ms.qBtn}><Text style={ms.qBtnTxt}>+</Text></Pressable>
              </View>
            </View>

            <Pressable onPress={() => setIsPrivate(!isPrivate)} style={ms.priv}>
              <View style={[ms.checkbox, isPrivate && { backgroundColor: brandAccent, borderColor: brandAccent }]}>
                {isPrivate ? <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: '#171717' }}>Mark as private gift</Text>
                <Text style={{ fontSize: 12, color: '#707070' }}>Other participants only see your contribution amount.</Text>
              </View>
            </Pressable>

            <Pressable
              disabled={!canAdd}
              onPress={() => canAdd && onAdd(product, size!, color!, qty, isPrivate)}
              style={[ms.addBtn, { backgroundColor: canAdd ? brandAccent : '#C9C5BC' }]}
            >
              <Text style={ms.addTxt}>{canAdd ? `Add to group cart · ₪${product.price * qty}` : 'Pick size & color'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F6F4EE' },
  content: { paddingBottom: 80 },
  hero: { height: 240, position: 'relative', overflow: 'hidden' },
  heroImg: { ...StyleSheet.absoluteFillObject, opacity: 0.5 } as any,
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' } as any,
  heroContent: { padding: 20, gap: 6, justifyContent: 'flex-end', flex: 1 },
  backBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: 8 },
  backTxt: { fontSize: 12, fontWeight: '700', color: '#171717' },
  logoBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  logoTxt: { fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  heroTag: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  heroBadges: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  heroBadge: { fontSize: 11, color: '#fff', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  cats: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  cat: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E1D8', marginRight: 8 },
  catActive: { backgroundColor: '#171717', borderColor: '#171717' },
  catTxt: { fontSize: 13, color: '#171717', fontWeight: '600' },
  catTxtActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  card: { flexGrow: 1, flexBasis: 220, maxWidth: 320, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#EDE9DD' },
  cardImg: { width: '100%', height: 200, backgroundColor: '#EDE9DD' } as any,
  cardBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#171717', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  cardBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardBody: { padding: 12, gap: 4 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#171717' },
  cardSku: { fontSize: 11, color: '#A5A19A' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  cardPrice: { fontSize: 15, fontWeight: '800', color: '#171717' },
  cardStock: { fontSize: 11, color: '#3F8F4D', fontWeight: '700' },
  emptyBox: { padding: 30, alignItems: 'center' },
  emptyTxt: { color: '#707070' },
  activeBar: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: '#171717', padding: 14, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeBarTxt: { color: '#fff', fontWeight: '700' },
});

const ms = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  dismiss: { ...StyleSheet.absoluteFillObject } as any,
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  closeBtn: { alignSelf: 'flex-end' },
  closeTxt: { fontSize: 13, color: '#707070', fontWeight: '700' },
  img: { width: '100%', height: 280, borderRadius: 16, backgroundColor: '#EDE9DD' } as any,
  name: { fontSize: 22, fontWeight: '900', color: '#171717' },
  sku: { fontSize: 12, color: '#A5A19A' },
  desc: { fontSize: 14, color: '#404040', lineHeight: 20 },
  price: { fontSize: 22, fontWeight: '900', color: '#171717' },
  lbl: { fontSize: 13, fontWeight: '700', color: '#171717', marginTop: 4 },
  lblPick: { color: '#3F8F4D', fontWeight: '800' },
  lblReq: { color: '#C0392B', fontWeight: '700', fontSize: 12 },
  opts: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  opt: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#E5E1D8', borderRadius: 999, backgroundColor: '#fff' },
  optTxt: { fontSize: 13, color: '#171717' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F6F4EE', borderRadius: 999, paddingHorizontal: 4 },
  qBtn: { width: 32, height: 32, borderRadius: 999, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  qBtnTxt: { fontSize: 18, fontWeight: '800', color: '#171717' },
  qVal: { fontSize: 14, fontWeight: '800', color: '#171717', minWidth: 20, textAlign: 'center' },
  priv: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, backgroundColor: '#F6F4EE', borderRadius: 14, marginTop: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#C9C5BC', alignItems: 'center', justifyContent: 'center' },
  addBtn: { paddingVertical: 16, borderRadius: 999, alignItems: 'center', marginTop: 8 },
  addTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
