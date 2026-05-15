import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { useAuthStore } from '@/stores/authStore';
import { useLocale } from '@/i18n/locale';
import { track } from '@/lib/posthog';
import { buildInviteUrl } from '@/lib/deeplinks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TIMER_ITEM_WIDTH = 88;
const TIMER_SLOT = TIMER_ITEM_WIDTH + 8; // chip width + marginHorizontal*2
const TIMER_PRESETS = [6, 12, 24, 48, 72] as const;

type StoreId = 'zara' | 'hm' | 'amazon' | 'superpharm' | 'ikea';
type StoreInfo = { id: StoreId; name: string; logo: string; subtitle: string; active: boolean };

const STORES: StoreInfo[] = [
  { id: 'zara',       name: 'Zara',        logo: 'Z',  subtitle: 'Fashion · Spring drop',    active: true  },
  { id: 'hm',         name: 'H&M',         logo: 'H',  subtitle: 'Fashion · Mid-season sale', active: false },
  { id: 'amazon',     name: 'Amazon',      logo: 'A',  subtitle: 'Pantry & home',             active: false },
  { id: 'superpharm', name: 'Super-Pharm', logo: 'SP', subtitle: 'Pharmacy & beauty',         active: false },
  { id: 'ikea',       name: 'IKEA',        logo: 'I',  subtitle: 'Home & furniture',          active: false },
];

function ProgressDots({ current }: { current: number }) {
  return (
    <View style={s.dots}>
      {[1, 2, 3].map((n) => (
        <View key={n} style={[s.dot, current >= n && s.dotOn]} />
      ))}
    </View>
  );
}

function StepShell({ children, onBack, step }: { children: React.ReactNode; onBack: () => void; step: number }) {
  return (
    <View style={s.stepShell}>
      <View style={s.stepNav}>
        <Pressable onPress={onBack} style={s.navBack} accessibilityRole="button">
          <Text style={s.navBackArrow}>‹</Text>
        </Pressable>
        <ProgressDots current={step} />
        <View style={s.navBack} />
      </View>
      {children}
    </View>
  );
}

function BigCta({ label, onPress, disabled, loading, dark }: {
  label: string; onPress: () => void; disabled?: boolean; loading?: boolean; dark?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={[s.cta, dark && s.ctaDark, (disabled || loading) && s.ctaOff]}
    >
      <Text style={[s.ctaText, dark && s.ctaTextDark]}>{loading ? '···' : label}</Text>
    </Pressable>
  );
}

