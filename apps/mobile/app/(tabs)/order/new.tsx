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

import { Field } from '@/components/primitives/Field';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useCreateOrder } from '@/api/orders';
import { useGenerateInvite } from '@/api/invites';
import { useUpsertProfile } from '@/api/profile';
import { useAuthStore } from '@/stores/authStore';
import { useLocale } from '@/i18n/locale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TIMER_ITEM_WIDTH = 88;
const TIMER_PRESETS = [6, 12, 24, 48, 72] as const;

type StoreId = 'zara' | 'hm' | 'amazon' | 'superpharm' | 'ikea';

type StoreInfo = {
  id: StoreId;
  name: string;
  logo: string;
  subtitle: string;
  active: boolean;
  category: string;
};

const STORES: StoreInfo[] = [
  { id: 'zara',       name: 'Zara',        logo: 'Z',   subtitle: 'Fashion · Spring drop',   active: true,  category: 'Fashion' },
  { id: 'hm',         name: 'H&M',         logo: 'H',   subtitle: 'Fashion · Mid-season sale', active: false, category: 'Fashion' },
  { id: 'amazon',     name: 'Amazon',      logo: 'A',   subtitle: 'Pantry & home',            active: false, category: 'Pantry'  },
  { id: 'superpharm', name: 'Super-Pharm', logo: 'SP',  subtitle: 'Pharmacy & beauty',        active: false, category: 'Health'  },
  { id: 'ikea',       name: 'IKEA',        logo: 'I',   subtitle: 'Home & furniture',         active: false, category: 'Home'    },
];

const TOTAL_STEPS = 3;

function QuestionHeader({ step, question, sub, onBack }: { step: number; question: string; sub: string; onBack: () => void }) {
  return (
    <View style={styles.qHeader}>
      <View style={styles.qTopRow}>
        <Pressable onPress={onBack} style={styles.backBtn} accessibilityRole="button">
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.stepPill}>{step} / {TOTAL_STEPS}</Text>
        <View style={styles.backBtn} />
      </View>
      <Text style={styles.kicker}>SHAKANA</Text>
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.qSub}>{sub}</Text>
    </View>
  );
}

function Cta({ label, onPress, disabled, loading, green }: {
  label: string; onPress: () => void;
  disabled?: boolean; loading?: boolean; green?: boolean;
}) {
  const bg = green ? '#25D366' : colors.acc;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={[styles.cta, { backgroundColor: bg }, (disabled || loading) && styles.ctaOff]}
    >
      <Text style={styles.ctaText}>{loading ? '···' : label}</Text>
    </Pressable>
  );
}

