import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, ImageBackground, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BrandPill,
  Card,
  CelebrationBanner,
  DemoButton,
  DemoPage,
  EmptyNotice,
  ProductImage,
  SavingsPanel,
  SavingsTracker,
  SectionTitle,
  SelfUpdatingTimerRing,
  StatusRail,
  demoStyles,
} from '@/components/demo/DemoPrimitives';
import { buildInviteMessage, demoCategories, demoStores, findProduct, getProductImage, productsForBrand, type DemoBrandId, type DemoProduct } from '@/demo/catalog';
import { calcCommission } from '@/config/shippingPolicies';
import {
  type DemoOrder,
  type DemoParticipant,
  getOrderItemCount,
  getOrderTotal,
  getProductLine,
  getVisibleOrdersForParticipant,
  initDemoCommerceSync,
  buildSharedDemoInviteLink,
  useDemoCommerceStore,
} from '@/stores/demoCommerceStore';
import { fontFamily } from '@/theme/fonts';
import { colors } from '@/theme/tokens';
import { BuildingSections } from '@/components/demo/BuildingSections';
import { useLocale } from '@/i18n/locale';
import { formatMoney } from '@/utils/money';
import { useAuthStore } from '@/stores/authStore';
import { stashPendingInvite } from '@/lib/deeplinks';
import { searchCities, searchStreets } from '@/lib/locationAutocomplete';
import { env } from '@/lib/env';

const ADDRESS_SUGGESTIONS = [
  'Rothschild Boulevard 12, Tel Aviv',
  'Dizengoff Street 88, Tel Aviv',
  'Ibn Gabirol Street 110, Tel Aviv',
  'Allenby Street 65, Tel Aviv',
  'Herzl Street 21, Ramat Gan',
  'Jabotinsky Street 42, Petah Tikva',
  'Weizmann Street 17, Givatayim',
  'Ben Gurion Street 9, Herzliya',
  'King George Street 30, Jerusalem',
  'Bialik Street 7, Holon',
  'HaNassi Boulevard 45, Haifa',
  'Sokolov Street 18, Ramat Hasharon',
];

function getAddressSuggestions(value: string) {
  const query = value.trim().toLowerCase();
  if (query.length < 2) return [];
  return ADDRESS_SUGGESTIONS.filter((address) => address.toLowerCase().includes(query)).slice(0, 5);
}

function uniqueAddressSuggestions(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.trim().toLocaleLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function splitAddressQuery(value: string) {
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      street: parts.slice(0, -1).join(', '),
      city: parts[parts.length - 1] ?? '',
      hasCityPart: true,
    };
  }
  return {
    street: value.trim(),
    city: value.trim(),
    hasCityPart: false,
  };
}

function normalizeTimerMinutes(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(1, Math.min(720, Math.round(parsed)));
}

function hasAddressNumber(value: string) {
  return /\d+[A-Za-z]?/.test(value);
}

function isCompleteDeliveryAddress(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 8 && hasAddressNumber(trimmed) && trimmed.includes(',');
}

function addressValidationMessage(value: string, language: 'he' | 'en' = 'en') {
  const trimmed = value.trim();
  const he = language === 'he';
  if (!trimmed) return he ? 'חובה להזין רחוב + מספר בית + עיר לפני פתיחת הסל.' : 'Required: enter street + house number + city before opening the cart.';
  if (!hasAddressNumber(trimmed)) return he ? 'חובה להזין מספר בית. לדוגמה: הרצל 12, פתח תקווה.' : 'House number is required. Example: Herzl 12, Petah Tikva.';
  if (!trimmed.includes(',')) return he ? 'הוסף עיר אחרי הרחוב ומספר הבית. לדוגמה: הרצל 12, פתח תקווה.' : 'Add the city after the street and house number. Example: Herzl 12, Petah Tikva.';
  return he ? 'חובה לבחור טיימר, חנות וכתובת מלאה עם מספר בית לפני פתיחת הסל.' : 'Required: valid timer, one store, and full address with house number before opening the cart.';
}

const TOUR_STEPS = [
  {
    step: '01',
    title: 'A neighbor finds something she loves',
    body: 'Sharone spots an H&M linen shirt. Solo delivery costs ILS 29. But there is a smarter way - one that costs nothing.',
    stat: 'ILS 29',
    statLabel: 'solo shipping',
    image: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=600&q=80',
  },
  {
    step: '02',
    title: 'Group order live in 30 seconds',
    body: 'Sharone opens Shakana, picks H&M, sets a 45-minute timer. A shared cart is created instantly - no app needed for neighbors.',
    stat: '30s',
    statLabel: 'to go live',
    image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=600&q=80',
  },
  {
    step: '03',
    title: 'One WhatsApp message to the building',
    body: 'Hey neighbors - I am ordering from H&M, join my cart and we all get free shipping. Shakana writes the message. One tap to send.',
    stat: '1 tap',
    statLabel: 'to share',
    image: 'https://images.unsplash.com/photo-1611746872915-64382b5c76da?auto=format&fit=crop&w=600&q=80',
  },
  {
    step: '04',
    title: 'Noa + Lior join. Free shipping unlocked.',
    body: 'Each neighbor adds their items privately. ILS 119 + ILS 99 + ILS 89 = ILS 307. That is over the ILS 299 threshold. H&M ships free to the building.',
    stat: 'ILS 0',
    statLabel: 'shipping cost',
    image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80',
  },
  {
    step: '05',
    title: 'Everyone pays their share - securely',
    body: 'Shakana holds all payments in Stripe escrow. Sharone buys the full order. Money only releases after every neighbor confirms delivery.',
    stat: '100%',
    statLabel: 'escrow protected',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=600&q=80',
  },
  {
    step: '06',
    title: 'Families save hundreds of shekels a year',
    body: 'A building that joins one shared order a week can save around ILS 2,400 a year on delivery. Shakana keeps the flow simple, private, and easy to repeat.',
    stat: 'ILS 2.4K',
    statLabel: 'avg yearly savings',
    image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80',
  },
];

type PendingCheckoutItem = {
  localId: string;
  orderId: string;
  productId: string;
  participantId: string;
  participant: DemoParticipant;
  size: string;
  color: string;
  quantity: number;
  private: boolean;
};

function DemoTour({ onClose }: { onClose: () => void }) {
  const { language } = useLocale();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const current = TOUR_STEPS[step] ?? TOUR_STEPS[0];
  const total = TOUR_STEPS.length;
  const localizeCurrencyText = (value = '') =>
    language === 'he'
      ? value
          .replace(/ILS 2,400/g, formatMoney(2400, language))
          .replace(/ILS 307/g, formatMoney(307, language))
          .replace(/ILS 299/g, formatMoney(299, language))
          .replace(/ILS 119/g, formatMoney(119, language))
          .replace(/ILS 100/g, formatMoney(100, language))
          .replace(/ILS 99/g, formatMoney(99, language))
          .replace(/ILS 89/g, formatMoney(89, language))
          .replace(/ILS 29/g, formatMoney(29, language))
          .replace(/ILS 0/g, formatMoney(0, language))
          .replace(/ILS 2.4K/g, '₪2.4K')
      : value;

  useEffect(() => {
    if (!playing) return;
    const timer = globalThis.setTimeout(() => {
      if (step < total - 1) {
        setStep((s) => s + 1);
      } else {
        setPlaying(false);
      }
    }, 5000);
    return () => globalThis.clearTimeout(timer);
  }, [step, playing, total]);

  const goNext = () => {
    if (step < total - 1) { setStep((s) => s + 1); setPlaying(true); }
    else onClose();
  };
  const goPrev = () => {
    if (step > 0) { setStep((s) => s - 1); setPlaying(false); }
  };

  return (
    <View style={tourStyles.overlay} pointerEvents="box-none">
      <Pressable style={tourStyles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close tour" />
      <View style={tourStyles.card}>
        <Image source={{ uri: current?.image }} style={tourStyles.image} resizeMode="cover" />
        <View style={tourStyles.content}>
          <View style={tourStyles.topRow}>
            <Text style={tourStyles.stepLabel}>{current?.step} / {String(total).padStart(2, '0')}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" style={tourStyles.closeBtn}>
              <Text style={tourStyles.closeBtnText}>X</Text>
            </Pressable>
          </View>
          <View style={tourStyles.statRow}>
            <Text style={tourStyles.statValue}>{localizeCurrencyText(current?.stat)}</Text>
            <Text style={tourStyles.statLabel}>{current?.statLabel}</Text>
          </View>
          <Text style={tourStyles.title}>{current?.title}</Text>
          <Text style={tourStyles.body}>{localizeCurrencyText(current?.body)}</Text>
          <View style={tourStyles.dots}>
            {TOUR_STEPS.map((_, i) => (
              <Pressable key={i} onPress={() => { setStep(i); setPlaying(false); }} accessibilityRole="button">
                <View style={[tourStyles.dot, i === step && tourStyles.dotActive]} />
              </Pressable>
            ))}
          </View>
          <View style={tourStyles.actions}>
            <Pressable
              onPress={goPrev}
              disabled={step === 0}
              accessibilityRole="button"
              style={[tourStyles.navBtn, step === 0 && tourStyles.navBtnDisabled]}
            >
              <Text style={tourStyles.navBtnText}>Back</Text>
            </Pressable>
            <Pressable
              onPress={() => setPlaying((p) => !p)}
              accessibilityRole="button"
              style={tourStyles.playBtn}
            >
              <Text style={tourStyles.playBtnText}>{playing ? 'Pause' : 'Play'}</Text>
            </Pressable>
            <Pressable onPress={goNext} accessibilityRole="button" style={tourStyles.navBtnAccent}>
              <Text style={tourStyles.navBtnAccentText}>{step < total - 1 ? 'Next' : 'Done'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const tourStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  } as never,
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,14,10,0.88)',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 24,
    backgroundColor: colors.white,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
    elevation: 20,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: colors.s2,
  },
  content: {
    padding: 22,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    color: colors.mu2,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.s2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    color: colors.mu,
    fontFamily: fontFamily.bodyBold,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  statValue: {
    fontFamily: fontFamily.display,
    fontSize: 36,
    color: colors.gold,
    lineHeight: 40,
  },
  statLabel: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.mu,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.tx,
    lineHeight: 28,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.mu,
    lineHeight: 22,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.br,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.acc,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  navBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.s2,
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  navBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.tx,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.s2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnText: {
    fontSize: 16,
  },
  navBtnAccent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.ink,
  },
  navBtnAccentText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.white,
  },
});

