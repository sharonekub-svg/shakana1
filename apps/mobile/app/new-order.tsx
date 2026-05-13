import { useEffect, useMemo, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { BrandPill, demoStyles } from '@/components/demo/DemoPrimitives';
import { demoStores, type DemoBrandId } from '@/demo/catalog';
import {
  buildSharedDemoInviteLink,
  type DemoOrder,
  type DemoParticipant,
  initDemoCommerceSync,
  useDemoCommerceStore,
} from '@/stores/demoCommerceStore';
import { useAuthStore } from '@/stores/authStore';
import { searchCities, searchStreets } from '@/lib/locationAutocomplete';
import { useLocale } from '@/i18n/locale';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

const BRAND_ORDER: DemoBrandId[] = ['amazon', 'zara', 'hm'];
const TIMER_OPTIONS = [30, 45, 60];

const FALLBACK_ADDRESSES = [
  'Herzl 12, Petah Tikva',
  'Jabotinsky 42, Petah Tikva',
  'Dizengoff 88, Tel Aviv',
  'Rothschild 12, Tel Aviv',
  'Ben Yehuda 14, Tel Aviv',
  'Weizmann 17, Givatayim',
  'Ben Gurion 9, Herzliya',
  'King George 30, Jerusalem',
  'HaNassi 45, Haifa',
];

type StepKey = 'address' | 'store' | 'name' | 'copy';

const STEP_KEYS: StepKey[] = ['address', 'store', 'name', 'copy'];

function normalizeTimerMinutes(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(1, Math.min(720, Math.round(parsed)));
}

function hasAddressNumber(value: string) {
  return /\d+[\u0590-\u05FFA-Za-z]?/.test(value);
}

function isCompleteDeliveryAddress(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 6 && hasAddressNumber(trimmed) && trimmed.includes(',');
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

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fallbackAddressSuggestions(value: string) {
  const query = value.trim().toLowerCase();
  if (query.length < 2) return [];
  return FALLBACK_ADDRESSES.filter((address) => address.toLowerCase().includes(query)).slice(0, 5);
}

function buildInviteMessage(name: string, order: DemoOrder) {
  const storeName = demoStores[order.brand].name;
  const link = buildSharedDemoInviteLink(order);
  return `${name} is opening a shared ${storeName} order. Join before the timer closes, add only ${storeName} items, and save on delivery. Link: ${link} Code: ${order.inviteCode}`;
}

export default function NewOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ brand?: string }>();
  const { language } = useLocale();
  const isHebrew = language === 'he';

  const session = useAuthStore((state) => state.session);
  const demoMode = useDemoCommerceStore((state) => state.demoMode);
  const setDemoRole = useDemoCommerceStore((state) => state.setDemoRole);
  const createNewOrder = useDemoCommerceStore((state) => state.createNewOrder);
  const updateDeliveryAddress = useDemoCommerceStore((state) => state.updateDeliveryAddress);
  const selectBrand = useDemoCommerceStore((state) => state.selectBrand);
  const setActiveParticipant = useDemoCommerceStore((state) => state.setActiveParticipant);
  const orders = useDemoCommerceStore((state) => state.orders);

  const initialBrand = params.brand === 'hm' || params.brand === 'zara' || params.brand === 'amazon' ? params.brand : null;
  const metadata = session?.user.user_metadata as Record<string, unknown> | undefined;
  const defaultName =
    (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
    (typeof metadata?.name === 'string' && metadata.name.trim()) ||
    'Sharone Kubovsky';

  const copy = isHebrew
    ? {
        eyebrow: 'הזמנה חדשה',
        title: 'פותחים סל משותף',
        subtitle: 'מתחילים בכתובת, בוחרים חנות אחת, מוסיפים שם, ואז מעתיקים קישור לחברים.',
        back: 'בית',
        step: 'שלב',
        next: 'המשך',
        skip: 'דלג',
        create: 'פתח הזמנה והעתק קישור',
        copied: 'הקישור הועתק',
        openCart: 'פתח קטלוג',
        addressTitle: 'כתובת למשלוח',
        addressBody: 'כתבו רחוב, מספר בית ועיר. החנות לא תוכל לטפל בהזמנה בלי מספר בית.',
        addressPlaceholder: 'לדוגמה: הרצל 12, פתח תקווה',
        addressMissing: 'צריך רחוב, מספר בית ועיר.',
        timer: 'טיימר',
        storeTitle: 'בחרו חנות',
        storeBody: 'אחרי פתיחת ההזמנה, החברים יוכלו להוסיף מוצרים רק מהחנות הזאת.',
        nameTitle: 'שם מוביל ההזמנה',
        nameBody: 'השם הזה יופיע בקישור הוואטסאפ ובצד החנות.',
        namePlaceholder: 'השם שלך',
        copyTitle: 'הכל מוכן לשיתוף',
        copyBody: 'נפתח סל נעול לחנות אחת. עכשיו אפשר להעתיק קישור או לפתוח את הקטלוג.',
        locked: 'קטלוג נעול לחנות אחת',
        members: 'חברים מצטרפים דרך הקישור או הקוד',
        code: 'קוד הצטרפות',
        review: 'סיכום לפני פתיחה',
        address: 'כתובת',
        store: 'חנות',
        name: 'שם',
        copyStep: 'העתקה',
        minutes: 'דקות',
        skipped: 'אפשר להשלים אחר כך',
      }
    : {
        eyebrow: 'New order',
        title: 'Open a shared cart',
        subtitle: 'Start with the address, choose one store, add your name, then copy the invite link.',
        back: 'Home',
        step: 'Step',
        next: 'Next',
        skip: 'Skip',
        create: 'Create order and copy link',
        copied: 'Link copied',
        openCart: 'Open catalog',
        addressTitle: 'Delivery address',
        addressBody: 'Enter street, house number, and city. The store cannot process the order without the house number.',
        addressPlaceholder: 'Example: Herzl 12, Petah Tikva',
        addressMissing: 'Street, house number, and city are required.',
        timer: 'Timer',
        storeTitle: 'Choose store',
        storeBody: 'After launch, friends can add products only from this locked store.',
        nameTitle: 'Order lead name',
        nameBody: 'This name appears in the WhatsApp invite and merchant dashboard.',
        namePlaceholder: 'Your name',
        copyTitle: 'Ready to share',
        copyBody: 'A one-store shared cart is ready. Copy the invite or open the catalog.',
        locked: 'Catalog locked to one store',
        members: 'Friends join by link or code',
        code: 'Join code',
        review: 'Launch review',
        address: 'Address',
        store: 'Store',
        name: 'Name',
        copyStep: 'Copy',
        minutes: 'minutes',
        skipped: 'Can be completed later',
      };

  const [stepIndex, setStepIndex] = useState(0);
  const [address, setAddress] = useState('');
  const [brand, setBrand] = useState<DemoBrandId | null>(initialBrand);
  const [leadName, setLeadName] = useState(defaultName);
  const [timerMinutes, setTimerMinutes] = useState('45');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const currentStep = STEP_KEYS[stepIndex] ?? 'copy';
  const safeTimer = normalizeTimerMinutes(timerMinutes) ?? 45;
  const selectedStore = brand ? demoStores[brand] : null;
  const createdOrder = createdOrderId ? orders.find((order) => order.id === createdOrderId) ?? null : null;
  const inviteLink = createdOrder ? buildSharedDemoInviteLink(createdOrder) : '';
  const completeAddress = isCompleteDeliveryAddress(address);
  const cleanName = leadName.trim() || defaultName;

  const stepLabels = useMemo(
    () => ({
      address: copy.address,
      store: copy.store,
      name: copy.name,
      copy: copy.copyStep,
    }),
    [copy.address, copy.copyStep, copy.name, copy.store],
  );

  useEffect(() => {
    initDemoCommerceSync();
    if (demoMode) setDemoRole('user');
  }, [demoMode, setDemoRole]);

  useEffect(() => {
    if (initialBrand) setBrand(initialBrand);
  }, [initialBrand]);

  useEffect(() => {
    const value = address.trim();
    const fallback = fallbackAddressSuggestions(value);
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => {
      const query = splitAddressQuery(value);
      Promise.all([
        searchCities(query.city, language, controller.signal),
        query.street.length >= 2
          ? searchStreets(query.street, query.hasCityPart ? query.city : '', language, controller.signal)
          : Promise.resolve([]),
      ])
        .then(([cities, streets]) => {
          if (controller.signal.aborted) return;
          const cityPool = cities.slice(0, 4);
          const streetSuggestions = streets.flatMap((street) => {
            if (street.includes(',')) return [street];
            return cityPool.length > 0 ? cityPool.map((city) => `${street}, ${city}`) : [];
          });
          const citySuggestions = cityPool.map((city) =>
            query.hasCityPart && query.street ? `${query.street}, ${city}` : city,
          );
          setSuggestions(unique([...streetSuggestions, ...citySuggestions, ...fallback]).slice(0, 6));
        })
        .catch(() => {
          if (!controller.signal.aborted) setSuggestions(fallback);
        });
    }, 180);

    return () => {
      controller.abort();
      globalThis.clearTimeout(timer);
    };
  }, [address, language]);

  const participant: DemoParticipant = useMemo(
    () => ({
      id: session?.user.id ?? 'user-a',
      name: cleanName,
      joinedAt: Date.now(),
    }),
    [cleanName, session?.user.id],
  );

  const createOrderIfNeeded = async () => {
    let order = createdOrder;
    if (!order) {
      const nextBrand = brand ?? 'amazon';
      const orderId = createNewOrder(nextBrand, participant, safeTimer);
      updateDeliveryAddress(orderId, completeAddress ? address.trim() : copy.skipped);
      selectBrand(nextBrand);
      setActiveParticipant(participant.id);
      setCreatedOrderId(orderId);
      order = useDemoCommerceStore.getState().orders.find((candidate) => candidate.id === orderId) ?? null;
    }
    if (order) {
      await Clipboard.setStringAsync(buildInviteMessage(cleanName, order));
      setCopied(true);
      globalThis.setTimeout(() => setCopied(false), 1800);
    }
  };

  const goNext = async () => {
    if (currentStep === 'copy') {
      await createOrderIfNeeded();
      return;
    }
    setStepIndex((value) => Math.min(value + 1, STEP_KEYS.length - 1));
  };

  const skipStep = () => setStepIndex((value) => Math.min(value + 1, STEP_KEYS.length - 1));

  const openCatalog = () => {
    if (brand) selectBrand(brand);
    router.replace('/user');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.phoneFrame}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/user')} style={({ pressed }) => [styles.iconButton, pressed && demoStyles.pressed]}>
            <Text style={styles.iconText}>‹</Text>
          </Pressable>
          <View style={styles.brandMark}>
            <Text style={styles.brandText}>shakana</Text>
          </View>
          <View style={styles.iconButton}>
            <Text style={styles.iconText}>{stepIndex + 1}</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>

        <View style={styles.stepRail}>
          {STEP_KEYS.map((key, index) => (
            <Pressable key={key} accessibilityRole="button" onPress={() => setStepIndex(index)} style={styles.stepItem}>
              <View style={[styles.stepDot, index <= stepIndex && styles.stepDotActive]}>
                <Text style={[styles.stepDotText, index <= stepIndex && styles.stepDotTextActive]}>{index + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, index === stepIndex && styles.stepLabelActive]}>{stepLabels[key]}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardKicker}>{`${copy.step} ${stepIndex + 1} / ${STEP_KEYS.length}`}</Text>

          {currentStep === 'address' ? (
            <View style={styles.stepPanel}>
              <Text style={styles.cardTitle}>{copy.addressTitle}</Text>
              <Text style={styles.cardBody}>{copy.addressBody}</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder={copy.addressPlaceholder}
                placeholderTextColor={colors.mu2}
                style={[styles.input, address.length > 0 && !completeAddress && styles.inputWarning]}
                autoComplete="street-address"
                autoCorrect={false}
              />
              {address.length > 0 && !completeAddress ? <Text style={styles.warning}>{copy.addressMissing}</Text> : null}
              {suggestions.length > 0 ? (
                <View style={styles.suggestions}>
                  {suggestions.map((suggestion) => (
                    <Pressable
                      key={suggestion}
                      accessibilityRole="button"
                      onPress={() => setAddress(suggestion)}
                      style={({ pressed }) => [styles.suggestionButton, pressed && demoStyles.pressed]}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <View style={styles.timerBox}>
                <View>
                  <Text style={styles.timerTitle}>{copy.timer}</Text>
                  <Text style={styles.cardBody}>{`${safeTimer} ${copy.minutes}`}</Text>
                </View>
                <View style={styles.timerOptions}>
                  {TIMER_OPTIONS.map((minutes) => (
                    <Pressable
                      key={minutes}
                      accessibilityRole="button"
                      onPress={() => setTimerMinutes(String(minutes))}
                      style={[styles.timerChip, safeTimer === minutes && styles.timerChipActive]}
                    >
                      <Text style={[styles.timerChipText, safeTimer === minutes && styles.timerChipTextActive]}>{minutes}</Text>
                    </Pressable>
                  ))}
                  <TextInput
                    value={timerMinutes}
                    onChangeText={setTimerMinutes}
                    keyboardType="number-pad"
                    style={styles.timerInput}
                  />
                </View>
              </View>
            </View>
          ) : null}

          {currentStep === 'store' ? (
            <View style={styles.stepPanel}>
              <Text style={styles.cardTitle}>{copy.storeTitle}</Text>
              <Text style={styles.cardBody}>{copy.storeBody}</Text>
              <View style={styles.storeList}>
                {BRAND_ORDER.map((brandId) => {
                  const store = demoStores[brandId];
                  const active = brand === brandId;
                  return (
                    <Pressable
                      key={brandId}
                      accessibilityRole="button"
                      onPress={() => setBrand(brandId)}
                      style={({ pressed }) => [styles.storeCard, active && styles.storeCardActive, pressed && demoStyles.pressed]}
                    >
                      <ImageBackground source={{ uri: store.heroImage }} resizeMode="cover" style={styles.storeImage}>
                        <BrandPill brand={brandId} />
                      </ImageBackground>
                      <View style={styles.storeCopy}>
                        <Text style={styles.storeName}>{store.name}</Text>
                        <Text style={styles.storeTagline}>{store.tagline}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {currentStep === 'name' ? (
            <View style={styles.stepPanel}>
              <Text style={styles.cardTitle}>{copy.nameTitle}</Text>
              <Text style={styles.cardBody}>{copy.nameBody}</Text>
              <TextInput
                value={leadName}
                onChangeText={setLeadName}
                placeholder={copy.namePlaceholder}
                placeholderTextColor={colors.mu2}
                style={styles.input}
                autoComplete="name"
              />
              <View style={styles.identityCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{cleanName.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.identityName}>{cleanName}</Text>
                  <Text style={styles.cardBody}>{copy.members}</Text>
                </View>
              </View>
            </View>
          ) : null}

          {currentStep === 'copy' ? (
            <View style={styles.stepPanel}>
              <Text style={styles.cardTitle}>{copy.copyTitle}</Text>
              <Text style={styles.cardBody}>{copy.copyBody}</Text>
              <View style={styles.reviewCard}>
                <Text style={styles.reviewTitle}>{copy.review}</Text>
                <View style={styles.reviewLine}>
                  <Text style={styles.reviewLabel}>{copy.address}</Text>
                  <Text style={styles.reviewValue}>{completeAddress ? address.trim() : copy.skipped}</Text>
                </View>
                <View style={styles.reviewLine}>
                  <Text style={styles.reviewLabel}>{copy.store}</Text>
                  <Text style={styles.reviewValue}>{selectedStore?.name ?? demoStores.amazon.name}</Text>
                </View>
                <View style={styles.reviewLine}>
                  <Text style={styles.reviewLabel}>{copy.name}</Text>
                  <Text style={styles.reviewValue}>{cleanName}</Text>
                </View>
                <View style={styles.reviewLine}>
                  <Text style={styles.reviewLabel}>{copy.timer}</Text>
                  <Text style={styles.reviewValue}>{`${safeTimer} ${copy.minutes}`}</Text>
                </View>
              </View>
              {createdOrder ? (
                <View style={styles.inviteBox}>
                  <Text style={styles.codeLabel}>{copy.code}</Text>
                  <Text style={styles.codeValue}>{createdOrder.inviteCode}</Text>
                  <Text style={styles.inviteLink} numberOfLines={1}>{inviteLink}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Pressable accessibilityRole="button" onPress={skipStep} style={({ pressed }) => [styles.secondaryButton, pressed && demoStyles.pressed]}>
            <Text style={styles.secondaryButtonText}>{copy.skip}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={goNext} style={({ pressed }) => [styles.primaryButton, pressed && demoStyles.pressed]}>
            <Text style={styles.primaryButtonText}>{currentStep === 'copy' ? (copied ? copy.copied : copy.create) : copy.next}</Text>
          </Pressable>
        </View>

        {createdOrder ? (
          <Pressable accessibilityRole="button" onPress={openCatalog} style={({ pressed }) => [styles.catalogButton, pressed && demoStyles.pressed]}>
            <Text style={styles.catalogButtonText}>{copy.openCart}</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    minHeight: '100%',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 34,
  },
  phoneFrame: {
    width: '100%',
    maxWidth: 460,
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
  },
  iconText: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 18,
  },
  brandMark: {
    minWidth: 116,
    minHeight: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  brandText: {
    color: colors.white,
    fontFamily: fontFamily.display,
    fontSize: 19,
    lineHeight: 22,
  },
  hero: {
    gap: 8,
    paddingHorizontal: 2,
  },
  eyebrow: {
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: 0,
  },
  subtitle: {
    color: colors.mu,
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    lineHeight: 22,
  },
  stepRail: {
    flexDirection: 'row',
    gap: 8,
    padding: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.s2,
  },
  stepItem: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
  },
  stepDotActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  stepDotText: {
    color: colors.mu,
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
  },
  stepDotTextActive: {
    color: colors.white,
  },
  stepLabel: {
    color: colors.mu,
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
  },
  stepLabelActive: {
    color: colors.tx,
  },
  card: {
    minHeight: 500,
    borderRadius: 30,
    padding: 18,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
    ...shadow.card,
  },
  cardKicker: {
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  stepPanel: {
    gap: 14,
  },
  cardTitle: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 31,
    lineHeight: 34,
  },
  cardBody: {
    color: colors.mu,
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    lineHeight: 19,
  },
  input: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.brBr,
    backgroundColor: colors.s2,
    paddingHorizontal: 16,
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
  },
  inputWarning: {
    borderColor: colors.acc,
    backgroundColor: colors.accLight,
  },
  warning: {
    color: colors.acc,
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
  },
  suggestions: {
    gap: 7,
  },
  suggestionButton: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s2,
  },
  suggestionText: {
    color: colors.tx,
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
  },
  timerBox: {
    borderRadius: 22,
    backgroundColor: colors.s2,
    borderWidth: 1,
    borderColor: colors.br,
    padding: 12,
    gap: 12,
  },
  timerTitle: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 22,
  },
  timerOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  timerChip: {
    width: 54,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s2,
  },
  timerChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  timerChipText: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
  },
  timerChipTextActive: {
    color: colors.white,
  },
  timerInput: {
    width: 68,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.brBr,
    backgroundColor: colors.s2,
    color: colors.tx,
    textAlign: 'center',
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
  },
  storeList: {
    gap: 10,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s2,
    padding: 8,
  },
  storeCardActive: {
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.s2,
  },
  storeImage: {
    width: 94,
    height: 78,
    borderRadius: 17,
    overflow: 'hidden',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 8,
  },
  storeCopy: {
    flex: 1,
    minWidth: 0,
  },
  storeName: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 26,
  },
  storeTagline: {
    color: colors.mu,
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    lineHeight: 17,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderRadius: 22,
    padding: 12,
    backgroundColor: colors.s2,
    borderWidth: 1,
    borderColor: colors.br,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.s3,
  },
  avatarText: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 20,
  },
  identityName: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 24,
  },
  reviewCard: {
    borderRadius: 22,
    backgroundColor: colors.s2,
    borderWidth: 1,
    borderColor: colors.br,
    padding: 14,
    gap: 10,
  },
  reviewTitle: {
    color: colors.tx,
    fontFamily: fontFamily.display,
    fontSize: 23,
  },
  reviewLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.br,
    paddingTop: 9,
  },
  reviewLabel: {
    color: colors.mu,
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
  },
  reviewValue: {
    flex: 1,
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    textAlign: 'right',
  },
  inviteBox: {
    borderRadius: 22,
    padding: 14,
    backgroundColor: colors.ink,
    gap: 6,
  },
  codeLabel: {
    color: colors.mu2,
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  codeValue: {
    color: colors.white,
    fontFamily: fontFamily.display,
    fontSize: 42,
    lineHeight: 44,
  },
  inviteLink: {
    color: colors.s3,
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 0.42,
    minHeight: 58,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
  },
  secondaryButtonText: {
    color: colors.tx,
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
  },
  primaryButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.acc,
    borderWidth: 1,
    borderColor: colors.acc,
    ...shadow.cta,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    textAlign: 'center',
  },
  catalogButton: {
    minHeight: 56,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  catalogButtonText: {
    color: colors.white,
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
  },
});
