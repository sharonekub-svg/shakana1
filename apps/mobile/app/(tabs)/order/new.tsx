import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { AutoField } from '@/components/primitives/AutoField';
import { NumField } from '@/components/primitives/NumField';
import { Field } from '@/components/primitives/Field';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useCreateOrder } from '@/api/orders';
import { useGenerateInvite } from '@/api/invites';
import { useUpsertProfile } from '@/api/profile';
import { useAuthStore } from '@/stores/authStore';
import { useLocale } from '@/i18n/locale';
import { searchCities, searchStreets } from '@/lib/locationAutocomplete';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TIMER_ITEM_WIDTH = 80;
const TIMER_PRESETS = [6, 12, 24, 48, 72] as const;

type StoreId = 'zara' | 'hm' | 'amazon' | 'superpharm' | 'ikea';

type StoreInfo = {
  id: StoreId;
  name: string;
  logo: string;
  subtitle: string;
  buildings: number;
  inCart: number;
  active: boolean;
  category: string;
};

const NEARBY_STORES: StoreInfo[] = [
  { id: 'zara', name: 'Zara', logo: 'Z', subtitle: 'Spring drop · linen and cotton', buildings: 3, inCart: 27, active: true, category: 'Fashion' },
  { id: 'hm', name: 'H&M', logo: 'H&M', subtitle: 'Mid-season sale', buildings: 1, inCart: 8, active: false, category: 'Fashion' },
  { id: 'amazon', name: 'Amazon', logo: 'A', subtitle: 'Pantry & home', buildings: 2, inCart: 41, active: false, category: 'Pantry' },
];

type CatalogueInfo = { id: StoreId; name: string; bg: string };

const CATALOGUE_STORES: CatalogueInfo[] = [
  { id: 'superpharm', name: 'Super-Pharm', bg: '#4A1A2A' },
  { id: 'ikea', name: 'IKEA', bg: '#2C3A1E' },
];

const FILTER_PILLS = ['All', 'Fashion', 'Pantry', 'Home', 'Tech'] as const;
type FilterPill = (typeof FILTER_PILLS)[number];

const TOTAL_STEPS = 5;

function StepHeader({ step, title, onBack }: { step: number; title: string; onBack: () => void }) {
  return (
    <View style={styles.stepHeader}>
      <View style={styles.stepHeaderRow}>
        <Pressable onPress={onBack} style={styles.backBtn} accessibilityRole="button">
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.stepLabel}>STEP {step} OF {TOTAL_STEPS}</Text>
        <View style={styles.backBtn} />
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
    </View>
  );
}

function Cta({
  label,
  onPress,
  disabled,
  loading,
  green,
  outline,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  green?: boolean;
  outline?: boolean;
}) {
  const bg = green ? '#25D366' : colors.acc;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={[
        styles.cta,
        outline ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: bg } : { backgroundColor: bg },
        (disabled || loading) && styles.ctaDisabled,
      ]}
    >
      <Text style={[styles.ctaText, outline && { color: bg }]}>
        {loading ? '···' : label}
      </Text>
    </Pressable>
  );
}