export default function NewOrder() {
  const router  = useRouter();
  const { language } = useLocale();
  const profile  = useAuthStore((s) => s.profile);
  const user     = useAuthStore((s) => s.user);
  const setProfile = useAuthStore((s) => s.setProfile);

  const [step, setStep] = useState(1);

  // ── Step 1: Name ──────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const nameValid = firstName.trim().length >= 2;

  // ── Step 2: Store ─────────────────────────────────────────────────────
  const [selectedStore, setSelectedStore] = useState<string>('');
  const storeValid = selectedStore !== '';

  // ── Step 3: Timer + Launch ────────────────────────────────────────────
  const timerScrollRef = useRef<ScrollView>(null);
  const [timerHours, setTimerHours] = useState<number | null>(null);
  const timerValid = timerHours !== null;

  const [orderId,        setOrderId]        = useState<string | null>(null);
  const [step3Triggered, setStep3Triggered] = useState(false);
  const [inviteToken,    setInviteToken]    = useState<string | null>(null);
  const [launched,       setLaunched]       = useState(false);
  const [launching,      setLaunching]      = useState(false);
  const [copied,         setCopied]         = useState(false);

  const createOrder   = useCreateOrder();
  const generateInvite = useGenerateInvite();
  const upsertProfile  = useUpsertProfile();

  const isHe = language === 'he';
  const selectedStoreInfo = STORES.find((s) => s.id === selectedStore);
  const storeName  = selectedStoreInfo?.name ?? '';
  const addressLine = [profile?.street, profile?.building, profile?.city].filter(Boolean).join(', ');
  const inviteLink  = inviteToken ? `SHAKANA.APP/G/${inviteToken.toUpperCase().slice(0, 8)}` : 'SHAKANA.APP/G/...';
  const inviteFullUrl = inviteToken ? `https://shakana.app/g/${inviteToken}` : '';

  // ── Save name + advance to step 2 ────────────────────────────────────
  const handleNameNext = async () => {
    if (!nameValid) return;
    if (user?.id) {
      const updated = {
        id: user.id,
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        phone:    profile?.phone    ?? '',
        city:     profile?.city     ?? '',
        street:   profile?.street   ?? '',
        building: profile?.building ?? '',
        apt:      profile?.apt      ?? '',
        floor:    profile?.floor    ?? null,
      };
      upsertProfile.mutateAsync(updated).then(() => setProfile(updated)).catch(() => {});
    }
    setStep(2);
  };

  // ── Silently create order when step 3 first appears ──────────────────
  useEffect(() => {
    if (step !== 3 || step3Triggered || !user?.id) return;
    setStep3Triggered(true);
    createOrder.mutateAsync({
      productUrl: '',
      productTitle: storeName,
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
  }, [step, step3Triggered, user?.id]);

  // ── Launch ────────────────────────────────────────────────────────────
  const handleLaunch = async () => {
    if (!orderId || !timerValid) return;
    setLaunching(true);
    try {
      const invite = await generateInvite.mutateAsync(orderId);
      setInviteToken(invite.token);
      setLaunched(true);
    } catch { /* non-fatal */ }
    finally { setLaunching(false); }
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

  const goBack = () => {
    if (step > 1) setStep((s) => s - 1);
    else router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

      {/* ════════════════════════════════════════════════
          STEP 1 — What's your name?
      ════════════════════════════════════════════════ */}
      {step === 1 && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <QuestionHeader
            step={1}
            question={isHe ? 'מה שמך?' : "What's your name?"}
            sub={isHe ? 'שכניך יראו את שמך הפרטי בהזמנה.' : 'Your neighbors will see your first name in the order.'}
            onBack={goBack}
          />

          <View style={styles.gap16}>
            <Field label={isHe ? 'שם פרטי *' : 'First name *'} value={firstName} onChange={setFirstName} placeholder="Maya" ltr />
            <Field label={isHe ? 'שם משפחה' : 'Last name'} value={lastName} onChange={setLastName} placeholder="Cohen" ltr />
          </View>

          <View style={styles.ctaWrap}>
            <Cta
              label={isHe ? '← המשך' : '→ Continue'}
              onPress={handleNameNext}
              disabled={!nameValid}
              loading={upsertProfile.isPending}
            />
            {!nameValid && (
              <Text style={styles.hint}>{isHe ? 'יש להזין לפחות 2 תווים' : 'Enter at least 2 characters'}</Text>
            )}
          </View>
        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════
          STEP 2 — Which store?
      ════════════════════════════════════════════════ */}
      {step === 2 && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <QuestionHeader
            step={2}
            question={isHe ? 'איזה חנות?' : 'Which store?'}
            sub={isHe ? 'בחר את החנות להזמנה הקבוצתית שלך.' : 'Choose the store for your group order.'}
            onBack={goBack}
          />

          <View style={styles.storeList}>
            {STORES.map((store) => {
              const on = selectedStore === store.id;
              return (
                <Pressable key={store.id} onPress={() => setSelectedStore(store.id)}
                  style={[styles.storeCard, on && styles.storeCardOn]}>
                  <View style={[styles.storeLogo, on && styles.storeLogoOn]}>
                    <Text style={[styles.storeLogoText, on && styles.storeLogoTextOn]}>{store.logo}</Text>
                  </View>
                  <View style={styles.storeBody}>
                    <View style={styles.storeNameRow}>
                      <Text style={[styles.storeName, on && styles.storeNameOn]}>{store.name}</Text>
                      {store.active && <View style={styles.activeDot} />}
                    </View>
                    <Text style={styles.storeSub}>{store.subtitle}</Text>
                  </View>
                  <Text style={[styles.storeCheck, on && styles.storeCheckOn]}>{on ? '✓' : '›'}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.ctaWrap}>
            <Cta
              label={isHe ? '← המשך' : '→ Continue'}
              onPress={() => setStep(3)}
              disabled={!storeValid}
            />
            {!storeValid && (
              <Text style={styles.hint}>{isHe ? 'יש לבחור חנות' : 'Please choose a store'}</Text>
            )}
          </View>
        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════
          STEP 3 — How long? + Launch
      ════════════════════════════════════════════════ */}
      {step === 3 && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>

          {!launched ? (
            <>
              <QuestionHeader
                step={3}
                question={isHe ? 'כמה זמן?' : 'How long?'}
                sub={isHe ? 'בחר כמה זמן שכנים יוכלו להצטרף. גרור לבחירה.' : 'Choose how long neighbors can join. Swipe to select.'}
                onBack={goBack}
              />

              {/* Timer wheel */}
              <View style={styles.timerCard}>
                <View style={styles.timerDisplay}>
                  {timerHours ? (
                    <>
                      <Text style={styles.timerNumber}>{timerHours}</Text>
                      <Text style={styles.timerUnit}>{isHe ? 'שע׳' : 'HRS'}</Text>
                    </>
                  ) : (
                    <Text style={styles.timerPrompt}>{isHe ? '← גרור' : 'Swipe →'}</Text>
                  )}
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
                  {TIMER_PRESETS.map((h) => {
                    const on = timerHours === h;
                    return (
                      <Pressable key={h} onPress={() => {
                        setTimerHours(h);
                        const idx = TIMER_PRESETS.indexOf(h);
                        timerScrollRef.current?.scrollTo({ x: idx * TIMER_ITEM_WIDTH, animated: true });
                      }} style={[styles.timerItem, on && styles.timerItemOn]}>
                        <Text style={[styles.timerVal, on && styles.timerValOn]}>{h}</Text>
                        <Text style={[styles.timerH, on && styles.timerHOn]}>h</Text>
                      </Pressable>
                    );
                  })}
                  <View style={{ width: (SCREEN_WIDTH - 36 - TIMER_ITEM_WIDTH) / 2 }} />
                </ScrollView>
              </View>

              {/* Summary pill */}
              <View style={styles.summaryPill}>
                <Text style={styles.summaryText}>
                  {firstName.trim()} · {storeName}{timerHours ? ` · ${timerHours}h` : ''}
                </Text>
              </View>

              {/* Launch button */}
              <View style={styles.ctaWrap}>
                <Cta
                  label={launching ? '···' : (timerHours
                    ? (isHe ? `🚀 השקה — ${timerHours} שעות` : `🚀 Launch — ${timerHours}h timer`)
                    : (isHe ? 'בחר זמן כדי להשיק' : 'Select a time to launch'))}
                  onPress={handleLaunch}
                  disabled={!timerValid || !orderId}
                  loading={launching}
                />
                {!timerValid && (
                  <Text style={styles.hint}>{isHe ? 'יש לבחור זמן' : 'Please select a time'}</Text>
                )}
                <Text style={styles.launchNote}>
                  {isHe
                    ? 'שכנים בבניין שלך יקבלו הודעה ויוכלו להצטרף.'
                    : 'Neighbors in your building will be notified and can join.'}
                </Text>
              </View>
            </>
          ) : (
            /* ── Success state ── */
            <>
              <View style={styles.successCard}>
                <Text style={styles.successEmoji}>🎉</Text>
                <Text style={styles.successTitle}>{isHe ? 'ההזמנה פעילה!' : 'Order is live!'}</Text>
                <Text style={styles.successSub}>
                  {storeName} · {isHe ? `נסגר בעוד ${timerHours} שעות` : `Closes in ${timerHours} hours`}
                </Text>
              </View>

              <View style={styles.inviteBox}>
                <Text style={styles.inviteLabel}>{isHe ? 'קישור לשיתוף' : 'SHARE LINK'}</Text>
                <View style={styles.inviteRow}>
                  <Text style={styles.inviteLink} numberOfLines={1}>{inviteLink}</Text>
                  <Pressable onPress={handleCopy} style={styles.copyBtn}>
                    <Text style={styles.copyText}>{copied ? '✓' : (isHe ? 'העתק' : 'Copy')}</Text>
                  </Pressable>
                </View>
              </View>

              <Cta label={isHe ? '💬 שלח ב-WhatsApp' : '💬 Invite via WhatsApp'} onPress={handleWhatsApp} green />

              <Pressable onPress={() => router.replace('/(tabs)/building')} style={styles.doneBtn}>
                <Text style={styles.doneBtnText}>{isHe ? 'סיים ←' : 'Done →'}</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bg },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120, gap: 20 },

  // Question header
  qHeader:  { gap: 8, paddingTop: 8 },
  qTopRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:  { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backArrow:{ fontSize: 28, color: colors.tx, fontFamily: fontFamily.bodyBold, lineHeight: 32 },
  stepPill: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.acc, letterSpacing: 1 },
  kicker:   { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2.4, color: colors.acc, textTransform: 'uppercase' },
  question: { fontFamily: fontFamily.display, fontSize: 34, color: colors.tx, lineHeight: 40 },
  qSub:     { fontFamily: fontFamily.body, fontSize: 14, color: colors.mu, lineHeight: 21 },

  // CTA
  ctaWrap: { gap: 10, marginTop: 4 },
  cta:     { minHeight: 56, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, ...shadow.cta },
  ctaOff:  { opacity: 0.35 },
  ctaText: { fontFamily: fontFamily.bodyBold, fontSize: 16, color: colors.s1, letterSpacing: 0.2 },
  hint:    { fontFamily: fontFamily.body, fontSize: 13, color: colors.mu2, textAlign: 'center' },

  gap16: { gap: 16 },

  // Store list
  storeList:      { gap: 10 },
  storeCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.s1, borderRadius: radii.xl, borderWidth: 1.5, borderColor: colors.br, padding: 16, gap: 14, ...shadow.card },
  storeCardOn:    { borderColor: colors.acc, backgroundColor: colors.accLight },
  storeLogo:      { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.s2, alignItems: 'center', justifyContent: 'center' },
  storeLogoOn:    { backgroundColor: colors.acc },
  storeLogoText:  { fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.mu },
  storeLogoTextOn:{ color: colors.s1 },
  storeBody:      { flex: 1, gap: 3 },
  storeNameRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  storeName:      { fontFamily: fontFamily.bodyBold, fontSize: 15, color: colors.tx },
  storeNameOn:    { color: colors.acc },
  activeDot:      { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.acc },
  storeSub:       { fontFamily: fontFamily.body, fontSize: 12, color: colors.mu },
  storeCheck:     { fontFamily: fontFamily.bodyBold, fontSize: 20, color: colors.mu2 },
  storeCheckOn:   { color: colors.acc, fontSize: 18 },

  // Timer
  timerCard:        { backgroundColor: colors.s1, borderRadius: radii.xl, paddingVertical: 24, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.br, gap: 16, ...shadow.card },
  timerDisplay:     { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingLeft: 4 },
  timerNumber:      { fontFamily: fontFamily.display, fontSize: 64, color: colors.tx, lineHeight: 68 },
  timerUnit:        { fontFamily: fontFamily.bodyBold, fontSize: 14, color: colors.mu, letterSpacing: 1, paddingBottom: 10 },
  timerPrompt:      { fontFamily: fontFamily.display, fontSize: 28, color: colors.mu2, lineHeight: 34, fontStyle: 'italic' },
  timerWheelContent:{ alignItems: 'center' },
  timerItem:        { width: TIMER_ITEM_WIDTH, height: 60, borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.br, backgroundColor: colors.s2, marginHorizontal: 4 },
  timerItemOn:      { borderColor: colors.acc, backgroundColor: colors.accLight },
  timerVal:         { fontFamily: fontFamily.display, fontSize: 26, color: colors.mu, lineHeight: 30 },
  timerValOn:       { color: colors.acc },
  timerH:           { fontFamily: fontFamily.bodyBold, fontSize: 11, color: colors.mu2 },
  timerHOn:         { color: colors.acc },

  summaryPill: { alignSelf: 'center', backgroundColor: colors.s2, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: colors.br },
  summaryText: { fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.tx },

  launchNote: { fontFamily: fontFamily.body, fontSize: 13, color: colors.mu, textAlign: 'center', lineHeight: 19 },

  // Success
  successCard:  { backgroundColor: colors.accLight, borderRadius: radii.xl, padding: 32, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.acc, ...shadow.card },
  successEmoji: { fontSize: 48, lineHeight: 56 },
  successTitle: { fontFamily: fontFamily.display, fontSize: 30, color: colors.tx, textAlign: 'center', lineHeight: 34 },
  successSub:   { fontFamily: fontFamily.body, fontSize: 14, color: colors.mu, textAlign: 'center' },

  inviteBox:   { backgroundColor: colors.s1, borderRadius: radii.xl, padding: 16, borderWidth: 1, borderColor: colors.br, gap: 8, ...shadow.card },
  inviteLabel: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2, color: colors.mu, textTransform: 'uppercase' },
  inviteRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inviteLink:  { flex: 1, fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.tx, letterSpacing: 0.3 },
  copyBtn:     { backgroundColor: colors.accLight, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.acc },
  copyText:    { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.acc },

  doneBtn:     { alignItems: 'center', paddingVertical: 16 },
  doneBtnText: { fontFamily: fontFamily.bodyBold, fontSize: 14, color: colors.acc },
});