export default function NewOrder() {
  const router = useRouter();
  const { language } = useLocale();
  const profile = useAuthStore((st) => st.profile);
  const user = useAuthStore((st) => st.user);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1 — group order name
  const [orderName, setOrderName] = useState('');
  const nameValid = orderName.trim().length >= 2;

  // Step 2
  const [selectedStore, setSelectedStore] = useState<string>('');
  const storeValid = selectedStore !== '';

  // Step 3 — timer cannot be changed after draft is created
  const timerRef = useRef<ScrollView>(null);
  const [timerHours, setTimerHours] = useState<number | null>(null);
  const timerValid = timerHours !== null;

  // Draft / Launch
  const [draftTriggered, setDraftTriggered] = useState(false);
  const [orderId,        setOrderId]        = useState<string | null>(null);
  const [inviteToken,    setInviteToken]    = useState<string | null>(null);
  const [launching,      setLaunching]      = useState(false);
  const [copied,         setCopied]         = useState(false);

  const createOrder    = useCreateOrder();
  const generateInvite = useGenerateInvite();

  const isHe = language === 'he';
  const storeInfo   = STORES.find((st) => st.id === selectedStore);
  const storeName   = storeInfo?.name ?? '';
  const addressLine = [profile?.street, profile?.building, profile?.city].filter(Boolean).join(', ');
  const fullUrl     = inviteToken ? buildInviteUrl(inviteToken) : '';
  const shortLink   = inviteToken ? fullUrl.replace('https://', '').toUpperCase().slice(0, 28) : '';

  // Create order + generate draft invite when step 4 first appears
  useEffect(() => {
    if (step !== 4 || draftTriggered || !user?.id || !timerHours) return;
    setDraftTriggered(true);
    createOrder.mutateAsync({
      productUrl: '',
      productTitle: orderName.trim() || storeName,
      productPriceAgorot: 0,
      storeKey: selectedStore,
      storeLabel: storeName,
      estimatedShippingAgorot: 0,
      freeShippingThresholdAgorot: 0,
      timerMinutes: timerHours * 60,
      maxParticipants: 20,
      pickupResponsibleUserId: user.id,
      preferredPickupLocation: addressLine,
    }).then(async (order) => {
      setOrderId(order.id);
      try {
        const invite = await generateInvite.mutateAsync(order.id);
        setInviteToken(invite.token);
      } catch { /* non-fatal */ }
    }).catch(() => {});
  }, [step, draftTriggered, user?.id, timerHours]);

  const displayName = orderName.trim() || storeName;

  const draftMsg = isHe
    ? `"${displayName}" — הזמנה קבוצתית מ-${storeName} ב-Shakana. ביחד חוסכים בדמי משלוח! ${fullUrl || shortLink}`
    : `"${displayName}" — group order from ${storeName} on Shakana. We split the shipping! ${fullUrl || shortLink}`;

  const liveMsg = isHe
    ? `"${displayName}" פעילה! יש לך ${timerHours} שעות להצטרף להזמנה הקבוצתית מ-${storeName} 👇\n${fullUrl || shortLink}`
    : `"${displayName}" is live! You have ${timerHours}h to join the group order from ${storeName} 👇\n${fullUrl || shortLink}`;

  const handleCopy = async (msg: string) => {
    await Clipboard.setStringAsync(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = (msg: string) =>
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() => {});

  const handleLaunch = async () => {
    if (!orderId) return;
    setLaunching(true);
    try {
      track('order_launched', { orderId, storeKey: selectedStore, timerHours });
      setStep(5);
    } finally {
      setLaunching(false);
    }
  };

  const handleNameNext = () => {
    if (!nameValid) return;
    setStep(2);
  };

  const goBack = () => {
    if (step === 4) { setStep(3); return; }
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5);
    else router.back();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1 — Name
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 1) return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <StepShell onBack={goBack} step={1}>
          <Text style={s.kicker}>SHAKANA</Text>
          <Text style={s.question}>{isHe ? 'מה שם ההזמנה?' : 'Name your group order'}</Text>
          <Text style={s.qSub}>{isHe ? 'השם יופיע בקישור ובהודעת ההזמנה לשכנים.' : 'This name appears in the invite link and message your neighbors receive.'}</Text>
        </StepShell>

        <Field
          label={isHe ? 'שם ההזמנה *' : 'Order name *'}
          value={orderName}
          onChange={setOrderName}
          placeholder={isHe ? 'למשל: זרא קומה 3, איקאה ביחד' : 'e.g. Floor 3 Zara Run, IKEA Together'}
          ltr={language !== 'he'}
        />

        <BigCta label={isHe ? 'המשך ←' : 'Continue →'} onPress={handleNameNext} disabled={!nameValid} />
        {!nameValid && <Text style={s.hint}>{isHe ? 'יש להזין לפחות 2 תווים' : 'At least 2 characters required'}</Text>}
      </ScrollView>
    </SafeAreaView>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — Store
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 2) return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <StepShell onBack={goBack} step={2}>
          <Text style={s.kicker}>SHAKANA</Text>
          <Text style={s.question}>{isHe ? 'איזה חנות?' : 'Which store?'}</Text>
          <Text style={s.qSub}>{isHe ? 'בחר חנות — לא ניתן לשנות לאחר פתיחת הטיוטה.' : 'Pick a store — cannot be changed after draft is created.'}</Text>
        </StepShell>

        <View style={s.storeList}>
          {STORES.map((store) => {
            const on = selectedStore === store.id;
            return (
              <Pressable key={store.id} onPress={() => setSelectedStore(store.id)}
                style={[s.storeCard, on && s.storeCardOn]}>
                <View style={[s.storeLogo, on && s.storeLogoOn]}>
                  <Text style={[s.storeLogoTx, on && s.storeLogoTxOn]}>{store.logo}</Text>
                </View>
                <View style={s.storeBody}>
                  <View style={s.storeNameRow}>
                    <Text style={[s.storeName, on && s.storeNameOn]}>{store.name}</Text>
                    {store.active && <View style={s.activePip} />}
                  </View>
                  <Text style={s.storeSub}>{store.subtitle}</Text>
                </View>
                <Text style={[s.storeChevron, on && s.storeChevronOn]}>{on ? '✓' : '›'}</Text>
              </Pressable>
            );
          })}
        </View>

        <BigCta label={isHe ? 'המשך ←' : 'Continue →'} onPress={() => setStep(3)} disabled={!storeValid} />
        {!storeValid && <Text style={s.hint}>{isHe ? 'יש לבחור חנות' : 'Please choose a store'}</Text>}
      </ScrollView>
    </SafeAreaView>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3 — Timer (locked after draft is created)
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 3) return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <StepShell onBack={goBack} step={3}>
          <Text style={s.kicker}>SHAKANA</Text>
          <Text style={s.question}>{isHe ? 'כמה זמן?' : 'How long?'}</Text>
          <Text style={s.qSub}>{isHe ? 'כמה זמן שכנים יוכלו להצטרף — לא ניתן לשנות לאחר השקה.' : 'How long neighbors can join — cannot be changed after launch.'}</Text>
        </StepShell>

        <View style={s.timerCard}>
          <View style={s.timerDisplay}>
            {timerHours ? (
              <>
                <Text style={s.timerNum}>{timerHours}</Text>
                <Text style={s.timerUnit}>{isHe ? 'שע׳' : 'HRS'}</Text>
              </>
            ) : (
              <Text style={s.timerPrompt}>{isHe ? 'החלק לבחירה' : 'Swipe to pick'}</Text>
            )}
          </View>
          <View style={s.timerTrack}>
            <ScrollView
              ref={timerRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={TIMER_SLOT}
              decelerationRate="fast"
              contentContainerStyle={s.timerRow}
              scrollEventThrottle={16}
              onScroll={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / TIMER_SLOT);
                const h = TIMER_PRESETS[Math.max(0, Math.min(idx, TIMER_PRESETS.length - 1))];
                if (h !== timerHours) setTimerHours(h);
              }}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / TIMER_SLOT);
                setTimerHours(TIMER_PRESETS[Math.max(0, Math.min(idx, TIMER_PRESETS.length - 1))]);
              }}
            >
              <View style={{ width: (SCREEN_WIDTH - 40 - TIMER_SLOT) / 2 }} />
              {TIMER_PRESETS.map((h) => {
                const on = timerHours === h;
                return (
                  <Pressable key={h} onPress={() => {
                    setTimerHours(h);
                    timerRef.current?.scrollTo({ x: TIMER_PRESETS.indexOf(h) * TIMER_SLOT, animated: true });
                  }} style={[s.timerChip, on && s.timerChipOn]}>
                    <Text style={[s.timerChipNum, on && s.timerChipNumOn]}>{h}</Text>
                    <Text style={[s.timerChipH, on && s.timerChipHOn]}>h</Text>
                  </Pressable>
                );
              })}
              <View style={{ width: (SCREEN_WIDTH - 40 - TIMER_SLOT) / 2 }} />
            </ScrollView>
            {/* center selector indicator */}
            <View style={s.timerCenter} pointerEvents="none">
              <View style={s.timerCenterLine} />
              <View style={[s.timerCenterLine, { marginLeft: TIMER_SLOT - 2 }]} />
            </View>
          </View>
        </View>

        <View style={s.reviewPill}>
          <Text style={s.reviewPillTx}>{displayName} · {storeName}{timerHours ? ` · ${timerHours}h` : ''}</Text>
        </View>

        <BigCta
          label={timerValid ? (isHe ? 'המשך לטיוטה ←' : 'Continue to Draft →') : (isHe ? 'בחר זמן' : 'Pick a time')}
          onPress={() => setStep(4)}
          disabled={!timerValid}
        />
        {!timerValid && <Text style={s.hint}>{isHe ? 'יש לבחור זמן' : 'Please select a time'}</Text>}
      </ScrollView>
    </SafeAreaView>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4 — Draft (shareable, not yet live)
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 4) {
    const loading = createOrder.isPending || generateInvite.isPending;
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.stepNav}>
            <Pressable onPress={goBack} style={s.navBack} accessibilityRole="button">
              <Text style={s.navBackArrow}>‹</Text>
            </Pressable>
            <View style={s.draftBadge}>
              <Text style={s.draftBadgeTx}>{isHe ? 'טיוטה · לא פעיל' : 'DRAFT · NOT LIVE'}</Text>
            </View>
            <View style={s.navBack} />
          </View>

          {/* Summary card */}
          <View style={s.summaryCard}>
            <Text style={s.summaryCardLabel}>{isHe ? 'סיכום הזמנה' : 'ORDER SUMMARY'}</Text>
            <View style={s.summaryRow}>
              <View style={s.summaryItem}>
                <Text style={s.summaryItemLabel}>{isHe ? 'שם' : 'NAME'}</Text>
                <Text style={s.summaryItemValue}>{displayName}</Text>
              </View>
              <View style={s.summaryDivider} />
              <View style={s.summaryItem}>
                <Text style={s.summaryItemLabel}>{isHe ? 'חנות' : 'STORE'}</Text>
                <Text style={s.summaryItemValue}>{storeName}</Text>
              </View>
              <View style={s.summaryDivider} />
              <View style={s.summaryItem}>
                <Text style={s.summaryItemLabel}>{isHe ? 'טיימר' : 'TIMER'}</Text>
                <Text style={s.summaryItemValue}>{timerHours}h</Text>
              </View>
            </View>
          </View>

          {/* Draft link */}
          <View style={s.draftLinkCard}>
            <Text style={s.draftLinkLabel}>{isHe ? 'קישור טיוטה — שתף לפני השקה' : 'DRAFT LINK — SHARE BEFORE LAUNCH'}</Text>
            {loading ? (
              <Text style={s.draftLinkPlaceholder}>···</Text>
            ) : (
              <Text style={s.draftLinkUrl} numberOfLines={1}>{shortLink || 'SHAKANA.APP/G/...'}</Text>
            )}
            <Text style={s.draftLinkNote}>
              {isHe
                ? 'שכנים יוכלו לראות את הטיוטה אך ההזמנה תהיה פעילה רק לאחר לחיצה על השקה.'
                : 'Neighbors can preview the draft. The order goes live only when you tap Launch.'}
            </Text>
          </View>

          {/* Share draft buttons */}
          <View style={s.draftShareRow}>
            <Pressable
              onPress={() => handleWhatsApp(draftMsg)}
              disabled={!inviteToken}
              style={[s.draftShareBtn, !inviteToken && s.ctaOff]}
            >
              <Text style={s.draftShareBtnTx}>💬 {isHe ? 'שתף טיוטה' : 'Share Draft'}</Text>
            </Pressable>
            <Pressable
              onPress={() => handleCopy(draftMsg)}
              disabled={!inviteToken}
              style={[s.draftShareBtn, !inviteToken && s.ctaOff]}
            >
              <Text style={s.draftShareBtnTx}>{copied ? '✓' : (isHe ? 'העתק קישור' : 'Copy Link')}</Text>
            </Pressable>
          </View>

          {/* Launch button */}
          <View style={s.launchSection}>
            <BigCta
              label={launching ? '···' : (isHe ? '🚀 השק עכשיו' : '🚀 Launch Order')}
              onPress={handleLaunch}
              disabled={!orderId || launching}
              loading={launching}
            />
            <View style={s.lockNote}>
              <Text style={s.lockNoteIcon}>🔒</Text>
              <Text style={s.lockNoteTx}>
                {isHe
                  ? 'לאחר ההשקה הטיימר מתחיל ולא ניתן לשנות חנות, זמן או פרטים.'
                  : 'After launch the timer starts. Store, timer, and details are locked.'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5 — Launched (live)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.stepNav}>
          <View style={s.navBack} />
          <View style={s.liveBadge}>
            <Text style={s.liveBadgeTx}>{isHe ? '🟢 פעיל' : '🟢 LIVE'}</Text>
          </View>
          <Pressable onPress={() => router.replace('/(tabs)/building')} style={s.navBack} accessibilityRole="button">
            <Text style={s.navHomeIcon}>⌂</Text>
          </Pressable>
        </View>

        <View style={s.liveCard}>
          <Text style={s.liveEmoji}>🎉</Text>
          <Text style={s.liveTitle}>{isHe ? 'ההזמנה פעילה!' : 'Order is live!'}</Text>
          <Text style={s.liveSub}>
            {storeName} · {isHe ? `נסגר בעוד ${timerHours ?? '?'} שעות` : `Closes in ${timerHours ?? '?'} hours`}
          </Text>
          <View style={s.liveLockBadge}>
            <Text style={s.liveLockTx}>🔒 {isHe ? 'נעול — לא ניתן לשנות' : 'Locked — nothing can be changed'}</Text>
          </View>
        </View>

        <View style={s.inviteCard}>
          <Text style={s.inviteCardLabel}>{isHe ? 'העתק הודעה + קישור' : 'COPY MESSAGE + LINK'}</Text>
          <View style={s.inviteCardRow}>
            <Text style={s.inviteCardUrl} numberOfLines={1}>{shortLink}</Text>
            <Pressable onPress={() => handleCopy(liveMsg)} style={s.copyBtn}>
              <Text style={s.copyBtnTx}>{copied ? '✓' : (isHe ? 'העתק' : 'Copy')}</Text>
            </Pressable>
          </View>
          <Text style={s.inviteCardHint}>
            {isHe ? 'מעתיק את ההודעה המלאה — מוכן להדבקה בכל מקום.' : 'Copies the full message — ready to paste anywhere.'}
          </Text>
        </View>

        <BigCta
          label={isHe ? '💬 שלח ב-WhatsApp' : '💬 Invite via WhatsApp'}
          onPress={() => handleWhatsApp(liveMsg)}
          dark
        />

        <Pressable onPress={() => router.replace('/(tabs)/building')} style={s.doneLink}>
          <Text style={s.doneLinkTx}>{isHe ? 'לדף הבית ←' : 'Go to home →'}</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content:{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120, gap: 18 },

  // Nav
  stepShell: { gap: 10, paddingTop: 4 },
  stepNav:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  navBack:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navBackArrow: { fontSize: 30, color: colors.tx, fontFamily: fontFamily.bodyBold, lineHeight: 34 },

  // Progress dots
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.br },
  dotOn:{ backgroundColor: colors.hot },

  // Question text
  kicker:   { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2.4, color: colors.hot, textTransform: 'uppercase', marginTop: 6 },
  question: { fontFamily: fontFamily.display, fontSize: 36, color: colors.tx, lineHeight: 42 },
  qSub:     { fontFamily: fontFamily.body, fontSize: 14, color: colors.mu, lineHeight: 20 },

  // CTA
  cta:       { minHeight: 58, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: colors.acc, ...shadow.cta },
  ctaDark:   { backgroundColor: colors.ink },
  ctaOff:    { opacity: 0.3 },
  ctaText:   { fontFamily: fontFamily.bodyBold, fontSize: 16, color: colors.s1, letterSpacing: 0.2 },
  ctaTextDark: { color: colors.white },
  hint:      { fontFamily: fontFamily.body, fontSize: 13, color: colors.mu2, textAlign: 'center' },

  // Fields
  fieldGroup: { gap: 14 },

  // Store list
  storeList:     { gap: 10 },
  storeCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.s1, borderRadius: radii.xl, borderWidth: 1.5, borderColor: colors.br, padding: 16, gap: 14, ...shadow.card },
  storeCardOn:   { borderColor: colors.acc, backgroundColor: colors.accLight },
  storeLogo:     { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.s2, alignItems: 'center', justifyContent: 'center' },
  storeLogoOn:   { backgroundColor: colors.acc },
  storeLogoTx:   { fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.mu },
  storeLogoTxOn: { color: colors.s1 },
  storeBody:     { flex: 1, gap: 3 },
  storeNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  storeName:     { fontFamily: fontFamily.bodyBold, fontSize: 15, color: colors.tx },
  storeNameOn:   { color: colors.acc },
  activePip:     { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.acc },
  storeSub:      { fontFamily: fontFamily.body, fontSize: 12, color: colors.mu },
  storeChevron:  { fontFamily: fontFamily.bodyBold, fontSize: 20, color: colors.mu2 },
  storeChevronOn:{ color: colors.acc, fontSize: 18 },

  // Timer
  timerCard:       { backgroundColor: colors.s1, borderRadius: radii.xl, paddingVertical: 24, paddingHorizontal: 0, borderWidth: 1, borderColor: colors.br, gap: 16, ...shadow.card },
  timerDisplay:    { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingLeft: 20 },
  timerNum:        { fontFamily: fontFamily.display, fontSize: 68, color: colors.tx, lineHeight: 72 },
  timerUnit:       { fontFamily: fontFamily.bodyBold, fontSize: 14, color: colors.mu, letterSpacing: 1, paddingBottom: 10 },
  timerPrompt:     { fontFamily: fontFamily.display, fontSize: 28, color: colors.mu2, lineHeight: 34, fontStyle: 'italic', paddingLeft: 4 },
  timerTrack:      { position: 'relative' },
  timerRow:        { alignItems: 'center', paddingHorizontal: 0 },
  timerChip:       { width: TIMER_ITEM_WIDTH, height: 60, borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.br, backgroundColor: colors.s2, marginHorizontal: 4 },
  timerChipOn:     { borderColor: colors.acc, backgroundColor: colors.accLight },
  timerChipNum:    { fontFamily: fontFamily.display, fontSize: 26, color: colors.mu, lineHeight: 30 },
  timerChipNumOn:  { color: colors.acc },
  timerChipH:      { fontFamily: fontFamily.bodyBold, fontSize: 11, color: colors.mu2 },
  timerChipHOn:    { color: colors.acc },
  timerCenter:     { position: 'absolute', top: 0, bottom: 0, left: (SCREEN_WIDTH - 40 - TIMER_SLOT) / 2, width: TIMER_SLOT, flexDirection: 'row', alignItems: 'stretch', pointerEvents: 'none' },
  timerCenterLine: { width: 2, backgroundColor: colors.acc, opacity: 0.35, borderRadius: 1 },

  reviewPill:   { alignSelf: 'center', backgroundColor: colors.s2, borderRadius: radii.pill, paddingHorizontal: 18, paddingVertical: 9, borderWidth: 1, borderColor: colors.br },
  reviewPillTx: { fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.tx },

  // Draft
  draftBadge:  { backgroundColor: colors.s2, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: colors.br },
  draftBadgeTx:{ fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 1.8, color: colors.mu, textTransform: 'uppercase' },

  summaryCard:      { backgroundColor: colors.ink, borderRadius: radii.xl, padding: 20, gap: 14, ...shadow.cta },
  summaryCardLabel: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' },
  summaryRow:       { flexDirection: 'row', alignItems: 'center' },
  summaryItem:      { flex: 1, alignItems: 'center', gap: 4 },
  summaryItemLabel: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 1.4, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' },
  summaryItemValue: { fontFamily: fontFamily.display, fontSize: 18, color: colors.white, lineHeight: 22 },
  summaryDivider:   { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.12)' },

  draftLinkCard:       { backgroundColor: colors.s1, borderRadius: radii.xl, padding: 18, gap: 10, borderWidth: 1, borderColor: colors.br, ...shadow.card },
  draftLinkLabel:      { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 1.8, color: colors.mu, textTransform: 'uppercase' },
  draftLinkUrl:        { fontFamily: fontFamily.bodyBold, fontSize: 15, color: colors.tx, letterSpacing: 0.3 },
  draftLinkPlaceholder:{ fontFamily: fontFamily.bodyBold, fontSize: 18, color: colors.mu2 },
  draftLinkNote:       { fontFamily: fontFamily.body, fontSize: 12, color: colors.mu, lineHeight: 17 },

  draftShareRow:  { flexDirection: 'row', gap: 10 },
  draftShareBtn:  { flex: 1, minHeight: 50, borderRadius: radii.pill, borderWidth: 1.5, borderColor: colors.acc, alignItems: 'center', justifyContent: 'center' },
  draftShareBtnTx:{ fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.acc },

  launchSection: { gap: 12 },
  lockNote:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4 },
  lockNoteIcon:  { fontSize: 14, lineHeight: 20 },
  lockNoteTx:    { flex: 1, fontFamily: fontFamily.body, fontSize: 13, color: colors.mu, lineHeight: 19 },

  // Live
  liveCard:      { backgroundColor: colors.accLight, borderRadius: radii.xl, padding: 32, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.acc, ...shadow.card },
  liveEmoji:     { fontSize: 52, lineHeight: 60 },
  liveTitle:     { fontFamily: fontFamily.display, fontSize: 32, color: colors.tx, textAlign: 'center', lineHeight: 36 },
  liveSub:       { fontFamily: fontFamily.body, fontSize: 14, color: colors.mu, textAlign: 'center' },
  liveLockBadge: { backgroundColor: colors.s1, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: colors.br, marginTop: 4 },
  liveLockTx:    { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.mu },

  inviteCard:      { backgroundColor: colors.s1, borderRadius: radii.xl, padding: 18, borderWidth: 1, borderColor: colors.br, gap: 10, ...shadow.card },
  inviteCardLabel: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2, color: colors.mu, textTransform: 'uppercase' },
  inviteCardRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inviteCardUrl:   { flex: 1, fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.tx, letterSpacing: 0.3 },
  inviteCardHint:  { fontFamily: fontFamily.body, fontSize: 11, color: colors.mu, lineHeight: 16 },
  copyBtn:         { backgroundColor: colors.accLight, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: colors.acc },
  copyBtnTx:       { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.acc },

  doneLink:   { alignItems: 'center', paddingVertical: 14 },
  doneLinkTx: { fontFamily: fontFamily.bodyBold, fontSize: 14, color: colors.acc },

  liveBadge:   { backgroundColor: colors.accLight, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: colors.acc },
  liveBadgeTx: { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 1.8, color: colors.acc, textTransform: 'uppercase' },
  navHomeIcon: { fontSize: 22, color: colors.tx, textAlign: 'center' },
});
