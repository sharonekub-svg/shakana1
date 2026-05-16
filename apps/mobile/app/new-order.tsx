import { useEffect, useMemo, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Dimensions, ImageBackground, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BRAND_ORDER: DemoBrandId[] = ['amazon', 'zara', 'hm'];
const TIMER_PRESETS = [6, 12, 24, 48, 72] as const;
const TIMER_CHIP_W = 72;
const TIMER_SLOT = TIMER_CHIP_W + 8;

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

type StepKey = 'address' | 'store' | 'name' | 'draft' | 'launched';
const STEP_KEYS: StepKey[] = ['address', 'store', 'name', 'draft', 'launched'];
const QUESTION_STEPS: StepKey[] = ['address', 'store', 'name'];

function hasAddressNumber(value: string) {
  return /\d+[֐-׿A-Za-z]?/.test(value);
}

function isCompleteDeliveryAddress(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 6 && hasAddressNumber(trimmed) && trimmed.includes(',');
}

function splitAddressQuery(value: string) {
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { street: parts.slice(0, -1).join(', '), city: parts[parts.length - 1] ?? '', hasCityPart: true };
  }
  return { street: value.trim(), city: value.trim(), hasCityPart: false };
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

function buildInviteMessage(orderName: string, storeName: string, timerHours: number, link: string, inviteCode: string, isHe: boolean) {
  if (isHe) {
    return `"${orderName}" — הזמנה קבוצתית מ-${storeName} ב-Shakana. יש לך ${timerHours} שעות להצטרף וביחד חוסכים במשלוח! ${link} קוד: ${inviteCode}`;
  }
  return `"${orderName}" — group order from ${storeName} on Shakana. You have ${timerHours}h to join and split shipping! ${link} Code: ${inviteCode}`;
}

export default function NewOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ brand?: string }>();
  const { language } = useLocale();
  const isHe = language === 'he';
  const timerRef = useRef<ScrollView>(null);

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
  const defaultLeaderName =
    (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
    (typeof metadata?.name === 'string' && metadata.name.trim()) ||
    'Sharone Kubovsky';

  const [stepIndex, setStepIndex] = useState(0);
  const [address, setAddress] = useState('');
  const [brand, setBrand] = useState<DemoBrandId | null>(initialBrand);
  const [orderName, setOrderName] = useState('');
  const [timerHours, setTimerHours] = useState<number>(24);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const currentStep = STEP_KEYS[stepIndex] ?? 'launched';
  const selectedStore = brand ? demoStores[brand] : null;
  const storeName = selectedStore?.name ?? demoStores.amazon.name;
  const displayName = orderName.trim() || storeName;
  const createdOrder = createdOrderId ? orders.find((order) => order.id === createdOrderId) ?? null : null;
  const inviteLink = createdOrder ? buildSharedDemoInviteLink(createdOrder) : '';
  const completeAddress = isCompleteDeliveryAddress(address);
  const nameValid = orderName.trim().length >= 2;

  const stepLabels: Record<StepKey, string> = useMemo(
    () => isHe
      ? { address: 'כתובת', store: 'חנות', name: 'שם', draft: 'טיוטה', launched: 'פעיל' }
      : { address: 'Address', store: 'Store', name: 'Name', draft: 'Draft', launched: 'Live' },
    [isHe],
  );

  useEffect(() => { initDemoCommerceSync(); if (demoMode) setDemoRole('user'); }, [demoMode, setDemoRole]);
  useEffect(() => { if (initialBrand) setBrand(initialBrand); }, [initialBrand]);

  useEffect(() => {
    const value = address.trim();
    const fallback = fallbackAddressSuggestions(value);
    if (value.length < 2) { setSuggestions([]); return; }
    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => {
      const query = splitAddressQuery(value);
      Promise.all([
        searchCities(query.city, language, controller.signal),
        query.street.length >= 2 ? searchStreets(query.street, query.hasCityPart ? query.city : '', language, controller.signal) : Promise.resolve([]),
      ]).then(([cities, streets]) => {
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
      }).catch(() => { if (!controller.signal.aborted) setSuggestions(fallback); });
    }, 180);
    return () => { controller.abort(); globalThis.clearTimeout(timer); };
  }, [address, language]);

  const participant: DemoParticipant = useMemo(() => ({
    id: session?.user.id ?? 'user-a',
    name: defaultLeaderName,
    joinedAt: Date.now(),
  }), [defaultLeaderName, session?.user.id]);

  const ensureOrderCreated = () => {
    if (createdOrderId) return createdOrderId;
    const nextBrand = brand ?? 'amazon';
    const orderId = createNewOrder(nextBrand, participant, timerHours * 60);
    updateDeliveryAddress(orderId, completeAddress ? address.trim() : '');
    selectBrand(nextBrand);
    setActiveParticipant(participant.id);
    setCreatedOrderId(orderId);
    return orderId;
  };

  const handleCopy = async () => {
    if (!createdOrder) return;
    const msg = buildInviteMessage(displayName, storeName, timerHours, inviteLink, createdOrder.inviteCode, isHe);
    await Clipboard.setStringAsync(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!createdOrder) return;
    const msg = buildInviteMessage(displayName, storeName, timerHours, inviteLink, createdOrder.inviteCode, isHe);
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() => {});
  };

  const currentStepValid =
    currentStep === 'address' ? completeAddress :
    currentStep === 'store'   ? brand !== null :
    currentStep === 'name'    ? nameValid :
    true;

  const goNext = () => {
    if (!currentStepValid) return;
    if (currentStep === 'name') {
      ensureOrderCreated();
      setStepIndex(STEP_KEYS.indexOf('draft'));
      return;
    }
    if (currentStep === 'draft') {
      setStepIndex(STEP_KEYS.indexOf('launched'));
      return;
    }
    if (currentStep === 'launched') {
      if (brand) selectBrand(brand);
      router.replace('/user');
      return;
    }
    setStepIndex((v) => Math.min(v + 1, STEP_KEYS.length - 1));
  };

  const goBack = () => {
    if (stepIndex > 0) setStepIndex((v) => v - 1);
    else router.replace('/user');
  };

  const questionStepIndex = QUESTION_STEPS.indexOf(currentStep as StepKey);
  const isQuestionStep = questionStepIndex !== -1;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.phoneFrame}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" onPress={goBack} style={({ pressed }) => [styles.iconButton, pressed && demoStyles.pressed]}>
            <Text style={styles.iconText}>‹</Text>
          </Pressable>
          <View style={styles.brandMark}>
            <Text style={styles.brandText}>shakana</Text>
          </View>
          {currentStep === 'launched' ? (
            <View style={[styles.iconButton, styles.livePip]}>
              <Text style={styles.livePipText}>LIVE</Text>
            </View>
          ) : (
            <View style={styles.iconButton}>
              <Text style={styles.iconText}>{isQuestionStep ? questionStepIndex + 1 : ''}</Text>
            </View>
          )}
        </View>

        {/* Step rail — only for question steps */}
        {isQuestionStep ? (
          <View style={styles.stepRail}>
            {QUESTION_STEPS.map((key, index) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                onPress={() => { if (index < questionStepIndex) setStepIndex(STEP_KEYS.indexOf(key)); }}
                style={styles.stepItem}
              >
                <View style={[styles.stepDot, index <= questionStepIndex && styles.stepDotActive]}>
                  <Text style={[styles.stepDotText, index <= questionStepIndex && styles.stepDotTextActive]}>{index + 1}</Text>
                </View>
                <Text style={[styles.stepLabel, index === questionStepIndex && styles.stepLabelActive]}>{stepLabels[key]}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* ── STEP: ADDRESS ──────────────────────────────────────── */}
        {currentStep === 'address' ? (
          <View style={styles.card}>
            <Text style={styles.cardKicker}>{isHe ? 'שלב 1 / 3' : 'Step 1 / 3'}</Text>
            <Text style={styles.cardTitle}>{isHe ? 'כתובת משלוח' : 'Delivery address'}</Text>
            <Text style={styles.cardBody}>{isHe ? 'רחוב, מספר בית ועיר. החנות צריכה מספר בית.' : 'Street, house number, and city. The store needs the house number.'}</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder={isHe ? 'לדוגמה: הרצל 12, פתח תקווה' : 'Example: Herzl 12, Petah Tikva'}
              placeholderTextColor={colors.mu2}
              style={[styles.input, address.length > 0 && !completeAddress && styles.inputWarning]}
              autoComplete="street-address"
              autoCorrect={false}
            />
            {address.length > 0 && !completeAddress ? (
              <Text style={styles.warning}>{isHe ? 'צריך רחוב, מספר בית ועיר.' : 'Street, house number, and city required.'}</Text>
            ) : null}
            {suggestions.length > 0 ? (
              <View style={styles.suggestions}>
                {suggestions.map((suggestion) => (
                  <Pressable key={suggestion} accessibilityRole="button" onPress={() => setAddress(suggestion)}
                    style={({ pressed }) => [styles.suggestionButton, pressed && demoStyles.pressed]}>
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* Timer inside address step */}
            <View style={styles.timerBox}>
              <Text style={styles.timerTitle}>{isHe ? 'כמה זמן?' : 'How long?'}</Text>
              <Text style={styles.cardBody}>{isHe ? 'כמה זמן שכנים יוכלו להצטרף.' : 'How long neighbors can join.'}</Text>
              <View style={styles.timerDisplay}>
                <Text style={styles.timerNum}>{timerHours}</Text>
                <Text style={styles.timerUnit}>{isHe ? 'שע׳' : 'HRS'}</Text>
              </View>
              <View style={styles.timerTrack}>
                <ScrollView
                  ref={timerRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={TIMER_SLOT}
                  decelerationRate="fast"
                  contentContainerStyle={styles.timerRow}
                  scrollEventThrottle={16}
                  onScroll={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / TIMER_SLOT);
                    const h = TIMER_PRESETS[Math.max(0, Math.min(idx, TIMER_PRESETS.length - 1))] ?? 1;
                    if (h !== timerHours) setTimerHours(h);
                  }}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / TIMER_SLOT);
                    setTimerHours(TIMER_PRESETS[Math.max(0, Math.min(idx, TIMER_PRESETS.length - 1))] ?? 1);
                  }}
                >
                  <View style={{ width: (Math.min(SCREEN_WIDTH - 28, 460) - TIMER_SLOT) / 2 }} />
                  {TIMER_PRESETS.map((h) => {
                    const on = timerHours === h;
                    return (
                      <Pressable key={h} onPress={() => {
                        setTimerHours(h);
                        timerRef.current?.scrollTo({ x: TIMER_PRESETS.indexOf(h) * TIMER_SLOT, animated: true });
                      }} style={[styles.timerChip, on && styles.timerChipActive]}>
                        <Text style={[styles.timerChipText, on && styles.timerChipTextActive]}>{h}h</Text>
                      </Pressable>
                    );
                  })}
                  <View style={{ width: (Math.min(SCREEN_WIDTH - 28, 460) - TIMER_SLOT) / 2 }} />
                </ScrollView>
              </View>
            </View>
          </View>
        ) : null}

        {/* ── STEP: STORE ────────────────────────────────────────── */}
        {currentStep === 'store' ? (
          <View style={styles.card}>
            <Text style={styles.cardKicker}>{isHe ? 'שלב 2 / 3' : 'Step 2 / 3'}</Text>
            <Text style={styles.cardTitle}>{isHe ? 'איזה חנות?' : 'Which store?'}</Text>
            <Text style={styles.cardBody}>{isHe ? 'לא ניתן לשנות לאחר פתיחת ההזמנה.' : 'Cannot be changed after the order is created.'}</Text>
            <View style={styles.storeList}>
              {BRAND_ORDER.map((brandId) => {
                const store = demoStores[brandId];
                const active = brand === brandId;
                return (
                  <Pressable key={brandId} accessibilityRole="button" onPress={() => setBrand(brandId)}
                    style={({ pressed }) => [styles.storeCard, active && styles.storeCardActive, pressed && demoStyles.pressed]}>
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

        {/* ── STEP: NAME (group order name) ─────────────────────── */}
        {currentStep === 'name' ? (
          <View style={styles.card}>
            <Text style={styles.cardKicker}>{isHe ? 'שלב 3 / 3' : 'Step 3 / 3'}</Text>
            <Text style={styles.cardTitle}>{isHe ? 'מה שם ההזמנה?' : 'Name your group order'}</Text>
            <Text style={styles.cardBody}>{isHe ? 'השם יופיע בקישור ובהודעת ההזמנה לשכנים.' : 'This name appears in the invite link and WhatsApp message your neighbors receive.'}</Text>
            <TextInput
              value={orderName}
              onChangeText={setOrderName}
              placeholder={isHe ? 'למשל: זרא קומה 3, איקאה ביחד' : 'e.g. Floor 3 Zara Run, IKEA Together'}
              placeholderTextColor={colors.mu2}
              style={styles.input}
            />
            {orderName.trim().length > 0 ? (
              <View style={styles.namePreview}>
                <Text style={styles.namePreviewLabel}>{isHe ? 'תצוגה מקדימה:' : 'Preview:'}</Text>
                <Text style={styles.namePreviewValue}>"{orderName.trim()}" · {storeName} · {timerHours}h</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── STEP: DRAFT ────────────────────────────────────────── */}
        {currentStep === 'draft' ? (
          <View style={styles.card}>
            <View style={styles.draftHeader}>
              <View style={styles.draftBadge}>
                <Text style={styles.draftBadgeTx}>{isHe ? 'טיוטה · לא פעיל' : 'DRAFT · NOT LIVE'}</Text>
              </View>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{isHe ? 'סיכום הזמנה' : 'ORDER SUMMARY'}</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryItemLabel}>{isHe ? 'שם' : 'NAME'}</Text>
                  <Text style={styles.summaryItemValue} numberOfLines={1}>{displayName}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryItemLabel}>{isHe ? 'חנות' : 'STORE'}</Text>
                  <Text style={styles.summaryItemValue}>{storeName}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryItemLabel}>{isHe ? 'טיימר' : 'TIMER'}</Text>
                  <Text style={styles.summaryItemValue}>{timerHours}h</Text>
                </View>
              </View>
            </View>
            {createdOrder ? (
              <View style={styles.inviteBox}>
                <Text style={styles.inviteLabel}>{isHe ? 'קישור טיוטה — שתף לפני השקה' : 'DRAFT LINK — SHARE BEFORE LAUNCH'}</Text>
                <Text style={styles.inviteLinkText} numberOfLines={1}>{inviteLink}</Text>
                <Text style={styles.inviteNote}>{isHe ? 'שכנים יוכלו לראות את הטיוטה אך ההזמנה תהיה פעילה רק אחרי השקה.' : 'Neighbors can preview the draft. Goes live only when you tap Launch.'}</Text>
              </View>
            ) : null}
            <View style={styles.draftShareRow}>
              <Pressable onPress={handleWhatsApp} disabled={!createdOrder}
                style={[styles.outlineBtn, !createdOrder && { opacity: 0.35 }]}>
                <Text style={styles.outlineBtnTx}>{isHe ? 'שתף טיוטה' : 'Share Draft'}</Text>
              </Pressable>
              <Pressable onPress={handleCopy} disabled={!createdOrder}
                style={[styles.outlineBtn, !createdOrder && { opacity: 0.35 }]}>
                <Text style={styles.outlineBtnTx}>{copied ? '✓' : (isHe ? 'העתק' : 'Copy')}</Text>
              </Pressable>
            </View>
            <View style={styles.lockNote}>
              <Text style={styles.lockNoteTx}>{isHe ? 'לאחר ההשקה הטיימר מתחיל ולא ניתן לשנות חנות, זמן או פרטים.' : 'After launch the timer starts. Store, timer, and details are locked.'}</Text>
            </View>
          </View>
        ) : null}

        {/* ── STEP: LAUNCHED ─────────────────────────────────────── */}
        {currentStep === 'launched' ? (
          <View style={styles.card}>
            <View style={styles.liveCard}>
              <Text style={styles.liveEmoji} />
              <Text style={styles.liveTitle}>{isHe ? 'ההזמנה פעילה!' : 'Order is live!'}</Text>
              <Text style={styles.liveSub}>{storeName} · {isHe ? `נסגר בעוד ${timerHours} שעות` : `Closes in ${timerHours} hours`}</Text>
              <View style={styles.liveLockBadge}>
                <Text style={styles.liveLockTx}>{isHe ? 'נעול — לא ניתן לשנות' : 'Locked — nothing can be changed'}</Text>
              </View>
            </View>
            {createdOrder ? (
              <View style={styles.inviteBox}>
                <Text style={styles.inviteLabel}>{isHe ? 'העתק הודעה + קישור' : 'COPY MESSAGE + LINK'}</Text>
                <View style={styles.inviteRow}>
                  <Text style={styles.inviteLinkText} numberOfLines={1}>{inviteLink}</Text>
                  <Pressable onPress={handleCopy} style={styles.copyBtn}>
                    <Text style={styles.copyBtnTx}>{copied ? '✓' : (isHe ? 'העתק' : 'Copy')}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer}>
          {currentStep === 'launched' ? (
            <Pressable accessibilityRole="button" onPress={handleWhatsApp}
              style={({ pressed }) => [styles.primaryButton, styles.primaryButtonDark, pressed && demoStyles.pressed]}>
              <Text style={styles.primaryButtonText}>{isHe ? 'שלח ב-WhatsApp' : 'Invite via WhatsApp'}</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={goNext} disabled={!currentStepValid}
              style={({ pressed }) => [styles.primaryButton, !currentStepValid && styles.primaryButtonOff, pressed && currentStepValid && demoStyles.pressed]}>
              <Text style={styles.primaryButtonText}>
                {currentStep === 'draft' ? (isHe ? 'השק עכשיו' : 'Launch Order') :
                 currentStep === 'name' ? (isHe ? 'המשך לטיוטה ←' : 'Continue to Draft →') :
                 (isHe ? 'המשך' : 'Next')}
              </Text>
            </Pressable>
          )}
        </View>

        {!currentStepValid && currentStep !== 'draft' && currentStep !== 'launched' ? (
          <Text style={styles.validationHint}>
            {currentStep === 'address' ? (isHe ? 'יש להזין כתובת מלאה עם מספר בית ועיר' : 'Enter a full address with street number and city') :
             currentStep === 'store'   ? (isHe ? 'יש לבחור חנות' : 'Please choose a store') :
             (isHe ? 'יש להזין לפחות 2 תווים' : 'At least 2 characters required')}
          </Text>
        ) : null}

        {currentStep === 'launched' ? (
          <Pressable accessibilityRole="button" onPress={() => { if (brand) selectBrand(brand); router.replace('/user'); }}
            style={styles.doneLink}>
            <Text style={styles.doneLinkTx}>{isHe ? 'לדף הבית ←' : 'Go to home →'}</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.bg },
  content: { minHeight: '100%', alignItems: 'center', padding: 14, paddingBottom: 34 },
  phoneFrame: { width: '100%', maxWidth: 460, gap: 16 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.s1, borderWidth: 1, borderColor: colors.br },
  iconText: { color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 18 },
  livePip: { backgroundColor: colors.accLight, borderColor: colors.acc },
  livePipText: { fontSize: 16 },
  brandMark: { minWidth: 116, minHeight: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  brandText: { color: colors.white, fontFamily: fontFamily.display, fontSize: 19, lineHeight: 22 },

  stepRail: { flexDirection: 'row', gap: 8, padding: 6, borderRadius: radii.pill, backgroundColor: colors.s2 },
  stepItem: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 4 },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.s1, borderWidth: 1, borderColor: colors.br },
  stepDotActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  stepDotText: { color: colors.mu, fontFamily: fontFamily.bodyBold, fontSize: 11 },
  stepDotTextActive: { color: colors.white },
  stepLabel: { color: colors.mu, fontFamily: fontFamily.bodyBold, fontSize: 10 },
  stepLabelActive: { color: colors.tx },

  card: { borderRadius: 30, padding: 18, backgroundColor: colors.s1, borderWidth: 1, borderColor: colors.br, gap: 14, ...shadow.card },
  cardKicker: { color: colors.acc, fontFamily: fontFamily.bodyBold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
  cardTitle: { color: colors.tx, fontFamily: fontFamily.display, fontSize: 31, lineHeight: 34 },
  cardBody: { color: colors.mu, fontFamily: fontFamily.bodySemi, fontSize: 13, lineHeight: 19 },

  input: { minHeight: 54, borderRadius: 18, borderWidth: 1, borderColor: colors.brBr, backgroundColor: colors.s2, paddingHorizontal: 16, color: colors.tx, fontFamily: fontFamily.bodyBold, fontSize: 15 },
  inputWarning: { borderColor: colors.acc, backgroundColor: colors.accLight },
  warning: { color: colors.acc, fontFamily: fontFamily.bodyBold, fontSize: 12 },
  suggestions: { gap: 7 },
  suggestionButton: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.br, backgroundColor: colors.s2 },
  suggestionText: { color: colors.tx, fontFamily: fontFamily.bodySemi, fontSize: 13 },

  timerBox: { borderRadius: 22, backgroundColor: colors.s2, borderWidth: 1, borderColor: colors.br, padding: 12, gap: 10 },
  timerTitle: { color: colors.tx, fontFamily: fontFamily.display, fontSize: 22 },
  timerDisplay: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  timerNum: { fontFamily: fontFamily.display, fontSize: 56, color: colors.tx, lineHeight: 60 },
  timerUnit: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.mu, letterSpacing: 1, paddingBottom: 8 },
  timerTrack: { position: 'relative' },
  timerRow: { alignItems: 'center' },
  timerChip: { width: TIMER_CHIP_W, height: 48, borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.br, backgroundColor: colors.s1, marginHorizontal: 4 },
  timerChipActive: { borderColor: colors.acc, backgroundColor: colors.accLight },
  timerChipText: { fontFamily: fontFamily.display, fontSize: 18, color: colors.mu },
  timerChipTextActive: { color: colors.acc },

  storeList: { gap: 10 },
  storeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, borderWidth: 1, borderColor: colors.br, backgroundColor: colors.s2, padding: 8 },
  storeCardActive: { borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.s2 },
  storeImage: { width: 94, height: 78, borderRadius: 17, overflow: 'hidden', alignItems: 'flex-end', justifyContent: 'flex-start', padding: 8 },
  storeCopy: { flex: 1, minWidth: 0 },
  storeName: { color: colors.tx, fontFamily: fontFamily.display, fontSize: 26 },
  storeTagline: { color: colors.mu, fontFamily: fontFamily.bodySemi, fontSize: 12, lineHeight: 17 },

  namePreview: { backgroundColor: colors.accLight, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.acc, gap: 4 },
  namePreviewLabel: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 1.4, color: colors.acc, textTransform: 'uppercase' },
  namePreviewValue: { fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.tx },

  draftHeader: { alignItems: 'flex-start' },
  draftBadge: { backgroundColor: colors.s2, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: colors.br },
  draftBadgeTx: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 1.8, color: colors.mu, textTransform: 'uppercase' },

  summaryCard: { backgroundColor: colors.ink, borderRadius: radii.xl, padding: 16, gap: 12, ...shadow.cta },
  summaryLabel: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryItemLabel: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 1.4, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' },
  summaryItemValue: { fontFamily: fontFamily.display, fontSize: 15, color: colors.white, lineHeight: 20 },
  summaryDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.12)' },

  inviteBox: { borderRadius: 18, backgroundColor: colors.s2, borderWidth: 1, borderColor: colors.br, padding: 14, gap: 8 },
  inviteLabel: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 1.8, color: colors.mu, textTransform: 'uppercase' },
  inviteLinkText: { fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.tx, letterSpacing: 0.3 },
  inviteNote: { fontFamily: fontFamily.body, fontSize: 12, color: colors.mu, lineHeight: 17 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  copyBtn: { backgroundColor: colors.accLight, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.acc },
  copyBtnTx: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.acc },

  draftShareRow: { flexDirection: 'row', gap: 10 },
  outlineBtn: { flex: 1, minHeight: 48, borderRadius: radii.pill, borderWidth: 1.5, borderColor: colors.acc, alignItems: 'center', justifyContent: 'center' },
  outlineBtnTx: { fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.acc },

  lockNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  lockNoteIcon: { fontSize: 14, lineHeight: 20 },
  lockNoteTx: { flex: 1, fontFamily: fontFamily.body, fontSize: 13, color: colors.mu, lineHeight: 19 },

  liveCard: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  liveEmoji: { fontSize: 52, lineHeight: 60 },
  liveTitle: { fontFamily: fontFamily.display, fontSize: 32, color: colors.tx, textAlign: 'center', lineHeight: 36 },
  liveSub: { fontFamily: fontFamily.body, fontSize: 14, color: colors.mu, textAlign: 'center' },
  liveLockBadge: { backgroundColor: colors.s2, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: colors.br, marginTop: 4 },
  liveLockTx: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.mu },

  footer: { flexDirection: 'row', gap: 10 },
  primaryButton: { flex: 1, minHeight: 58, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.acc, borderWidth: 1, borderColor: colors.acc, ...shadow.cta },
  primaryButtonDark: { backgroundColor: colors.ink, borderColor: colors.ink },
  primaryButtonText: { color: colors.white, fontFamily: fontFamily.bodyBold, fontSize: 14, textAlign: 'center' },
  primaryButtonOff: { opacity: 0.35 },
  validationHint: { textAlign: 'center', color: colors.mu, fontFamily: fontFamily.body, fontSize: 13, marginTop: -8 },
  doneLink: { alignItems: 'center', paddingVertical: 14 },
  doneLinkTx: { fontFamily: fontFamily.bodyBold, fontSize: 14, color: colors.acc },
});