export default function NewOrder() {
  const router = useRouter();
  const { language } = useLocale();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const setProfile = useAuthStore((s) => s.setProfile);

  const [step, setStep] = useState(1);

  // Step 1 — Address
  const [city, setCity] = useState(() => profile?.city ?? '');
  const [street, setStreet] = useState(() => profile?.street ?? '');
  const [building, setBuilding] = useState(() => profile?.building ?? '');
  const [apt, setApt] = useState(() => profile?.apt ?? '');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [streetSuggestions, setStreetSuggestions] = useState<string[]>([]);
  const [streetLoading, setStreetLoading] = useState(false);
  const cityAbortRef = useRef<AbortController | null>(null);
  const streetAbortRef = useRef<AbortController | null>(null);

  // Step 2 — Store
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [storeSearch, setStoreSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterPill>('All');

  // Step 3 — Name + order title
  const [firstName, setFirstName] = useState(() => profile?.first_name ?? '');
  const [lastName, setLastName] = useState(() => profile?.last_name ?? '');
  const [orderName, setOrderName] = useState('');

  // Step 4 — Items (order created silently here)
  const [orderId, setOrderId] = useState<string | null>(null);
  const [step4Triggered, setStep4Triggered] = useState(false);

  // Step 5 — Launch & share
  const timerScrollRef = useRef<ScrollView>(null);
  const [timerHours, setTimerHours] = useState(24);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [launched, setLaunched] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [copied, setCopied] = useState(false);

  const createOrder = useCreateOrder();
  const generateInvite = useGenerateInvite();
  const upsertProfile = useUpsertProfile();

  const lang = language === 'he' ? 'he' : 'en';
  const isHe = lang === 'he';

  const selectedStoreInfo =
    NEARBY_STORES.find((s) => s.id === selectedStore) ??
    (CATALOGUE_STORES.find((s) => s.id === selectedStore)
      ? { name: CATALOGUE_STORES.find((s) => s.id === selectedStore)!.name, logo: '' }
      : null);
  const storeName = selectedStoreInfo?.name ?? selectedStore;
  const addressLine = [street, building, city].filter(Boolean).join(', ');
  const inviteLink = inviteToken ? `SHAKANA.APP/G/${inviteToken.toUpperCase().slice(0, 8)}` : 'SHAKANA.APP/G/...';
  const inviteFullUrl = inviteToken ? `https://shakana.app/g/${inviteToken}` : '';

  // ── City autocomplete ──────────────────────────────────────────────────
  const handleCityChange = (v: string) => {
    setCity(v);
    cityAbortRef.current?.abort();
    if (!v.trim()) { setCitySuggestions([]); return; }
    const ac = new AbortController();
    cityAbortRef.current = ac;
    setCityLoading(true);
    searchCities(v, lang, ac.signal).then(setCitySuggestions).catch(() => {}).finally(() => setCityLoading(false));
  };

  const handleStreetChange = (v: string) => {
    setStreet(v);
    streetAbortRef.current?.abort();
    if (!v.trim()) { setStreetSuggestions([]); return; }
    const ac = new AbortController();
    streetAbortRef.current = ac;
    setStreetLoading(true);
    searchStreets(v, city, lang, ac.signal).then(setStreetSuggestions).catch(() => {}).finally(() => setStreetLoading(false));
  };

  // ── Silently create order when step 4 first appears ───────────────────
  useEffect(() => {
    if (step !== 4 || step4Triggered || !user?.id) return;
    setStep4Triggered(true);
    createOrder.mutateAsync({
      productUrl: '',
      productTitle: orderName.trim() || storeName,
      productPriceAgorot: 0,
      storeKey: selectedStore,
      storeLabel: storeName,
      estimatedShippingAgorot: 0,
      freeShippingThresholdAgorot: 0,
      timerMinutes: 0,
      maxParticipants: 20,
      pickupResponsibleUserId: user.id,
      preferredPickupLocation: addressLine,
    }).then((order) => setOrderId(order.id)).catch(() => {});
  }, [step, step4Triggered, user?.id]);

  // ── Save profile after step 3 ─────────────────────────────────────────
  const handleNameNext = async () => {
    if (user?.id) {
      const updated = {
        id: user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: profile?.phone ?? '',
        city: city.trim(),
        street: street.trim(),
        building: building.trim(),
        apt: apt.trim(),
        floor: profile?.floor ?? null,
      };
      upsertProfile.mutateAsync(updated).then(() => setProfile(updated)).catch(() => {});
    }
    setStep(4);
  };

  // ── Launch order (starts timer + generates invite) ────────────────────
  const handleLaunch = async () => {
    if (!orderId) return;
    setLaunching(true);
    try {
      const invite = await generateInvite.mutateAsync(orderId);
      setInviteToken(invite.token);
      setLaunched(true);
    } catch {
      // non-fatal
    } finally {
      setLaunching(false);
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteFullUrl || inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const msg = isHe
      ? `הצטרפ/י להזמנה הקבוצתית שלי ב-Shakana! ${inviteFullUrl || inviteLink}`
      : `Join my group order on Shakana! ${inviteFullUrl || inviteLink}`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() => {});
  };

  const filteredNearby = NEARBY_STORES.filter((s) => {
    const matchSearch = !storeSearch.trim() || s.name.toLowerCase().includes(storeSearch.toLowerCase());
    const matchFilter = activeFilter === 'All' || s.category === activeFilter;
    return matchSearch && matchFilter;
  });

  // ── Scroll timer wheel to initial position ────────────────────────────
  useEffect(() => {
    if (step === 5) {
      const idx = TIMER_PRESETS.indexOf(timerHours as (typeof TIMER_PRESETS)[number]);
      const offset = Math.max(0, idx) * TIMER_ITEM_WIDTH;
      timerScrollRef.current?.scrollTo({ x: offset, animated: false });
    }
  }, [step]);

  const goBack = () => {
    if (step > 1) setStep((s) => s - 1);
    else router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

      {/* ── STEP 1: Address ─────────────────────────────────────────── */}
      {step === 1 && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <StepHeader step={1} title={isHe ? 'איפה אתה גר?' : 'Where do you live?'} onBack={goBack} />
          <Text style={styles.sub}>{isHe ? 'שכנים בקרבתך יראו את ההזמנות שלך.' : 'Neighbors nearby will see your orders.'}</Text>

          <View style={styles.gap14}>
            <AutoField label={isHe ? 'עיר' : 'City'} value={city} onChange={handleCityChange}
              onSelect={(v) => { setCity(v); setCitySuggestions([]); }}
              placeholder={isHe ? 'תל אביב' : 'Tel Aviv'} suggestions={citySuggestions} loading={cityLoading} direction="ltr" />
            <AutoField label={isHe ? 'רחוב' : 'Street'} value={street} onChange={handleStreetChange}
              onSelect={(v) => { setStreet(v); setStreetSuggestions([]); }}
              placeholder={isHe ? 'דיזנגוף' : 'Dizengoff'} suggestions={streetSuggestions} loading={streetLoading} direction="ltr" />
            <View style={styles.row2}>
              <View style={{ flex: 1 }}><NumField label={isHe ? 'בניין' : 'Building'} value={building} onChange={setBuilding} placeholder="22" /></View>
              <View style={{ flex: 1 }}><NumField label={isHe ? 'דירה' : 'Apt'} value={apt} onChange={setApt} placeholder="4" /></View>
            </View>
          </View>

          <View style={styles.ctaWrap}>
            <Cta label={isHe ? '← הבא' : '→ Next'} onPress={() => setStep(2)} disabled={!city.trim() || !street.trim() || !building.trim()} />
          </View>
        </ScrollView>
      )}

      {/* ── STEP 2: Choose store ─────────────────────────────────────── */}
      {step === 2 && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <StepHeader step={2} title={isHe ? 'בחר חנות' : 'Choose a store'} onBack={goBack} />

          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput value={storeSearch} onChangeText={setStoreSearch}
              placeholder={isHe ? 'זארה, H&M, אמזון...' : 'Zara, H&M, Amazon...'}
              placeholderTextColor={colors.mu2} style={styles.searchInput}
              autoCapitalize="none" autoCorrect={false} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTER_PILLS.map((pill) => (
              <Pressable key={pill} onPress={() => setActiveFilter(pill)}
                style={[styles.filterPill, activeFilter === pill && styles.filterPillOn]}>
                <Text style={[styles.filterPillText, activeFilter === pill && styles.filterPillTextOn]}>{pill}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>{isHe ? 'בקרבת מקום ופעיל' : 'NEARBY & ACTIVE'}</Text>
            <Text style={styles.activeNow}>{isHe ? 'פעיל עכשיו' : 'now active'}</Text>
          </View>

          <View style={styles.gap10}>
            {filteredNearby.map((store) => (
              <Pressable key={store.id} onPress={() => setSelectedStore(store.id)}
                style={[styles.storeCard, selectedStore === store.id && styles.storeCardOn]}>
                <View style={styles.storeCircle}><Text style={styles.storeCircleText}>{store.logo}</Text></View>
                <View style={styles.storeBody}>
                  <View style={styles.storeNameRow}>
                    <Text style={styles.storeName}>{store.name}</Text>
                    {store.active && (
                      <View style={styles.activeChip}>
                        <Text style={styles.activeDot}>●</Text>
                        <Text style={styles.activeChipText}>ACTIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.storeSub}>{store.subtitle}</Text>
                  <Text style={styles.storeMeta}>{store.buildings} {isHe ? 'בניינים' : 'buildings'} · {store.inCart} {isHe ? 'בסל' : 'in cart'}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>{isHe ? 'כל הקטלוגים' : 'ALL CATALOGUES'}</Text>
          <View style={styles.catalogGrid}>
            {CATALOGUE_STORES.map((cat) => (
              <Pressable key={cat.id} onPress={() => setSelectedStore(cat.id)}
                style={[styles.catalogTile, { backgroundColor: cat.bg }, selectedStore === cat.id && styles.catalogTileOn]}>
                <Text style={styles.catalogName}>{cat.name}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.ctaWrap}>
            <Cta label={isHe ? '← הבא' : '→ Next'} onPress={() => setStep(3)} disabled={!selectedStore} />
          </View>
        </ScrollView>
      )}

      {/* ── STEP 3: Name + order title ──────────────────────────────── */}
      {step === 3 && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <StepHeader step={3} title={isHe ? 'השם שלך' : 'Your name'} onBack={goBack} />
          <Text style={styles.sub}>{isHe ? 'שכניך יראו את שמך הפרטי.' : 'Your neighbors will see your first name.'}</Text>

          <View style={styles.gap14}>
            <Field label={isHe ? 'שם פרטי' : 'First name'} value={firstName} onChange={setFirstName} placeholder="Maya" ltr />
            <Field label={isHe ? 'שם משפחה' : 'Last name'} value={lastName} onChange={setLastName} placeholder="Rosen" ltr />

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>{isHe ? 'שם ההזמנה (אופציונלי)' : 'Order name (optional)'}</Text>
            <TextInput
              value={orderName}
              onChangeText={setOrderName}
              placeholder={isHe ? 'למשל: הזמנת מדרגות' : 'e.g. The stairwell drop'}
              placeholderTextColor={colors.mu2}
              style={styles.orderNameInput}
              autoCapitalize="sentences"
              maxLength={60}
            />
            <Text style={styles.orderNameHint}>{isHe ? 'ישמש כשם ההזמנה הקבוצתית שלך.' : 'This becomes the name of your group order.'}</Text>
          </View>

          <View style={styles.ctaWrap}>
            <Cta label={isHe ? '← הבא' : '→ Next'} onPress={handleNameNext} disabled={firstName.trim().length < 2} loading={upsertProfile.isPending} />
          </View>
        </ScrollView>
      )}

      {/* ── STEP 4: Add items ───────────────────────────────────────── */}
      {step === 4 && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <StepHeader step={4} title={isHe ? 'הוסף פריטים' : 'Add your items'} onBack={goBack} />
          <Text style={styles.sub}>{isHe ? 'בחר מה שתרצה לפני שההזמנה תעלה לאוויר.' : 'Pick what you want before the order goes live.'}</Text>

          <View style={styles.storeBreadcrumb}>
            <View style={styles.storeCircleSmall}><Text style={styles.storeCircleSmallText}>
              {(NEARBY_STORES.find((s) => s.id === selectedStore)?.logo ?? storeName.slice(0, 1)).toUpperCase()}
            </Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.breadcrumbStore}>{storeName}</Text>
              <Text style={styles.breadcrumbAddr}>{addressLine}</Text>
            </View>
            <View style={styles.checkBadge}><Text style={styles.checkBadgeText}>✓</Text></View>
          </View>

          <View style={styles.catalogHint}>
            <Text style={styles.catalogHintTitle}>{isHe ? 'פתח את קטלוג החנות' : 'Open the store catalog'}</Text>
            <Text style={styles.catalogHintBody}>{isHe
              ? 'גלוש, בחר פריטים ושמור אותם להזמנה. אחרי שתסיים, תוכל להשיק.'
              : 'Browse, pick items, and add them to the order. When ready, go to the next step to launch.'}</Text>
          </View>

          <View style={styles.gap10}>
            <Pressable style={styles.browseCta}
              onPress={() => Linking.openURL(`https://www.${selectedStore === 'hm' ? 'hm.com' : selectedStore + '.com'}`).catch(() => {})}>
              <Text style={styles.browseName}>{storeName}</Text>
              <Text style={styles.browseLabel}>{isHe ? 'פתח חנות ↗' : 'Open store ↗'}</Text>
            </Pressable>
          </View>

          <View style={styles.draftNote}>
            <Text style={styles.draftNoteText}>{isHe
              ? 'ההזמנה נשמרת כטיוטה. שכנים לא יראו אותה עד שתשיק.'
              : 'The order is saved as a draft. Neighbors won\'t see it until you launch.'}</Text>
          </View>

          <View style={styles.ctaWrap}>
            <Cta label={isHe ? '← לאישור והשקה' : '→ Launch & share'} onPress={() => setStep(5)} />
          </View>
        </ScrollView>
      )}

      {/* ── STEP 5: Launch & share ───────────────────────────────────── */}
      {step === 5 && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <StepHeader step={5} title={isHe ? 'השקה ושיתוף' : 'Launch & share'} onBack={goBack} />
          <Text style={styles.sub}>{isHe ? 'בחר כמה זמן תהיה ההזמנה פתוחה, ולחץ השקה.' : 'Choose how long the order stays open, then launch.'}</Text>

          {/* Store summary pill */}
          <View style={styles.storePill}>
            <Text style={styles.storePillText}>
              {(NEARBY_STORES.find((s) => s.id === selectedStore)?.logo ?? storeName.slice(0, 1)).toUpperCase()} · {storeName} · {addressLine}
            </Text>
          </View>

          {!launched ? (
            <>
              {/* Timer card */}
              <View style={styles.timerCard}>
                <Text style={styles.timerCardLabel}>{isHe ? 'נסגר בעוד' : 'CLOSES IN'}</Text>
                <View style={styles.timerDisplay}>
                  <Text style={styles.timerNumber}>{timerHours}</Text>
                  <Text style={styles.timerUnit}>{isHe ? 'שעות' : 'HOURS'}</Text>
                </View>

                <ScrollView
                  ref={timerScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={TIMER_ITEM_WIDTH}
                  decelerationRate="fast"
                  contentContainerStyle={styles.timerWheelContent}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / TIMER_ITEM_WIDTH);
                    const clamped = Math.max(0, Math.min(idx, TIMER_PRESETS.length - 1));
                    setTimerHours(TIMER_PRESETS[clamped]);
                  }}
                >
                  <View style={{ width: (SCREEN_WIDTH - 36 - TIMER_ITEM_WIDTH) / 2 }} />
                  {TIMER_PRESETS.map((h) => (
                    <Pressable key={h} onPress={() => {
                      setTimerHours(h);
                      const idx = TIMER_PRESETS.indexOf(h);
                      timerScrollRef.current?.scrollTo({ x: idx * TIMER_ITEM_WIDTH, animated: true });
                    }} style={[styles.timerItem, timerHours === h && styles.timerItemOn]}>
                      <Text style={[styles.timerItemVal, timerHours === h && styles.timerItemValOn]}>{h}</Text>
                      <Text style={[styles.timerItemUnit2, timerHours === h && styles.timerItemUnit2On]}>h</Text>
                    </Pressable>
                  ))}
                  <View style={{ width: (SCREEN_WIDTH - 36 - TIMER_ITEM_WIDTH) / 2 }} />
                </ScrollView>
                <Text style={styles.timerNote}>{isHe ? 'גרור כדי לבחור — שכנים יצטרפו לפני הסיום.' : 'Swipe to choose — neighbors join before it closes.'}</Text>
              </View>

              {/* Invite link preview */}
              <View style={styles.inviteBox}>
                <Text style={styles.inviteBoxLabel}>{isHe ? 'קישור הזמנה' : 'INVITE LINK'}</Text>
                <View style={styles.inviteRow}>
                  <Text style={styles.inviteLink} numberOfLines={1}>{inviteLink}</Text>
                </View>
                <Text style={styles.inviteNote}>{isHe ? 'הקישור יהיה פעיל ברגע ההשקה.' : 'Goes live the moment you launch.'}</Text>
              </View>

              {/* Launch CTA */}
              <Cta
                label={launching ? '···' : (isHe ? `🚀 השקה — ${timerHours} שעות` : `🚀 Launch — ${timerHours}h timer`)}
                onPress={handleLaunch}
                disabled={!orderId}
                loading={launching}
              />
              <Text style={styles.launchNote}>{isHe
                ? 'שכנים בבניין שלך יקבלו הודעה ויוכלו להצטרף.'
                : 'Neighbors in your building will be notified and can join.'}</Text>
            </>
          ) : (
            <>
              {/* Success card */}
              <View style={styles.successCard}>
                <Text style={styles.successEmoji}>🎉</Text>
                <Text style={styles.successTitle}>{isHe ? 'ההזמנה שלך פעילה!' : 'Your order is live!'}</Text>
                <Text style={styles.successSub}>{storeName} · {isHe ? `נסגר בעוד ${timerHours} שעות` : `Closes in ${timerHours} hours`}</Text>
              </View>

              {/* Share section */}
              <View style={styles.inviteBox}>
                <Text style={styles.inviteBoxLabel}>{isHe ? 'שתף עם שכנים' : 'SHARE WITH NEIGHBORS'}</Text>
                <View style={styles.inviteRow}>
                  <Text style={styles.inviteLink} numberOfLines={1}>{inviteLink}</Text>
                  <Pressable onPress={handleCopy} style={styles.copyBtn}>
                    <Text style={styles.copyBtnText}>{copied ? (isHe ? '✓ הועתק' : '✓ Copied') : (isHe ? '📋 העתק' : '📋 Copy')}</Text>
                  </Pressable>
                </View>
              </View>

              <Cta label={isHe ? '💬 שלח ב-WhatsApp' : '💬 Invite via WhatsApp'} onPress={handleWhatsApp} green />

              <Pressable onPress={() => router.replace('/(tabs)/building')} style={styles.doneLink}>
                <Text style={styles.doneLinkText}>{isHe ? 'סיים — צפה בהזמנה ←' : 'Done — view order →'}</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 120, gap: 16 },

  // Header
  stepHeader: { gap: 6, paddingTop: 8 },
  stepHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: colors.tx, fontFamily: fontFamily.bodyBold, lineHeight: 32 },
  stepLabel: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2, color: colors.acc, textTransform: 'uppercase' },
  stepTitle: { fontFamily: fontFamily.display, fontSize: 30, color: colors.tx, lineHeight: 36 },
  sub: { fontFamily: fontFamily.body, fontSize: 14, color: colors.mu, lineHeight: 20, marginTop: -4 },

  // Layout helpers
  gap14: { gap: 14 },
  gap10: { gap: 10 },
  row2: { flexDirection: 'row', gap: 12 },
  divider: { height: 1, backgroundColor: colors.br, marginVertical: 4 },

  // CTA button
  ctaWrap: { marginTop: 8 },
  cta: { minHeight: 54, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, ...shadow.cta },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { fontFamily: fontFamily.bodyBold, fontSize: 16, color: colors.s1, letterSpacing: 0.2 },

  // Step 2 — Store
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.s1, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.br, paddingHorizontal: 14, paddingVertical: 4, gap: 8, ...shadow.card },
  searchIcon: { fontSize: 18, color: colors.mu },
  searchInput: { flex: 1, fontFamily: fontFamily.body, fontSize: 15, color: colors.tx, paddingVertical: 12 },
  filterRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.s1, borderWidth: 1, borderColor: colors.br },
  filterPillOn: { backgroundColor: colors.tx, borderColor: colors.tx },
  filterPillText: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.mu },
  filterPillTextOn: { color: colors.s1 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionLabel: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2, color: colors.mu, textTransform: 'uppercase' },
  activeNow: { fontFamily: fontFamily.bodyBold, fontSize: 10, color: colors.acc },
  storeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.s1, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.br, padding: 14, gap: 12, ...shadow.card },
  storeCardOn: { borderColor: colors.acc, backgroundColor: colors.accLight },
  storeCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#6B4E37', alignItems: 'center', justifyContent: 'center' },
  storeCircleText: { fontFamily: fontFamily.bodyBold, fontSize: 13, color: '#FAF6EF' },
  storeBody: { flex: 1, gap: 3 },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  storeName: { fontFamily: fontFamily.bodyBold, fontSize: 15, color: colors.tx },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  activeDot: { fontSize: 7, color: colors.acc, lineHeight: 10 },
  activeChipText: { fontFamily: fontFamily.bodyBold, fontSize: 9, color: colors.acc, letterSpacing: 1 },
  storeSub: { fontFamily: fontFamily.body, fontSize: 12, color: colors.mu },
  storeMeta: { fontFamily: fontFamily.body, fontSize: 11, color: colors.mu2 },
  chevron: { fontSize: 22, color: colors.mu2 },
  catalogGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catalogTile: { width: '47%', minHeight: 90, borderRadius: radii.xl, padding: 16, justifyContent: 'flex-end', ...shadow.card },
  catalogTileOn: { borderWidth: 2, borderColor: colors.acc },
  catalogName: { fontFamily: fontFamily.display, fontSize: 16, color: '#FAF6EF', fontStyle: 'italic' },

  // Step 3 — Name
  fieldLabel: { fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.mu },
  orderNameInput: { backgroundColor: colors.s1, borderRadius: radii.md, borderWidth: 1, borderColor: colors.br, paddingHorizontal: 16, paddingVertical: 14, fontFamily: fontFamily.body, fontSize: 16, color: colors.tx, ...shadow.card },
  orderNameHint: { fontFamily: fontFamily.body, fontSize: 12, color: colors.mu2, marginTop: -8 },

  // Step 4 — Add items
  storeBreadcrumb: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.s1, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.br, padding: 14, gap: 12, ...shadow.card },
  storeCircleSmall: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#6B4E37', alignItems: 'center', justifyContent: 'center' },
  storeCircleSmallText: { fontFamily: fontFamily.bodyBold, fontSize: 14, color: '#FAF6EF' },
  breadcrumbStore: { fontFamily: fontFamily.bodyBold, fontSize: 15, color: colors.tx },
  breadcrumbAddr: { fontFamily: fontFamily.body, fontSize: 12, color: colors.mu },
  checkBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.acc, alignItems: 'center', justifyContent: 'center' },
  checkBadgeText: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.s1 },
  catalogHint: { backgroundColor: colors.accLight, borderRadius: radii.xl, padding: 16, gap: 6 },
  catalogHintTitle: { fontFamily: fontFamily.bodyBold, fontSize: 14, color: colors.tx },
  catalogHintBody: { fontFamily: fontFamily.body, fontSize: 13, color: colors.mu, lineHeight: 19 },
  browseCta: { backgroundColor: colors.s1, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.br, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadow.card },
  browseName: { fontFamily: fontFamily.bodyBold, fontSize: 16, color: colors.tx },
  browseLabel: { fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.acc },
  draftNote: { backgroundColor: colors.s2, borderRadius: radii.lg, paddingHorizontal: 14, paddingVertical: 10 },
  draftNoteText: { fontFamily: fontFamily.body, fontSize: 12, color: colors.mu, lineHeight: 18 },

  // Step 5 — Launch
  storePill: { alignSelf: 'flex-start', backgroundColor: colors.accLight, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.br },
  storePillText: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.tx },
  timerCard: { backgroundColor: colors.s1, borderRadius: radii.xl, paddingVertical: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.br, gap: 12, ...shadow.card },
  timerCardLabel: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2, color: colors.mu, textTransform: 'uppercase' },
  timerDisplay: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingLeft: 4 },
  timerNumber: { fontFamily: fontFamily.display, fontSize: 56, color: colors.tx, lineHeight: 60 },
  timerUnit: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.mu, letterSpacing: 1, paddingBottom: 8 },
  timerWheelContent: { alignItems: 'center' },
  timerItem: { width: TIMER_ITEM_WIDTH, height: 56, borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.br, backgroundColor: colors.s2, marginHorizontal: 4 },
  timerItemOn: { borderColor: colors.acc, backgroundColor: colors.accLight },
  timerItemVal: { fontFamily: fontFamily.display, fontSize: 24, color: colors.mu, lineHeight: 28 },
  timerItemValOn: { color: colors.acc },
  timerItemUnit2: { fontFamily: fontFamily.bodyBold, fontSize: 10, color: colors.mu2 },
  timerItemUnit2On: { color: colors.acc },
  timerNote: { fontFamily: fontFamily.body, fontSize: 12, color: colors.mu2, lineHeight: 17 },
  inviteBox: { backgroundColor: colors.s1, borderRadius: radii.xl, padding: 16, borderWidth: 1, borderColor: colors.br, gap: 8, ...shadow.card },
  inviteBoxLabel: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2, color: colors.mu, textTransform: 'uppercase' },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inviteLink: { flex: 1, fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.tx, letterSpacing: 0.3 },
  copyBtn: { backgroundColor: colors.accLight, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.acc },
  copyBtnText: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.acc },
  inviteNote: { fontFamily: fontFamily.body, fontSize: 12, color: colors.mu2, marginTop: -4 },
  launchNote: { fontFamily: fontFamily.body, fontSize: 13, color: colors.mu, textAlign: 'center', lineHeight: 19, paddingHorizontal: 8 },

  successCard: { backgroundColor: colors.accLight, borderRadius: radii.xl, padding: 28, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.acc, ...shadow.card },
  successEmoji: { fontSize: 44, lineHeight: 52 },
  successTitle: { fontFamily: fontFamily.display, fontSize: 28, color: colors.tx, textAlign: 'center', lineHeight: 32 },
  successSub: { fontFamily: fontFamily.body, fontSize: 14, color: colors.mu, textAlign: 'center' },

  doneLink: { alignItems: 'center', paddingVertical: 14 },
  doneLinkText: { fontFamily: fontFamily.bodyBold, fontSize: 14, color: colors.acc },
});