export default function DemoUserScreen() {
  const router = useRouter();
  const { language } = useLocale();
  const params = useLocalSearchParams<{ join?: string; new?: string; founder?: string }>();
  const session = useAuthStore((state) => state.session);
  const demoMode = useDemoCommerceStore((state) => state.demoMode);
  const selectedBrand = useDemoCommerceStore((state) => state.selectedBrand);
  const orders = useDemoCommerceStore((state) => state.orders);
  const activeParticipantId = useDemoCommerceStore((state) => state.activeParticipantId);
  const lastNotice = useDemoCommerceStore((state) => state.lastNotice);
  const lastPulse = useDemoCommerceStore((state) => state.lastPulse);
  const selectBrand = useDemoCommerceStore((state) => state.selectBrand);
  const ensureOrder = useDemoCommerceStore((state) => state.ensureOrder);
  const createNewOrder = useDemoCommerceStore((state) => state.createNewOrder);
  const claimOrderFounder = useDemoCommerceStore((state) => state.claimOrderFounder);
  const joinParticipant = useDemoCommerceStore((state) => state.joinParticipant);
  const restoreSharedOrder = useDemoCommerceStore((state) => state.restoreSharedOrder);
  const setActiveParticipant = useDemoCommerceStore((state) => state.setActiveParticipant);
  const setDemoRole = useDemoCommerceStore((state) => state.setDemoRole);
  const setDemoMode = useDemoCommerceStore((state) => state.setDemoMode);
  const resetDemo = useDemoCommerceStore((state) => state.resetDemo);
  const updateTimer = useDemoCommerceStore((state) => state.updateTimer);
  const updateDeliveryAddress = useDemoCommerceStore((state) => state.updateDeliveryAddress);
  const addItem = useDemoCommerceStore((state) => state.addItem);
  const simulatePayment = useDemoCommerceStore((state) => state.simulatePayment);

  const [category, setCategory] = useState<(typeof demoCategories)[number]>('Best Sellers');
  const [copied, setCopied] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [customTimer, setCustomTimer] = useState('45');
  const [newOrderMode, setNewOrderMode] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [setupBrand, setSetupBrand] = useState<DemoBrandId | null>(null);
  const [setupDeliveryAddress, setSetupDeliveryAddress] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinRetry, setJoinRetry] = useState(0);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payStep, setPayStep] = useState<'form' | 'processing' | 'success'>('form');
  const [tourOpen, setTourOpen] = useState(false);
  const [pendingCheckoutItems, setPendingCheckoutItems] = useState<PendingCheckoutItem[]>([]);
  const [checkoutItems, setCheckoutItems] = useState<PendingCheckoutItem[]>([]);
  const consumedNewParamRef = useRef(false);

  useEffect(() => {
    initDemoCommerceSync();
    if (demoMode) setDemoRole('user');
  }, [demoMode, setDemoRole]);

  useEffect(() => {
    if (env.enableDemo && !session?.user && !demoMode) {
      setDemoMode(true);
      setDemoRole('user');
    }
  }, [session?.user, demoMode, setDemoMode, setDemoRole]);

  useEffect(() => {
    if (!demoMode || orders.length > 0) return;
    const store = useDemoCommerceStore.getState();
    const now = Date.now();
    const orderId = store.createNewOrder('hm', { id: 'user-a', name: 'Sharone', joinedAt: now }, 45);
    store.updateDeliveryAddress(orderId, 'Rothschild Boulevard 12, Tel Aviv');
    store.joinParticipant(orderId, { id: 'user-b', name: 'Noa M.', joinedAt: now - 120_000 });
    store.joinParticipant(orderId, { id: 'user-c', name: 'Lior K.', joinedAt: now - 60_000 });
    store.addItem(orderId, { productId: 'hm-linen-shirt', participantId: 'user-a', size: 'M', color: 'White', quantity: 1, private: false });
    store.addItem(orderId, { productId: 'hm-basic-tee', participantId: 'user-b', size: 'S', color: 'Black', quantity: 1, private: false });
    store.addItem(orderId, { productId: 'hm-wide-jeans', participantId: 'user-c', size: '32', color: 'Blue', quantity: 1, private: false });
    store.selectBrand('hm');
  }, [demoMode, orders.length]);

  const joinedOrder = useMemo(
    () => orders.find((order) => order.inviteCode === params.join),
    [orders, params.join],
  );

  const accountParticipant: DemoParticipant = useMemo(() => {
    const metadata = session?.user.user_metadata as Record<string, unknown> | undefined;
    const fullName =
      (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
      (typeof metadata?.name === 'string' && metadata.name.trim()) ||
      (session?.user ? 'Signed-in member' : 'Sharone');
    return {
      id: session?.user.id ?? 'user-a',
      name: fullName,
      joinedAt: Date.now(),
    };
  }, [session?.user.id, session?.user.user_metadata]);

  const visibleOrders = useMemo(
    () => getVisibleOrdersForParticipant(orders, accountParticipant.id),
    [accountParticipant.id, orders],
  );
  const visibleOrJoinedOrders = useMemo(() => {
    if (!joinedOrder) return visibleOrders;
    return visibleOrders.some((order) => order.id === joinedOrder.id)
      ? visibleOrders
      : [joinedOrder, ...visibleOrders];
  }, [joinedOrder, visibleOrders]);

  useEffect(() => {
    if (joinedOrder && !joinedOrder.participants.some((participant) => participant.id === activeParticipantId)) {
      joinParticipant(joinedOrder.id, accountParticipant);
      selectBrand(joinedOrder.brand);
    }
  }, [accountParticipant, activeParticipantId, joinedOrder, joinParticipant, selectBrand]);

  useEffect(() => {
    if (!params.join) return;
    if (joinedOrder) {
      setJoinLoading(false);
      setJoinError(null);
      return;
    }
    setJoinLoading(true);
    setJoinError(null);
    fetch(`/api/demo-order-sync?code=${encodeURIComponent(params.join)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { orders?: unknown[] } | null) => {
        const order = payload?.orders?.[0];
        if (order) {
          restoreSharedOrder(order);
        } else {
          setJoinError('Order not found - the founder may need to open the app once to sync it. Tap "Try again" after they do.');
        }
      })
      .catch(() => {
        setJoinError('Could not reach the server. Check your connection and tap "Try again".');
      })
      .finally(() => setJoinLoading(false));
  }, [joinRetry, joinedOrder, params.join, restoreSharedOrder]);

  useEffect(() => {
    if (params.new !== '1' || consumedNewParamRef.current) return;
    consumedNewParamRef.current = true;
    router.replace('/new-order');
  }, [params.new, router, selectBrand]);

  useEffect(() => {
    if (!session?.user) return;
    setActiveParticipant(accountParticipant.id);
  }, [accountParticipant.id, session?.user.id, setActiveParticipant]);

  const brand = selectedBrand ?? joinedOrder?.brand ?? null;
  const order = brand
    ? newOrderMode
      ? null
      : visibleOrJoinedOrders.find((candidate) => candidate.brand === brand && candidate.status !== 'shipped') ??
        visibleOrJoinedOrders.find((candidate) => candidate.brand === brand)
    : null;
  const store = brand ? demoStores[brand] : null;
  const products = brand ? productsForBrand(brand) : [];
  const categoryProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return products.filter((product) => {
      const inCategory = product.category === category;
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.colors.some((color) => color.toLowerCase().includes(query));
      return inCategory && matchesSearch;
    });
  }, [category, productSearch, products]);
  const activeParticipant =
    order?.participants.find((participant) => participant.id === activeParticipantId) ?? accountParticipant;
  const activePendingItems = useMemo(
    () => pendingCheckoutItems.filter((item) => item.orderId === order?.id && item.participantId === activeParticipantId),
    [activeParticipantId, order?.id, pendingCheckoutItems],
  );
  const orderLocked = order ? order.closesAt <= nowMs || order.status !== 'collecting' : false;
  const addressMissing = order ? !isCompleteDeliveryAddress(order.deliveryAddress) : false;
  const isFounder = order?.createdBy === activeParticipantId;
  const isAuthenticated = !!session?.user;
  const customTimerMinutes = normalizeTimerMinutes(customTimer);
  const addressQuery = newOrderMode ? setupDeliveryAddress : order?.deliveryAddress ?? '';
  const setupReady = !!setupBrand && !!customTimerMinutes && isCompleteDeliveryAddress(setupDeliveryAddress);
  useEffect(() => {
    if (!session?.user.id || !order || order.createdBy !== 'user-a') return;
    claimOrderFounder(order.id, accountParticipant);
  }, [accountParticipant, claimOrderFounder, order?.createdBy, order?.id, session?.user.id]);

  useEffect(() => {
    const value = addressQuery.trim();
    const fallback = getAddressSuggestions(value);
    if (value.length < 2) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => {
      setAddressLoading(true);
      const query = splitAddressQuery(value);
      Promise.all([
        searchCities(query.city, language, controller.signal),
        query.street.length >= 2
          ? searchStreets(query.street, query.hasCityPart ? query.city : '', language, controller.signal)
          : Promise.resolve([]),
      ])
        .then(([cities, streets]) => {
          const bestCities = cities.slice(0, 5);
          const streetCitySuggestions =
            streets.length > 0
              ? streets.slice(0, 5).flatMap((street) => {
                  if (street.includes(',')) return [street];
                  const cityMatches = bestCities.length > 0 ? bestCities.slice(0, 3) : query.hasCityPart && query.city ? [query.city] : [];
                  return cityMatches.length > 0 ? cityMatches.map((city) => `${street}, ${city}`) : [street];
                })
              : [];
          const cityOnlySuggestions = bestCities.map((city) => (query.hasCityPart && query.street ? `${query.street}, ${city}` : city));
          setAddressSuggestions(uniqueAddressSuggestions([...streetCitySuggestions, ...cityOnlySuggestions, ...fallback]).slice(0, 6));
        })
        .catch(() => {
          if (!controller.signal.aborted) setAddressSuggestions(fallback);
        })
        .finally(() => {
          if (!controller.signal.aborted) setAddressLoading(false);
        });
    }, 220);

    return () => {
      controller.abort();
      globalThis.clearTimeout(timer);
    };
  }, [addressQuery, language]);

  useEffect(() => {
    if (!params.join || isAuthenticated) return;
    void stashPendingInvite(params.join);
  }, [isAuthenticated, params.join]);

  const selectAddressSuggestion = (suggestion: string) => {
    if (newOrderMode) {
      setSetupDeliveryAddress(suggestion);
    } else if (order) {
      updateDeliveryAddress(order.id, suggestion);
    }
  };

  const openNewOrderSetup = (nextBrand?: DemoBrandId) => {
    const targetBrand = nextBrand ?? brand ?? null;
    router.push(targetBrand ? (`/new-order?brand=${targetBrand}` as never) : ('/new-order' as never));
  };

  const createSetupOrder = () => {
    if (!setupBrand || !customTimerMinutes || !isCompleteDeliveryAddress(setupDeliveryAddress)) return;
    const orderId = createNewOrder(setupBrand, accountParticipant, customTimerMinutes);
    updateDeliveryAddress(orderId, setupDeliveryAddress.trim());
    selectBrand(setupBrand);
    setNewOrderMode(false);
    setSetupBrand(null);
    setSetupDeliveryAddress('');
    setAddressSuggestions([]);
    router.replace('/user');
  };

  const createOrder = (nextBrand: DemoBrandId) => {
    const existingOrder = visibleOrJoinedOrders.find((candidate) => candidate.brand === nextBrand && candidate.status !== 'shipped');
    if (existingOrder) {
      selectBrand(nextBrand);
      ensureOrder(nextBrand, accountParticipant);
      return;
    }
    openNewOrderSetup(nextBrand);
  };

  const inviteLink = order ? buildSharedDemoInviteLink(order) : '';
  const shareMessage = order
    ? buildInviteMessage(activeParticipant.name, order.brand, inviteLink, order.inviteCode)
    : '';

  const copyInvite = async () => {
    if (!shareMessage) return;
    await Clipboard.setStringAsync(shareMessage);
    setCopied(true);
    globalThis.setTimeout(() => setCopied(false), 2000);
  };

  const setOrderTimer = (minutes: number) => {
    if (!order) return;
    updateTimer(order.id, minutes);
    setNowMs(Date.now());
  };

  const goToOrderHome = () => {
    consumedNewParamRef.current = true;
    setNewOrderMode(false);
    setSetupBrand(null);
    setSetupDeliveryAddress('');
    setAddressSuggestions([]);
    setProductSearch('');
    selectBrand(null);
    router.replace('/user');
  };

  const openStoryVideo = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.assign('/shakana-story.html');
    }
  };

  if (!brand || !store) {
    return (
      <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <DemoPage>
          <View style={styles.topBar}>
            <Text style={styles.logo}>shakana</Text>
            <View style={styles.topActions}>
              <DemoButton label="New order" onPress={() => openNewOrderSetup()} tone="accent" style={styles.smallBtn} />
              <DemoButton label="How it works" onPress={() => router.push('/how-it-works')} tone="light" style={styles.smallBtn} />
              <DemoButton label="Profile" onPress={() => router.push('/profile')} tone="light" style={styles.smallBtn} />
              <DemoButton label="Store login" onPress={() => router.push('/store')} tone="light" style={styles.smallBtn} />
            </View>
          </View>
          {joinLoading ? (
            <Card style={styles.joinStateCard}>
              <View style={styles.addressLoadingRow}>
                <ActivityIndicator size="small" color={colors.acc} />
                <Text style={styles.joinStateTitle}>Loading shared order</Text>
              </View>
              <Text style={styles.muted}>We are opening the invite and checking the latest cart state.</Text>
            </Card>
          ) : null}
          {joinError ? (
            <Card style={styles.joinStateCard}>
              <Text style={styles.joinStateTitle}>Invite needs attention</Text>
              <Text style={styles.muted}>{joinError}</Text>
              <View style={styles.lockActions}>
                <DemoButton label="Try again" onPress={() => setJoinRetry((value) => value + 1)} tone="accent" style={styles.lockActionBtn} />
                <DemoButton label="Back home" onPress={goToOrderHome} tone="light" style={styles.lockActionBtn} />
              </View>
            </Card>
          ) : null}
          <Card style={styles.savingsHero}>
            <View style={styles.savingsHeroTop}>
              <View style={styles.savingsHeroAmountBlock}>
                <Text style={styles.savingsHeroAmount}>{formatMoney(47, language)}</Text>
                <Text style={styles.savingsHeroAmountLabel}>
                  {language === 'he' ? 'חיסכון ממוצע{break}לשכן'.replace('{break}', '\n') : 'avg saved\nper neighbor'}
                </Text>
              </View>
              <View style={styles.savingsHeroStats}>
                <View style={styles.savingsHeroStat}>
                  <Text style={styles.savingsHeroStatValue}>{formatMoney(0, language)}</Text>
                  <Text style={styles.savingsHeroStatLabel}>{language === 'he' ? 'משלוח\nבהזמנה קבוצתית' : 'shipping\nwhen grouped'}</Text>
                </View>
                <View style={styles.savingsHeroDivider} />
                <View style={styles.savingsHeroStat}>
                  <Text style={styles.savingsHeroStatValue}>{formatMoney(299, language)}</Text>
                  <Text style={styles.savingsHeroStatLabel}>{language === 'he' ? 'יעד משלוח\nחינם ב-H&M' : 'H&M free\nship goal'}</Text>
                </View>
                <View style={styles.savingsHeroDivider} />
                <View style={styles.savingsHeroStat}>
                  <Text style={styles.savingsHeroStatValue}>3+</Text>
                  <Text style={styles.savingsHeroStatLabel}>neighbors{'\n'}unlock it</Text>
                </View>
              </View>
            </View>
            <Text style={styles.savingsHeroBody}>
              {language === 'he'
                ? `שרון, נועה וליאור מזמינים כל אחד בערך ${formatMoney(100, language)} מ-H&M. ההזמנה המשותפת שלהם של ${formatMoney(307, language)} מקבלת משלוח חינם, כל שכן חוסך ${formatMoney(29, language)}, ובניין פעיל יכול לחסוך בערך ${formatMoney(2400, language)} בשנה.`
                : `Sharone, Noa, and Lior each order around ${formatMoney(100, language)} from H&M. Their ${formatMoney(307, language)} combined order ships free, each neighbor saves ${formatMoney(29, language)} on delivery, and an active building can save about ${formatMoney(2400, language)} a year.`}
            </Text>
            <View style={styles.heroBtnRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTourOpen(true)}
                style={({ pressed }) => [styles.tourBtn, styles.tourBtnHalf, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.tourBtnLabel}>Step-by-step tour</Text>
              </Pressable>
              {Platform.OS === 'web' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={openStoryVideo}
                  style={({ pressed }) => [styles.tourBtn, styles.storyVidBtn, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.tourBtnLabel}>Open story video</Text>
                </Pressable>
              ) : null}
            </View>
          </Card>
          <BuildingSections
            orders={visibleOrders}
            onOpenStore={() => router.push('/store')}
            onOpenLogin={() => router.push('/login')}
            onChooseBrand={(brand) => {
              if (newOrderMode) {
                setSetupBrand(brand);
              } else {
                selectBrand(brand);
              }
              setCategory('Best Sellers');
            }}
          />
          <Card style={styles.whatsappCard}>
            <Text style={styles.whatsappTitle}>{language === 'he' ? 'Join from WhatsApp' : 'Join from WhatsApp'}</Text>
            <Text style={styles.muted}>
              {language === 'he'
                ? 'Open the invite link from WhatsApp and the shared cart loads directly, with no code and no paste field.'
                : 'Open the invite link from WhatsApp and the shared cart loads directly, with no code and no paste field.'}
            </Text>
          </Card>
          {(session || params.founder === '1') ? (
          <Card style={styles.demoScriptCard}>
            <View style={styles.demoScriptCopy}>
              <Text style={styles.whatsappTitle}>Presentation controls</Text>
              <Text style={styles.muted}>Reset before a meeting, then follow the short founder demo script.</Text>
            </View>
            <View style={styles.lockActions}>
              <DemoButton label="View script" onPress={() => router.push('/how-it-works')} tone="light" style={styles.lockActionBtn} />
              <DemoButton
                label="Reset demo"
                onPress={() => {
                  resetDemo();
                  router.replace('/login');
                }}
                tone="danger"
                style={styles.lockActionBtn}
              />
            </View>
          </Card>
          ) : null}
          <SectionTitle title="Start a new order" kicker="Address, store, name, then invite" />
          {newOrderMode ? (
            <Card style={styles.setupCard}>
              <Text style={styles.setupTitle}>Set up the order first</Text>
              <Text style={styles.muted}>
                Choose the store, timer, and delivery address. The group order opens only after all three are ready.
              </Text>
              <View style={styles.setupSteps}>
                <View style={[styles.setupStep, !!customTimerMinutes && styles.setupStepDone]}>
                  <Text style={styles.setupStepNumber}>1</Text>
                  <Text style={styles.setupStepText}>Timer</Text>
                </View>
                <View style={[styles.setupStep, setupBrand && styles.setupStepDone]}>
                  <Text style={styles.setupStepNumber}>2</Text>
                  <Text style={styles.setupStepText}>Store</Text>
                </View>
                <View style={[styles.setupStep, isCompleteDeliveryAddress(setupDeliveryAddress) && styles.setupStepDone]}>
                  <Text style={styles.setupStepNumber}>3</Text>
                  <Text style={styles.setupStepText}>Street + number + city</Text>
                </View>
              </View>
            </Card>
          ) : null}
          <View style={styles.storeGrid}>
            {newOrderMode ? (
              <Card style={styles.preLaunchTimer}>
                <Text style={styles.timerTitle}>1. Set order duration</Text>
                <View style={styles.customTimerBox}>
                  <TextInput
                    value={customTimer}
                    onChangeText={(value) => setCustomTimer(value.replace(/[^\d]/g, '').slice(0, 3))}
                    keyboardType="number-pad"
                    placeholder="45"
                    style={styles.customTimerInput}
                  />
                  <Text style={styles.timerText}>minutes</Text>
                </View>
                <Text style={styles.muted}>This timer starts only when you press Create order.</Text>
              </Card>
            ) : null}
            {(['hm', 'zara', 'amazon'] as DemoBrandId[]).map((brandId) => {
              const option = demoStores[brandId];
              return (
                <Pressable
                  key={brandId}
                  accessibilityRole="button"
                  onPress={() => {
                    openNewOrderSetup(brandId);
                    setCategory('Best Sellers');
                  }}
                  style={({ pressed }) => [
                    styles.storeChoice,
                    pressed && demoStyles.pressed,
                  ]}
                >
                  <ImageBackground source={{ uri: option.heroImage }} resizeMode="cover" style={styles.storeChoiceImage}>
                    <View style={styles.storeOverlay}>
                      <BrandPill brand={brandId} />
                      <Text style={styles.storeName}>{option.name}</Text>
                      <Text style={styles.storeTagline}>{option.tagline}</Text>
                    </View>
                  </ImageBackground>
                </Pressable>
              );
            })}
          </View>
          <Card style={styles.homeStepperCard}>
            <View style={styles.homeStepperHeader}>
              <Text style={styles.homeStepperTitle}>One clean setup flow</Text>
              <Text style={styles.muted}>Choose any store above and Shakana opens the guided order page.</Text>
            </View>
            <View style={styles.homeStepperSteps}>
              {[
                ['1', 'Address first', 'Street, number, city'],
                ['2', 'Store locked', 'Amazon, Zara, or H&M'],
                ['3', 'Your name', 'Shown to friends and store'],
                ['4', 'Copy invite', 'Share link or code'],
              ].map(([num, title, body]) => (
                <View key={num} style={styles.homeStepperStep}>
                  <Text style={styles.homeStepperNum}>{num}</Text>
                  <View style={styles.homeStepperCopy}>
                    <Text style={styles.homeStepperStepTitle}>{title}</Text>
                    <Text style={styles.homeStepperStepBody}>{body}</Text>
                  </View>
                </View>
              ))}
            </View>
            <DemoButton label="Open full setup" onPress={() => openNewOrderSetup()} tone="accent" />
          </Card>
          {newOrderMode ? (
            <Card style={styles.setupCard}>
              <Text style={styles.timerTitle}>3. Delivery address</Text>
              <View style={styles.addressRequirementBox}>
                <Text style={styles.addressRequirementTitle}>House number required</Text>
                <Text style={styles.addressRequirementText}>
                  Type the full address in this format: street + house number, city. Example: Herzl 12, Petah Tikva.
                </Text>
              </View>
              <TextInput
                value={setupDeliveryAddress}
                onChangeText={setSetupDeliveryAddress}
                placeholder="Street + house number, city"
                style={[styles.addressInput, setupDeliveryAddress.trim().length > 0 && !isCompleteDeliveryAddress(setupDeliveryAddress) && styles.addressInputMissing]}
                accessibilityLabel="New order delivery address"
                autoComplete="street-address"
                autoCorrect={false}
              />
              {addressLoading ? (
                <View style={styles.addressLoadingRow}>
                  <ActivityIndicator size="small" color={colors.acc} />
                  <Text style={styles.addressLoadingText}>Looking for matching streets and cities</Text>
                </View>
              ) : null}
              {addressSuggestions.length > 0 ? (
                <View style={styles.addressSuggestionList}>
                  {addressSuggestions.map((suggestion) => (
                    <Pressable
                      key={suggestion}
                      accessibilityRole="button"
                      onPress={() => selectAddressSuggestion(suggestion)}
                      style={({ pressed }) => [styles.addressSuggestion, pressed && demoStyles.pressed]}
                    >
                      <Text style={styles.addressSuggestionText}>{suggestion}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <DemoButton
                label={setupReady ? 'Create order' : 'Add timer, store, street number, and city'}
                onPress={createSetupOrder}
                disabled={!setupReady}
                tone="accent"
              />
              {!setupReady ? (
                <Text style={styles.validationText}>
                  {addressValidationMessage(setupDeliveryAddress, language)}
                </Text>
              ) : null}
            </Card>
          ) : null}
        </DemoPage>
      </ScrollView>
      {tourOpen ? <DemoTour onClose={() => setTourOpen(false)} /> : null}
      </>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <DemoPage wide>
        <View style={styles.topBar}>
          <Pressable onPress={goToOrderHome} accessibilityRole="button">
            <Text style={styles.logo}>shakana demo</Text>
          </Pressable>
          <View style={styles.topActions}>
            <DemoButton label="Home" onPress={goToOrderHome} tone="light" style={styles.smallBtn} />
            <DemoButton label="New order" onPress={() => openNewOrderSetup()} tone="accent" style={styles.smallBtn} />
            <DemoButton label="Profile" onPress={() => router.push('/profile')} tone="light" style={styles.smallBtn} />
            <DemoButton label="Merchant view" onPress={() => router.push('/store')} tone="light" style={styles.smallBtn} />
          </View>
        </View>

        <ImageBackground source={{ uri: store.heroImage }} resizeMode="cover" style={styles.hero}>
          <View style={styles.heroOverlay}>
            <View style={styles.heroHeaderRow}>
              <BrandPill brand={brand} />
              {order ? (
                <SelfUpdatingTimerRing
                  closesAt={order.closesAt}
                  createdAt={order.createdAt}
                  onTimerEnd={() => setNowMs(Date.now())}
                />
              ) : null}
            </View>
            <Text style={styles.heroTitle}>{store.name}</Text>
            <Text style={styles.heroSubtitle}>{store.tagline}</Text>
            <Text style={styles.heroMeta}>{store.deliveryEta}</Text>
            <View style={styles.heroActions}>
              <DemoButton
                label={order ? 'Back to home' : 'Create group order'}
                onPress={order ? goToOrderHome : () => createOrder(brand)}
                tone="accent"
                style={styles.heroBtn}
              />
              <DemoButton label="New order" onPress={() => openNewOrderSetup()} tone="light" style={styles.heroBtn} />
            </View>
          </View>
        </ImageBackground>

        <CelebrationBanner pulse={lastPulse} />
        {lastNotice ? (
          <Card style={styles.notice}>
            <Text style={styles.noticeText}>{lastNotice}</Text>
          </Card>
        ) : null}

        <View style={styles.mainGrid}>
          <View style={[styles.catalogColumn, order && styles.catalogColumnBelow, order && Platform.OS === 'web' && ({ order: 2 } as any)]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {demoCategories.map((name) => (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  onPress={() => setCategory(name)}
                  style={[styles.categoryPill, category === name && { backgroundColor: store.accent }]}
                >
                  <Text style={[styles.categoryText, category === name && styles.categoryTextActive]}>{name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput
              value={productSearch}
              onChangeText={setProductSearch}
              placeholder={`Search ${store.name} catalog`}
              placeholderTextColor={colors.mu2}
              style={styles.productSearchInput}
              accessibilityLabel="Search products"
            />

            <SectionTitle
              title={category}
              kicker={order ? `Browsing ${store.name} (locked for group order)` : `${store.name} catalog`}
            />
            {order ? (
              <View style={styles.lockBadge}>
                <Text style={styles.lockBadgeText}>Store Locked for Group Order {order.id}</Text>
              </View>
            ) : null}
            {categoryProducts.length === 0 ? (
              <EmptyNotice title="No products match" body="Clear search or choose another category to keep browsing." />
            ) : (
              <View style={styles.productGrid}>
                {categoryProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    orderId={order?.id ?? null}
                    activeParticipantId={activeParticipantId}
                    activeParticipant={activeParticipant}
                    isAuthenticated={isAuthenticated}
                    orderLocked={orderLocked}
                    onAddPending={(item) => {
                      setPendingCheckoutItems((current) => [item, ...current]);
                    }}
                    onRequireLogin={async () => {
                      if (order) await stashPendingInvite(order.inviteCode);
                      router.push('/login');
                    }}
                    onCreateOrder={() => createOrder(brand)}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={[styles.cartColumn, order && styles.cartColumnWide, order && Platform.OS === 'web' && ({ order: 1 } as any)]}>
            {!order ? (
              <EmptyNotice
                title="Create your first group order"
                body="Pick a store, create the shared session, then add exact variants to the group cart."
              />
            ) : (
              <>
                {!isAuthenticated ? (
                  <Card style={styles.authGate}>
                    <Text style={styles.authTitle}>Log in to add your items</Text>
                    <Text style={styles.muted}>
                      You can browse this shared catalog now. Before adding products to the main cart,
                      sign in so your items, privacy choices, and delivery details are saved.
                    </Text>
                    <DemoButton
                      label="Log in and return to this cart"
                      onPress={async () => {
                        await stashPendingInvite(order.inviteCode);
                        router.push('/login');
                      }}
                      tone="accent"
                    />
                  </Card>
                ) : null}
                <Card style={styles.cartCard}>
                  <View style={styles.rowBetween}>
                    <View>
                      <Text style={styles.cartTitle}>Group cart</Text>
                      <Text style={styles.muted}>{order.id} | Code {order.inviteCode}</Text>
                    </View>
                    <Text style={styles.total}>{formatMoney(getOrderTotal(order), language)}</Text>
                  </View>
                  <StatusRail status={order.status} />
                  {orderLocked ? (
                    <Card style={styles.lockNotice}>
                      <Text style={styles.lockTitle}>Cart locked for merchant review</Text>
                      <Text style={styles.muted}>
                        The timer ended or the store already started fulfillment. New items are paused for this order.
                      </Text>
                      <View style={styles.lockActions}>
                        <DemoButton label="Back to main page" onPress={goToOrderHome} tone="light" style={styles.lockActionBtn} />
                        <DemoButton label="Open new order" onPress={() => openNewOrderSetup()} tone="accent" style={styles.lockActionBtn} />
                      </View>
                    </Card>
                  ) : null}
                  <View style={styles.timerPanel}>
                    <View style={styles.rowBetween}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.timerTitle}>Founder timer</Text>
                        <Text style={styles.muted}>
                          {isFounder
                            ? 'Choose how long friends have to join this cart.'
                            : 'Only the cart founder can change this timer.'}
                        </Text>
                      </View>
                      <SelfUpdatingTimerRing
                        closesAt={order.closesAt}
                        createdAt={order.createdAt}
                        onTimerEnd={() => setNowMs(Date.now())}
                        label="left"
                      />
                    </View>
                    <View style={styles.timerActions}>
                      <DemoButton
                        label="30 min"
                        onPress={() => setOrderTimer(30)}
                        disabled={!isFounder}
                        tone="accent"
                        style={styles.timerBtn}
                      />
                      <DemoButton
                        label="60 min"
                        onPress={() => setOrderTimer(60)}
                        disabled={!isFounder}
                        tone="light"
                        style={styles.timerBtn}
                      />
                      <View style={styles.customTimerBox}>
                        <TextInput
                          value={customTimer}
                          onChangeText={(value) => setCustomTimer(value.replace(/[^\d]/g, '').slice(0, 3))}
                          keyboardType="number-pad"
                          placeholder="45"
                          editable={isFounder}
                          style={styles.customTimerInput}
                          accessibilityLabel="Custom timer minutes"
                        />
                        <DemoButton
                          label="Set custom"
                          onPress={() => {
                            if (!customTimerMinutes) return;
                            setCustomTimer(String(customTimerMinutes));
                            setOrderTimer(customTimerMinutes);
                          }}
                          disabled={!isFounder || !customTimerMinutes}
                          tone="accent"
                          style={styles.customTimerButton}
                        />
                      </View>
                    </View>
                    {customTimer.trim() && !customTimerMinutes ? (
                      <Text style={styles.validationText}>Enter a timer from 1 to 720 minutes.</Text>
                    ) : null}
                  </View>
                  <View style={styles.addressPanel}>
                    <Text style={styles.timerTitle}>Delivery address</Text>
                    <View style={styles.addressRequirementBox}>
                      <Text style={styles.addressRequirementTitle}>House number required</Text>
                      <Text style={styles.addressRequirementText}>
                        The merchant needs the exact house/building number. Example: Herzl 12, Petah Tikva.
                      </Text>
                    </View>
                    <TextInput
                      value={order.deliveryAddress}
                      onChangeText={(value) => updateDeliveryAddress(order.id, value)}
                      placeholder="Street + house number, city"
                      style={[styles.addressInput, addressMissing && styles.addressInputMissing]}
                      accessibilityLabel="Shared order delivery address"
                      autoComplete="street-address"
                      autoCorrect={false}
                    />
                    {addressLoading ? (
                      <View style={styles.addressLoadingRow}>
                        <ActivityIndicator size="small" color={colors.acc} />
                        <Text style={styles.addressLoadingText}>Looking for matching streets and cities</Text>
                      </View>
                    ) : null}
                    {addressSuggestions.length > 0 ? (
                      <View style={styles.addressSuggestionList}>
                        {addressSuggestions.map((suggestion) => (
                          <Pressable
                            key={suggestion}
                            accessibilityRole="button"
                            onPress={() => selectAddressSuggestion(suggestion)}
                            style={({ pressed }) => [
                              styles.addressSuggestion,
                              pressed && demoStyles.pressed,
                            ]}
                          >
                            <Text style={styles.addressSuggestionText}>{suggestion}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                    <Text style={addressMissing ? styles.validationText : styles.muted}>
                      {addressMissing
                        ? addressValidationMessage(order.deliveryAddress)
                        : 'This is the address the merchant sees for the final shipment.'}
                    </Text>
                  </View>
                  <View style={styles.shareProofRow}>
                    <View style={styles.trustPill}>
                      <Text style={styles.trustValue}>{activeParticipant.name}</Text>
                      <Text style={styles.trustLabel}>Verified neighbor</Text>
                    </View>
                    <View style={styles.trustPillSoft}>
                      <Text style={styles.trustValue}>{order.participants.length}</Text>
                      <Text style={styles.trustLabel}>Joined now</Text>
                    </View>
                  </View>
                  <View style={styles.participants}>
                    {order.participants.map((participant) => {
                      const active = activeParticipantId === participant.id;
                      const verified = order.items.some((item) => item.participantId === participant.id);
                      return (
                        <Pressable
                          key={participant.id}
                          accessibilityRole="button"
                          onPress={() => setActiveParticipant(participant.id)}
                          style={[styles.participantPill, styles.joinedPill, active && styles.activePill]}
                        >
                          <View style={styles.participantRow}>
                            <Text style={[styles.participantText, active && styles.activePillText]}>
                              {participant.name}
                            </Text>
                            {verified ? <Text style={styles.participantBadge}>verified</Text> : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.inviteBox}>
                    <Text style={styles.kicker}>WhatsApp-style invite</Text>
                    <Text style={styles.inviteCardPreview}>{shareMessage}</Text>
                    <Text style={styles.inviteText}>{shareMessage}</Text>
                    <DemoButton
                      label={copied ? 'Invite copied' : 'Share with friends'}
                      onPress={copyInvite}
                      tone="light"
                    />
                  </View>
                </Card>

                <SavingsPanel order={order} />
                <SavingsTracker orders={visibleOrders} activeParticipantId={activeParticipantId} />

                <Card style={styles.cartCard}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cartTitle}>Paid order items</Text>
                    <Text style={styles.muted}>{getOrderItemCount(order)} units</Text>
                  </View>
                  {activePendingItems.length > 0 ? (
                    <View style={styles.pendingCheckoutBox}>
                      <View style={styles.rowBetween}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pendingTitle}>Ready for checkout</Text>
                          <Text style={styles.muted}>
                            These items are private drafts. The group and merchant see them only after payment.
                          </Text>
                        </View>
                        <Text style={styles.pendingCount}>{activePendingItems.length}</Text>
                      </View>
                      <View style={styles.itemList}>
                        {activePendingItems.map((item) => {
                          const product = findProduct(item.productId);
                          const lineTotal = (product?.price ?? 0) * item.quantity;
                          return (
                            <View key={item.localId} style={styles.cartItem}>
                              {product ? (
                                <Image source={{ uri: getProductImage(product, item.color) }} style={styles.cartItemImage} resizeMode="cover" />
                              ) : (
                                <View style={styles.cartItemImagePlaceholder}>
                                  <Text style={styles.cartItemImageText}>Item</Text>
                                </View>
                              )}
                              <View style={{ flex: 1 }}>
                                <Text style={styles.itemName}>{item.private ? 'Private item' : product?.name ?? 'Item'}</Text>
                                <Text style={styles.muted}>{item.size}, {item.color} | Qty {item.quantity}</Text>
                              </View>
                              <Text style={styles.itemPrice}>{formatMoney(lineTotal, language)}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}
                  {order.items.length === 0 ? (
                    <Text style={styles.muted}>
                      No paid items yet. Select variants, add them to checkout, then pay to place them in the group order.
                    </Text>
                  ) : (
                    <View style={styles.itemList}>
                      {order.items.map((item) => {
                        const line = getProductLine(item);
                        const owner = order.participants.find((participant) => participant.id === item.participantId);
                        const privateForViewer = item.private && item.participantId !== activeParticipantId;
                        return (
                          <View key={item.id} style={styles.cartItem}>
                            {privateForViewer ? (
                              <View style={styles.cartItemImagePlaceholder}>
                                <Text style={styles.cartItemImageText}>Private</Text>
                              </View>
                            ) : line.product ? (
                              <Image source={{ uri: getProductImage(line.product, item.color) }} style={styles.cartItemImage} resizeMode="cover" />
                            ) : (
                              <View style={styles.cartItemImagePlaceholder}>
                                <Text style={styles.cartItemImageText}>Item</Text>
                              </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemName}>
                                {privateForViewer ? 'Private item' : line.displayName}
                              </Text>
                              <Text style={styles.muted}>
                                {owner?.name ?? 'Guest'} | {privateForViewer ? 'Contribution hidden' : `${item.size}, ${item.color}`} | Qty {item.quantity}
                              </Text>
                            </View>
                            <Text style={styles.itemPrice}>{formatMoney(line.lineTotal, language)}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                  <PayButton
                    order={order}
                    activeParticipantId={activeParticipantId}
                    pendingItems={activePendingItems}
                    onPay={() => {
                      setCheckoutItems(activePendingItems);
                      setPayStep('form');
                      setPayModalOpen(true);
                    }}
                  />
                </Card>
              </>
            )}
          </View>
        </View>
      </DemoPage>
      {payModalOpen && order ? (
        <MockPaymentModal
          order={order}
          activeParticipantId={activeParticipantId}
          activeParticipantName={activeParticipant.name}
          pendingItems={checkoutItems}
          step={payStep}
          onConfirm={() => {
            const itemsToCommit = checkoutItems;
            if (itemsToCommit.length === 0) return;
            setPayStep('processing');
            globalThis.setTimeout(() => {
              itemsToCommit.forEach((item) => {
                addItem(order.id, {
                  productId: item.productId,
                  participantId: item.participantId,
                  participant: item.participant,
                  size: item.size,
                  color: item.color,
                  quantity: item.quantity,
                  private: item.private,
                });
              });
              simulatePayment(order.id, activeParticipantId);
              setPendingCheckoutItems((current) =>
                current.filter((item) => !itemsToCommit.some((paidItem) => paidItem.localId === item.localId)),
              );
              setPayStep('success');
            }, 2200);
          }}
          onClose={() => {
            setPayModalOpen(false);
            if (payStep === 'success') setCheckoutItems([]);
          }}
        />
      ) : null}
    </ScrollView>
  );
}

function ProductCard({
  product,
  orderId,
  activeParticipantId,
  activeParticipant,
  isAuthenticated,
  orderLocked,
  onAddPending,
  onRequireLogin,
  onCreateOrder,
}: {
  product: DemoProduct;
  orderId: string | null;
  activeParticipantId: string;
  activeParticipant: DemoParticipant;
  isAuthenticated: boolean;
  orderLocked: boolean;
  onAddPending: (item: PendingCheckoutItem) => void;
  onRequireLogin: () => void;
  onCreateOrder: () => void;
}) {
  const { language } = useLocale();
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [privateItem, setPrivateItem] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const ready = !!orderId && isAuthenticated && !orderLocked && !!size && !!color && quantity > 0;
  const productSaving = Math.max(0, product.compareAtPrice - product.price);
  const currentImageUri = getProductImage(product, color || undefined);

  return (
    <Card style={styles.productCard}>
      <ProductImage product={product} imageUri={currentImageUri} />
      <View style={styles.productInfo}>
        <View style={styles.rowBetween}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.price}>{formatMoney(product.price, language)}</Text>
        </View>
        <Text style={styles.muted}>{product.description}</Text>
        <Text style={styles.sku}>
          {product.sku} | {product.stockStatus} | {language === 'he' ? 'חיסכון' : 'Save'} {formatMoney(productSaving, language)}
        </Text>
        <Text style={styles.selectorLabel}>Size</Text>
        <View style={styles.optionRow}>
          {product.sizes.map((option) => (
            <Pressable
              key={option}
              testID={`size-${product.id}-${option}`}
              accessibilityRole="button"
              onPress={() => setSize(option)}
              style={[styles.option, size === option && styles.optionActive]}
            >
              <Text style={[styles.optionText, size === option && styles.optionTextActive]}>{option}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.selectorLabel}>Color</Text>
        <View style={styles.optionRow}>
          {product.colors.map((option) => (
            <Pressable
              key={option}
              testID={`color-${product.id}-${option}`}
              accessibilityRole="button"
              onPress={() => setColor(option)}
              style={[styles.option, color === option && styles.optionActive]}
            >
              <Text style={[styles.optionText, color === option && styles.optionTextActive]}>{option}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.qtyRow}>
          <DemoButton label="-" onPress={() => setQuantity(Math.max(1, quantity - 1))} tone="light" style={styles.qtyBtn} />
          <Text style={styles.qtyText}>Qty {quantity}</Text>
          <DemoButton label="+" onPress={() => setQuantity(quantity + 1)} tone="light" style={styles.qtyBtn} />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: privateItem }}
            onPress={() => setPrivateItem((value) => !value)}
            style={[styles.privateToggle, privateItem && styles.privateToggleActive]}
          >
            <Text style={[styles.privateText, privateItem && styles.privateTextActive]}>Private</Text>
          </Pressable>
        </View>
        {!orderId ? (
          <DemoButton label="Create group order first" onPress={onCreateOrder} tone="accent" />
        ) : !isAuthenticated ? (
          <DemoButton label="Log in to add item" onPress={onRequireLogin} tone="accent" />
        ) : orderLocked ? (
          <DemoButton label="Cart locked" onPress={() => {}} disabled tone="light" />
        ) : (
          <DemoButton
            testID={`add-${product.id}`}
            label={isAdded ? 'Added to checkout' : ready ? 'Add to checkout' : 'Select size and color'}
            disabled={!ready || isAdded}
            onPress={() => {
              if (!orderId) return;
              onAddPending({
                localId: `${product.id}-${activeParticipantId}-${Date.now()}`,
                orderId,
                productId: product.id,
                participantId: activeParticipantId,
                participant: activeParticipant,
                size,
                color,
                quantity,
                private: privateItem,
              });
              setIsAdded(true);
              globalThis.setTimeout(() => setIsAdded(false), 1500);
            }}
            tone={isAdded ? 'light' : 'accent'}
          />
        )}
      </View>
    </Card>
  );
}

function PayButton({
  order,
  pendingItems,
  onPay,
}: {
  order: DemoOrder;
  activeParticipantId: string;
  pendingItems: PendingCheckoutItem[];
  onPay: () => void;
}) {
  const { language } = useLocale();
  if (pendingItems.length === 0) return null;

  const myItemsTotal = pendingItems.reduce((sum, item) => {
    const product = findProduct(item.productId);
    return sum + (product?.price ?? 0) * item.quantity;
  }, 0);
  const existingGroupTotal = order.items.reduce((sum, item) => {
    const product = findProduct(item.productId);
    return sum + (product?.price ?? 0) * item.quantity;
  }, 0);
  const groupTotal = existingGroupTotal + myItemsTotal;
  const { totalILS, savingsILS, soloShippingILS } = calcCommission(myItemsTotal, groupTotal, order.brand);
  const fmtILS = (v: number) => Number.isInteger(v) ? String(v) : v.toFixed(2);
  const total = fmtILS(Math.round(totalILS * 100) / 100);
  const withoutShakana = fmtILS(Math.round((myItemsTotal + soloShippingILS) * 100) / 100);

  return (
    <View style={payStyles.paySection}>
      {savingsILS > 0 && (
        <View style={payStyles.savingsRow}>
          <Text style={payStyles.savingsText}>
            {language === 'he'
              ? `חיסכון של ${formatMoney(Number(fmtILS(savingsILS)), language)} לעומת קנייה לבד`
              : `Saving ${formatMoney(Number(fmtILS(savingsILS)), language)} vs buying alone`}
          </Text>
        </View>
      )}
      <View style={payStyles.payRow}>
        <View>
          <Text style={payStyles.payLabel}>Checkout drafts</Text>
          <Text style={payStyles.payAmount}>{formatMoney(Number(total), language)}</Text>
          {savingsILS > 0 && (
            <Text style={payStyles.payAmountSub}>
              {language === 'he' ? `במקום ${formatMoney(Number(withoutShakana), language)}` : `instead of ${formatMoney(Number(withoutShakana), language)}`}
            </Text>
          )}
        </View>
        <DemoButton
          label={language === 'he' ? `הוסף הכל לסל ושלם ${formatMoney(Number(total), language)}` : `Add all to cart and pay ${formatMoney(Number(total), language)} now`}
          onPress={onPay}
          tone="accent"
          style={payStyles.payBtn}
        />
      </View>
      <Text style={payStyles.payMuted}>
        {language === 'he'
          ? 'פריטי טיוטה מופיעים בהזמנה הקבוצתית רק אחרי התשלום.'
          : 'Draft items become visible in the group order only after this payment.'}
      </Text>
    </View>
  );
}
function MockPaymentModal({
  order,
  activeParticipantId,
  activeParticipantName,
  pendingItems,
  step,
  onConfirm,
  onClose,
}: {
  order: DemoOrder;
  activeParticipantId: string;
  activeParticipantName: string;
  pendingItems: PendingCheckoutItem[];
  step: 'form' | 'processing' | 'success';
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { language } = useLocale();
  const myItems = pendingItems;
  const myItemsTotal = myItems.reduce((sum, item) => {
    const product = findProduct(item.productId);
    return sum + (product?.price ?? 0) * item.quantity;
  }, 0);
  const existingGroupTotal = order.items.reduce((sum, item) => {
    const product = findProduct(item.productId);
    return sum + (product?.price ?? 0) * item.quantity;
  }, 0);
  const groupTotal = existingGroupTotal + myItemsTotal;
  const { totalILS, savingsILS, soloShippingILS } = calcCommission(myItemsTotal, groupTotal, order.brand);
  const fmtILS = (v: number) => Number.isInteger(v) ? String(v) : v.toFixed(2);
  const myTotal = fmtILS(Math.round(totalILS * 100) / 100);
  const storeName = demoStores[order.brand].name;

  return (
    <View style={payStyles.overlay} pointerEvents="box-none">
      <View style={payStyles.backdrop} />
      <ScrollView contentContainerStyle={payStyles.modalScroll} style={payStyles.modalScrollOuter}>
        <View style={payStyles.modal}>
          <View style={payStyles.modalHeader}>
            <View style={payStyles.stripeLockRow}>
              <Text style={payStyles.stripeLock}>Secure</Text>
              <Text style={payStyles.stripeLabel}>Secure checkout</Text>
            </View>
            {step !== 'processing' ? (
              <Pressable onPress={onClose} accessibilityRole="button" style={payStyles.closeBtn}>
                <Text style={payStyles.closeBtnText}>X</Text>
              </Pressable>
            ) : null}
          </View>

          {step === 'form' ? (
            <>
              {savingsILS > 0 ? (
                <View style={payStyles.modalSavingsBanner}>
                  <Text style={payStyles.modalSavingsBannerText}>
                    {language === 'he'
                      ? `אתה חוסך ${formatMoney(Number(fmtILS(savingsILS)), language)}`
                      : `You're saving ${formatMoney(Number(fmtILS(savingsILS)), language)}`}
                  </Text>
                </View>
              ) : null}
              <Text style={payStyles.modalTitle}>
                {language === 'he'
                  ? `הוסף הכל לסל ושלם ${formatMoney(Number(myTotal), language)}`
                  : `Add all to cart and pay ${formatMoney(Number(myTotal), language)}`}
              </Text>
              <Text style={payStyles.modalMuted}>
                {activeParticipantName} - {myItems.length} item{myItems.length !== 1 ? 's' : ''} from {storeName}
              </Text>

              <View style={payStyles.demoNotice}>
                <Text style={payStyles.demoNoticeText}>Demo card - no real charge</Text>
              </View>

              <Text style={payStyles.fieldLabel}>Card number</Text>
              <View style={payStyles.cardField}>
                <Text style={payStyles.cardFieldText}>4242  4242  4242  4242</Text>
                <Text style={payStyles.cardBrand}>VISA</Text>
              </View>

              <View style={payStyles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={payStyles.fieldLabel}>Expiry</Text>
                  <View style={payStyles.cardField}>
                    <Text style={payStyles.cardFieldText}>12 / 27</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={payStyles.fieldLabel}>CVC</Text>
                  <View style={payStyles.cardField}>
                    <Text style={payStyles.cardFieldText}>123</Text>
                  </View>
                </View>
              </View>

              <View style={payStyles.orderSummary}>
                {myItems.map((item) => {
                  const product = findProduct(item.productId);
                  const lineTotal = (product?.price ?? 0) * item.quantity;
                  return (
                    <View key={item.localId} style={payStyles.orderLine}>
                      <Text style={payStyles.orderLineName} numberOfLines={1}>
                        {item.private ? 'Private item' : (product?.name ?? 'Item')} x{item.quantity}
                      </Text>
                      <Text style={payStyles.orderLinePrice}>{formatMoney(lineTotal, language)}</Text>
                    </View>
                  );
                })}
                <View style={payStyles.orderDivider} />
                <View style={payStyles.orderLine}>
                  <Text style={payStyles.orderLineMuted}>Subtotal</Text>
                  <Text style={payStyles.orderLineMuted}>{formatMoney(myItemsTotal, language)}</Text>
                </View>
                {savingsILS > 0 ? (
                  <>
                    <View style={payStyles.orderLine}>
                      <Text style={payStyles.orderLineMuted}>Shipping if buying alone</Text>
                      <Text style={[payStyles.orderLineMuted, payStyles.strikethrough]}>
                        {formatMoney(Number(fmtILS(soloShippingILS)), language)}
                      </Text>
                    </View>
                    <View style={payStyles.orderLine}>
                      <Text style={payStyles.orderLineSavings}>Your saving</Text>
                      <Text style={payStyles.orderLineSavings}>-{formatMoney(Number(fmtILS(savingsILS)), language)}</Text>
                    </View>
                  </>
                ) : null}
                <View style={payStyles.orderDivider} />
                <View style={payStyles.orderLine}>
                  <Text style={payStyles.orderLineTotal}>You pay today</Text>
                  <Text style={payStyles.orderLineTotal}>{formatMoney(Number(myTotal), language)}</Text>
                </View>
              </View>

              <DemoButton
                label={language === 'he' ? `הוסף הכל לסל ושלם ${formatMoney(Number(myTotal), language)}` : `Add all to cart and pay ${formatMoney(Number(myTotal), language)}`}
                onPress={onConfirm}
                tone="accent"
                style={payStyles.confirmBtn}
              />
              <Text style={payStyles.escrowNote}>
                Payment held in escrow until {storeName} ships your order
              </Text>
            </>
          ) : step === 'processing' ? (
            <View style={payStyles.processingState}>
              <ActivityIndicator size="large" color={colors.acc} />
              <Text style={payStyles.processingText}>Processing payment...</Text>
              <Text style={payStyles.processingMuted}>
                {language === 'he' ? `שומרים ${formatMoney(Number(myTotal), language)} בנאמנות` : `Securing ${formatMoney(Number(myTotal), language)} in escrow`}
              </Text>
            </View>
          ) : (
            <View style={payStyles.successState}>
              <View style={payStyles.successIcon}>
                <Text style={payStyles.successIconText}>OK</Text>
              </View>
              <Text style={payStyles.successTitle}>
                {savingsILS > 0
                  ? language === 'he'
                    ? `חסכת ${formatMoney(Number(fmtILS(savingsILS)), language)}`
                    : `You saved ${formatMoney(Number(fmtILS(savingsILS)), language)}`
                  : language === 'he' ? 'התשלום אושר' : 'Payment confirmed'}
              </Text>
              <Text style={payStyles.successMuted}>
                {savingsILS > 0
                  ? language === 'he'
                    ? `שילמת ${formatMoney(Number(myTotal), language)} במקום ${formatMoney(Number(fmtILS(Math.round((myItemsTotal + soloShippingILS) * 100) / 100)), language)}. הפריטים שלך עכשיו בהזמנה הקבוצתית.`
                    : `You paid ${formatMoney(Number(myTotal), language)} instead of ${formatMoney(Number(fmtILS(Math.round((myItemsTotal + soloShippingILS) * 100) / 100)), language)}. Your items are now in the group order.`
                  : language === 'he'
                    ? `${formatMoney(Number(myTotal), language)} נשמר בנאמנות והפריטים שלך עכשיו בהזמנה הקבוצתית.`
                    : `${formatMoney(Number(myTotal), language)} is secured and your items are now in the group order.`}
              </Text>
              <DemoButton label="Back to cart" onPress={onClose} tone="accent" style={payStyles.confirmBtn} />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const payStyles = StyleSheet.create({
  paySection: {
    borderTopWidth: 1,
    borderTopColor: colors.br,
    paddingTop: 12,
    gap: 6,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  payLabel: {
    color: colors.mu,
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  payAmount: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 26,
  },
  payAmountSub: {
    color: colors.mu,
    fontFamily: fontFamily.body,
    fontSize: 11,
    marginTop: 1,
  },
  savingsRow: {
    backgroundColor: colors.goldLight,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  savingsText: {
    color: colors.acc,
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
  },
  payBtn: { flexGrow: 1, flexBasis: 160 },
  payMuted: {
    color: colors.mu,
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    lineHeight: 17,
  },
  paidBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: colors.goldLight,
    borderWidth: 1,
    borderColor: colors.brBr,
  },
  paidBadgeText: {
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  modalScrollOuter: {
    width: '100%',
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: '100%',
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    gap: 14,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stripeLockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stripeLock: { fontSize: 16 },
  stripeLabel: {
    color: colors.mu,
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.s2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: colors.mu,
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
  },
  modalSavingsBanner: {
    backgroundColor: colors.goldLight,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  modalSavingsBannerText: {
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
  },
  modalTitle: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 32,
  },
  modalMuted: {
    color: colors.mu,
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    marginTop: -8,
  },
  demoNotice: {
    borderRadius: 14,
    backgroundColor: colors.goldLight,
    borderWidth: 1,
    borderColor: colors.brBr,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  demoNoticeText: {
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    textAlign: 'center',
  },
  fieldLabel: {
    color: colors.mu,
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  cardField: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.brBr,
    backgroundColor: colors.s2,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardFieldText: {
    color: colors.tx,
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    letterSpacing: 1,
  },
  cardBrand: {
    color: colors.mu,
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  orderSummary: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s2,
    padding: 12,
    gap: 6,
  },
  orderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  orderLineName: {
    color: colors.tx,
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    flex: 1,
  },
  orderLinePrice: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
  },
  orderDivider: {
    height: 1,
    backgroundColor: colors.br,
    marginVertical: 2,
  },
  orderLineTotal: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 17,
  },
  orderLineMuted: {
    color: colors.mu,
    fontFamily: fontFamily.body,
    fontSize: 12,
    flex: 1,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    flex: 0,
  },
  orderLineSavings: {
    color: colors.acc,
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    flex: 1,
  },
  savingsBadge: {
    backgroundColor: colors.goldLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  savingsBadgeText: {
    color: colors.acc,
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    textAlign: 'center',
  },
  confirmBtn: {
    minHeight: 52,
  },
  escrowNote: {
    color: colors.mu,
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  processingState: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 32,
  },
  processingText: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 18,
  },
  processingMuted: {
    color: colors.mu,
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
  },
  successState: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconText: {
    color: colors.acc,
    fontSize: 28,
    fontFamily: fontFamily.bodyBold,
  },
  successTitle: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 26,
  },
  successMuted: {
    color: colors.mu,
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  topActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  logo: {
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    textTransform: 'uppercase',
  },
  smallBtn: { flexGrow: 1, flexBasis: 136, minHeight: 40 },
  storeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  homeStepperCard: {
    gap: 16,
    backgroundColor: colors.s1,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.br,
  },
  homeStepperHeader: {
    gap: 4,
  },
  homeStepperTitle: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 28,
    lineHeight: 32,
  },
  homeStepperSteps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  homeStepperStep: {
    flexGrow: 1,
    flexBasis: 190,
    minHeight: 82,
    borderRadius: 20,
    backgroundColor: colors.s2,
    borderWidth: 1,
    borderColor: colors.br,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  homeStepperNum: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    color: colors.white,
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    lineHeight: 34,
    textAlign: 'center',
  },
  homeStepperCopy: {
    flex: 1,
    minWidth: 0,
  },
  homeStepperStepTitle: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
  },
  homeStepperStepBody: {
    color: colors.mu,
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 17,
  },
  whatsappCard: {
    gap: 8,
    marginTop: 4,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.goldLight,
    borderWidth: 1,
    borderColor: colors.br,
  },
  joinStateCard: {
    gap: 10,
    borderColor: colors.gold,
    backgroundColor: colors.s2,
  },
  joinStateTitle: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
  },
  demoScriptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  demoScriptCopy: {
    flex: 1,
    minWidth: 220,
  },
  whatsappTitle: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
  },
  storeChoice: {
    flexGrow: 1,
    flexBasis: 280,
    height: 320,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.s3,
  },
  storeChoiceSelected: {
    borderColor: colors.acc,
    borderWidth: 2,
  },
  storeChoiceImage: { flex: 1 },
  storeOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: 10,
    padding: 18,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  storeName: {
    color: '#FFFFFF',
    fontFamily: fontFamily.display,
    fontSize: 36,
  },
  storeTagline: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
  },
  hero: {
    minHeight: 280,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.s3,
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: 10,
    padding: 18,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontFamily: fontFamily.display,
    fontSize: 40,
    lineHeight: 44,
  },
  heroSubtitle: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bodySemi,
    fontSize: 17,
  },
  heroMeta: {
    color: colors.bg,
    fontFamily: fontFamily.body,
    fontSize: 14,
  },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  heroBtn: { flexGrow: 1, flexBasis: 160 },
  heroHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  notice: { backgroundColor: colors.goldLight, borderColor: colors.br },
  noticeText: { color: colors.acc, fontFamily: fontFamily.bodyBold, fontSize: 14 },
  mainGrid: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 },
  catalogColumn: { flexGrow: 1, flexBasis: 640, gap: 14 },
  catalogColumnBelow: { flexBasis: '100%' },
  cartColumn: { flexGrow: 1, flexBasis: 330, gap: 14 },
  cartColumnWide: { flexBasis: '100%' },
  categoryRow: { gap: 8, paddingVertical: 4 },
  categoryPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.s2,
  },
  categoryText: { color: colors.mu, fontFamily: fontFamily.bodyBold, fontSize: 13 },
  categoryTextActive: { color: '#FFFFFF' },
  productSearchInput: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.brBr,
    backgroundColor: colors.white,
    color: colors.tx,
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    paddingHorizontal: 14,
  },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  productCard: { flexGrow: 1, flexBasis: 155, maxWidth: 320, overflow: 'hidden', padding: 0, borderRadius: 22 },
  productInfo: { padding: 12, gap: 8 },
  productName: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 15, flex: 1 },
  price: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 15 },
  sku: { color: colors.acc, fontFamily: fontFamily.bodyBold, fontSize: 12 },
  selectorLabel: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 13 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  option: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.br,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  optionActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  optionText: { color: colors.tx, fontFamily: fontFamily.bodySemi, fontSize: 12 },
  optionTextActive: { color: '#FFFFFF' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  qtyBtn: { width: 44, minHeight: 38, paddingHorizontal: 0 },
  qtyText: { color: colors.tx, fontFamily: fontFamily.bodyBold, minWidth: 54, textAlign: 'center' },
  privateToggle: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.br,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: colors.white,
  },
  privateToggleActive: { backgroundColor: colors.goldLight, borderColor: colors.acc },
  privateText: { color: colors.mu, fontFamily: fontFamily.bodyBold, fontSize: 12 },
  privateTextActive: { color: colors.acc },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cartCard: { gap: 14 },
  pendingCheckoutBox: {
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.acc,
    backgroundColor: colors.goldLight,
    padding: 12,
  },
  pendingTitle: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
  },
  pendingCount: {
    minWidth: 34,
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: colors.acc,
    color: colors.white,
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 34,
  },
  authGate: {
    gap: 10,
    borderColor: 'rgba(201,168,76,0.45)',
    backgroundColor: colors.goldLight,
  },
  authTitle: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 18,
  },
  cartTitle: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 20 },
  total: { color: colors.tx, fontFamily: fontFamily.display, fontSize: 28 },
   muted: { color: colors.mu, fontFamily: fontFamily.body, fontSize: 14, lineHeight: 21 },
  kicker: { color: colors.acc, fontFamily: fontFamily.bodyBold, fontSize: 12, textTransform: 'uppercase' },
  lockNotice: {
    gap: 6,
    backgroundColor: colors.s2,
    borderColor: colors.br,
  },
  lockActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  lockActionBtn: {
    flexGrow: 1,
    flexBasis: 140,
    minHeight: 40,
  },
  lockTitle: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
  },
  timerPanel: {
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.goldLight,
    padding: 12,
  },
  timerTitle: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
  },
  timerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  timerBtn: {
    flexGrow: 1,
    flexBasis: 92,
    minHeight: 40,
  },
  preLaunchTimer: {
    flexBasis: '100%',
    gap: 12,
    backgroundColor: colors.goldLight,
    borderColor: colors.acc,
    borderWidth: 1,
    marginBottom: 8,
  },
  setupCard: {
    gap: 12,
  },
  setupTitle: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 24,
  },
  setupSteps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  setupStep: {
    flexGrow: 1,
    flexBasis: 120,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s2,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setupStepDone: {
    borderColor: colors.acc,
    backgroundColor: colors.goldLight,
  },
  setupStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    color: colors.white,
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    lineHeight: 24,
    textAlign: 'center',
  },
  setupStepText: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
  },
  timerText: {
    fontFamily: fontFamily.bodyBold,
    color: colors.tx,
    fontSize: 16,
  },
  customTimerBox: {
    flexGrow: 1,
    flexBasis: 180,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  customTimerInput: {
    width: 76,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.brBr,
    backgroundColor: colors.white,
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  customTimerButton: {
    flex: 1,
    minHeight: 42,
  },
  validationText: {
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
  },
  addressPanel: {
    gap: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.white,
    padding: 12,
  },
  addressRequirementBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.acc,
    backgroundColor: colors.goldLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  addressRequirementTitle: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
  },
  addressRequirementText: {
    color: colors.mu,
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    lineHeight: 17,
  },
  addressInput: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.brBr,
    backgroundColor: colors.white,
    color: colors.tx,
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    paddingHorizontal: 12,
  },
  addressInputMissing: {
    borderColor: colors.acc,
    backgroundColor: colors.goldLight,
  },
  addressSuggestionList: {
    gap: 6,
  },
  addressLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressLoadingText: {
    color: colors.mu,
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
  },
  addressSuggestion: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addressSuggestionText: {
    color: colors.tx,
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
  },
  participants: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  participantPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.s2,
  },
  joinedPill: { backgroundColor: colors.goldLight },
  activePill: { backgroundColor: colors.ink },
  participantRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  participantText: { color: colors.mu, fontFamily: fontFamily.bodyBold, fontSize: 12 },
  activePillText: { color: '#FFFFFF' },
  lockBadge: {
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: 18,
    padding: 13,
    marginBottom: 12,
  },
  lockBadgeText: {
    color: colors.white,
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    textAlign: 'center',
  },
  participantBadge: {
    color: colors.acc,
    backgroundColor: colors.goldLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  shareProofRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trustPill: {
    flexGrow: 1,
    minWidth: 140,
    borderRadius: 16,
    backgroundColor: colors.goldLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  trustPillSoft: {
    flexGrow: 1,
    minWidth: 120,
    borderRadius: 16,
    backgroundColor: colors.s2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  trustValue: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
  },
  trustLabel: {
    color: colors.mu,
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  inviteBox: { gap: 9, padding: 12, borderRadius: 16, backgroundColor: colors.s2 },
  inviteCardPreview: {
    color: colors.acc,
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.9,
  },
  inviteText: { color: colors.tx, fontFamily: fontFamily.bodySemi, fontSize: 13, lineHeight: 20 },
  simRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  simBtn: { flexGrow: 1, flexBasis: 140 },
  itemList: { gap: 8 },
  cartItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: colors.br,
    paddingTop: 10,
  },
  cartItemImage: {
    width: 58,
    height: 70,
    borderRadius: 14,
    backgroundColor: colors.s2,
  },
  cartItemImagePlaceholder: {
    width: 58,
    height: 70,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.s2,
    borderWidth: 1,
    borderColor: colors.br,
  },
  cartItemImageText: {
    color: colors.mu,
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    textAlign: 'center',
  },
  itemName: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 14 },
  itemPrice: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 15 },
  savingsHero: {
    gap: 14,
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.br,
  },
  savingsHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  savingsHeroAmountBlock: {
    alignItems: 'center',
    minWidth: 80,
  },
  savingsHeroAmount: {
    fontFamily: fontFamily.display,
    fontSize: 48,
    color: colors.acc,
    lineHeight: 52,
  },
  savingsHeroAmountLabel: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.mu,
    textAlign: 'center',
    lineHeight: 16,
  },
  savingsHeroStats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  savingsHeroStat: {
    alignItems: 'center',
    gap: 2,
  },
  savingsHeroStatValue: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 18,
    color: colors.tx,
  },
  savingsHeroStatLabel: {
    fontFamily: fontFamily.body,
    fontSize: 10,
    color: colors.mu,
    textAlign: 'center',
    lineHeight: 14,
  },
  savingsHeroDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.br,
  },
  savingsHeroBody: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.mu,
    lineHeight: 20,
  },
  tourBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.acc,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  tourBtnIcon: {
    fontSize: 14,
    color: colors.white,
  },
  tourBtnLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.white,
  },
  heroBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tourBtnHalf: {
    flex: 1,
    alignSelf: 'auto',
  },
  storyVidBtn: {
    flex: 1,
    minWidth: 150,
    alignSelf: 'auto',
    backgroundColor: colors.ink,
  },
});
