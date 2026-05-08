import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
import { buildInviteMessage, demoCategories, demoStores, productsForBrand, type DemoBrandId, type DemoProduct } from '@/demo/catalog';
import {
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
import { useAuthStore } from '@/stores/authStore';
import { stashPendingInvite } from '@/lib/deeplinks';
import { searchCities, searchStreets } from '@/lib/locationAutocomplete';

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
  return /\d+[א-תA-Za-z]?/.test(value);
}

function isCompleteDeliveryAddress(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 8 && hasAddressNumber(trimmed) && trimmed.includes(',');
}

function addressValidationMessage(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 'Required: street, house number, and city before opening the cart.';
  if (!hasAddressNumber(trimmed)) return 'Add the house/building number so the store can ship to the exact address.';
  if (!trimmed.includes(',')) return 'Add the city after the street and number, for example: Herzl 12, Petah Tikva.';
  return 'Required: valid timer, one store, and full delivery address before opening the cart.';
}

export default function DemoUserScreen() {
  const router = useRouter();
  const { language } = useLocale();
  const params = useLocalSearchParams<{ join?: string; new?: string }>();
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
  const resetDemo = useDemoCommerceStore((state) => state.resetDemo);
  const updateTimer = useDemoCommerceStore((state) => state.updateTimer);
  const updateDeliveryAddress = useDemoCommerceStore((state) => state.updateDeliveryAddress);

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
  const consumedNewParamRef = useRef(false);

  useEffect(() => {
    initDemoCommerceSync();
    if (demoMode) setDemoRole('user');
  }, [demoMode, setDemoRole]);

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
          setJoinError('We could not find this shared order. Ask the founder to send the latest invite link.');
        }
      })
      .catch(() => {
        setJoinError('The invite did not load. Check your connection and try the link again.');
      })
      .finally(() => setJoinLoading(false));
  }, [joinRetry, joinedOrder, params.join, restoreSharedOrder]);

  useEffect(() => {
    if (params.new !== '1' || consumedNewParamRef.current) return;
    consumedNewParamRef.current = true;
    setNewOrderMode(true);
    selectBrand(null);
    setSetupBrand(null);
    setCategory('Best Sellers');
    router.replace('/user');
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
    setNewOrderMode(true);
    setSetupBrand(nextBrand ?? brand ?? null);
    setSetupDeliveryAddress(order?.deliveryAddress ?? setupDeliveryAddress);
    selectBrand(null);
    setCategory('Best Sellers');
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

  if (!brand || !store) {
    return (
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
            <Text style={styles.whatsappTitle}>{language === 'he' ? 'הצטרפות מ-WhatsApp' : 'Join from WhatsApp'}</Text>
            <Text style={styles.muted}>
              {language === 'he'
                ? 'פותחים את קישור ההזמנה מ-WhatsApp והעגלה המשותפת נטענת ישר, בלי קוד ובלי הדבקה.'
                : 'Open the invite link from WhatsApp and the shared cart loads directly, with no code and no paste field.'}
            </Text>
          </Card>
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
          <SectionTitle title="Choose your store" kicker="User flow" />
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
                  <Text style={styles.setupStepText}>Exact address</Text>
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
                    if (newOrderMode) {
                      setSetupBrand(brandId);
                    } else {
                      selectBrand(brandId);
                    }
                    setCategory('Best Sellers');
                  }}
                  style={({ pressed }) => [
                    styles.storeChoice,
                    newOrderMode && setupBrand === brandId && styles.storeChoiceSelected,
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
          {newOrderMode ? (
            <Card style={styles.setupCard}>
              <Text style={styles.timerTitle}>3. Delivery address</Text>
              <TextInput
                value={setupDeliveryAddress}
                onChangeText={setSetupDeliveryAddress}
                placeholder="Street number, city"
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
                label={setupReady ? 'Create order' : 'Add timer, store, and exact address'}
                onPress={createSetupOrder}
                disabled={!setupReady}
                tone="accent"
              />
              {!setupReady ? (
                <Text style={styles.validationText}>
                  {addressValidationMessage(setupDeliveryAddress)}
                </Text>
              ) : null}
            </Card>
          ) : null}
        </DemoPage>
      </ScrollView>
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
          <View style={styles.catalogColumn}>
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
              kicker={order ? `Browsing ${store.name} only (locked for group order)` : `${store.name} scraped-style catalog`}
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

          <View style={styles.cartColumn}>
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
                    <Text style={styles.total}>₪{getOrderTotal(order)}</Text>
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
                    <TextInput
                      value={order.deliveryAddress}
                      onChangeText={(value) => updateDeliveryAddress(order.id, value)}
                      placeholder="Street number, city"
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
                    <Text style={styles.cartTitle}>Items</Text>
                    <Text style={styles.muted}>{getOrderItemCount(order)} units</Text>
                  </View>
                  {order.items.length === 0 ? (
                    <Text style={styles.muted}>No items yet. Select size and color, then add the first piece.</Text>
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
                            ) : line.product?.image ? (
                              <Image source={{ uri: line.product.image }} style={styles.cartItemImage} resizeMode="cover" />
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
                            <Text style={styles.itemPrice}>₪{line.lineTotal}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </Card>
              </>
            )}
          </View>
        </View>
      </DemoPage>
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
  onRequireLogin,
  onCreateOrder,
}: {
  product: DemoProduct;
  orderId: string | null;
  activeParticipantId: string;
  activeParticipant: DemoParticipant;
  isAuthenticated: boolean;
  orderLocked: boolean;
  onRequireLogin: () => void;
  onCreateOrder: () => void;
}) {
  const addItem = useDemoCommerceStore((state) => state.addItem);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [privateItem, setPrivateItem] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const ready = !!orderId && isAuthenticated && !orderLocked && !!size && !!color && quantity > 0;
  const productSaving = Math.max(0, product.compareAtPrice - product.price);

  return (
    <Card style={styles.productCard}>
      <ProductImage product={product} />
      <View style={styles.productInfo}>
        <View style={styles.rowBetween}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.price}>₪{product.price}</Text>
        </View>
        <Text style={styles.muted}>{product.description}</Text>
        <Text style={styles.sku}>{product.sku} | {product.stockStatus} | Save ₪{productSaving}</Text>
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
            label={isAdded ? 'Added! ✓' : ready ? 'Add to group cart' : 'Select size and color'}
            disabled={!ready || isAdded}
            onPress={() => {
              if (!orderId) return;
              addItem(orderId, {
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
    borderRadius: 8,
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
    borderRadius: 8,
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
  cartColumn: { flexGrow: 1, flexBasis: 330, gap: 14 },
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brBr,
    backgroundColor: colors.white,
    color: colors.tx,
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    paddingHorizontal: 14,
  },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  productCard: { flexGrow: 1, flexBasis: 260, overflow: 'hidden', padding: 0 },
  productInfo: { padding: 14, gap: 10 },
  productName: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 17, flex: 1 },
  price: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 18 },
  sku: { color: colors.acc, fontFamily: fontFamily.bodyBold, fontSize: 12 },
  selectorLabel: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 13 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  option: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.br,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  optionActive: { backgroundColor: colors.tx, borderColor: colors.tx },
  optionText: { color: colors.tx, fontFamily: fontFamily.bodySemi, fontSize: 12 },
  optionTextActive: { color: '#FFFFFF' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  qtyBtn: { width: 44, minHeight: 38, paddingHorizontal: 0 },
  qtyText: { color: colors.tx, fontFamily: fontFamily.bodyBold, minWidth: 54, textAlign: 'center' },
  privateToggle: {
    borderRadius: 8,
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
    borderRadius: 8,
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
    borderRadius: 8,
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
    backgroundColor: colors.tx,
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
    borderRadius: 8,
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.white,
    padding: 12,
  },
  addressInput: {
    minHeight: 46,
    borderRadius: 8,
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
    borderRadius: 8,
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
  activePill: { backgroundColor: colors.tx },
  participantRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  participantText: { color: colors.mu, fontFamily: fontFamily.bodyBold, fontSize: 12 },
  activePillText: { color: '#FFFFFF' },
  lockBadge: {
    backgroundColor: colors.s2,
    borderWidth: 1,
    borderColor: colors.br,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  lockBadgeText: {
    color: colors.mu,
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
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
    borderRadius: 8,
    backgroundColor: colors.goldLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  trustPillSoft: {
    flexGrow: 1,
    minWidth: 120,
    borderRadius: 8,
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
  inviteBox: { gap: 9, padding: 12, borderRadius: 8, backgroundColor: colors.s2 },
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
    borderRadius: 8,
    backgroundColor: colors.s2,
  },
  cartItemImagePlaceholder: {
    width: 58,
    height: 70,
    borderRadius: 8,
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
});
