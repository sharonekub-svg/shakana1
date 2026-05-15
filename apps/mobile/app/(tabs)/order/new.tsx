import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useCreateOrder } from '@/api/orders';
import { useGenerateInvite } from '@/api/invites';
import { useAuthStore } from '@/stores/authStore';
import { useLocale } from '@/i18n/locale';
import { track } from '@/lib/posthog';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TIMER_PRESETS = [6, 12, 24, 48, 72] as const;
const TIMER_CHIP_W = 82;
const TIMER_SLOT = TIMER_CHIP_W + 8;

type StoreId = 'zara' | 'hm' | 'amazon' | 'superpharm' | 'ikea';
const STORES: { id: StoreId; he: string; en: string }[] = [
  { id: 'zara',       he: 'זרה',       en: 'Zara'       },
  { id: 'hm',         he: 'H&M',       en: 'H&M'        },
  { id: 'amazon',     he: 'אמזון',     en: 'Amazon'     },
  { id: 'superpharm', he: 'סופר-פארם', en: 'Super-Pharm'},
  { id: 'ikea',       he: 'איקאה',     en: 'IKEA'       },
];

type Mode = 'create' | 'join';

function extractToken(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/\/join\/([^/?#\s]+)/);
  return match ? match[1] : trimmed;
}

export default function NewOrder() {
  const router = useRouter();
  const { language } = useLocale();
  const profile = useAuthStore((st) => st.profile);
  const user    = useAuthStore((st) => st.user);
  const isHe = language === 'he';

  const [mode, setMode] = useState<Mode>('create');
  const [step, setStep] = useState<1 | 2>(1);

  // ── Create fields ────────────────────────────────────────────────────
  const [myName,    setMyName]    = useState(profile ? `${profile.first_name} ${profile.last_name}`.trim() : '');
  const [groupName, setGroupName] = useState('');
  const [store,     setStore]     = useState<StoreId | ''>('');
  const [timerHours, setTimerHours] = useState<number>(24);

  // ── Address fields ───────────────────────────────────────────────────
  const [addrCity,     setAddrCity]     = useState(profile?.city     ?? '');
  const [addrStreet,   setAddrStreet]   = useState(profile?.street   ?? '');
  const [addrBuilding, setAddrBuilding] = useState(profile?.building ?? '');

  // ── Join fields ──────────────────────────────────────────────────────
  const [joinName, setJoinName] = useState(profile ? `${profile.first_name} ${profile.last_name}`.trim() : '');
  const [code,     setCode]     = useState('');

  const timerRef = useRef<ScrollView>(null);
  const codeRef  = useRef<TextInput>(null);

  const createOrder    = useCreateOrder();
  const generateInvite = useGenerateInvite();

  // Scroll timer to initial position after mount
  useEffect(() => {
    const idx = TIMER_PRESETS.indexOf(timerHours as typeof TIMER_PRESETS[number]);
    if (idx >= 0) {
      globalThis.requestAnimationFrame(() => {
        timerRef.current?.scrollTo({ x: idx * TIMER_SLOT, animated: false });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step1Valid =
    myName.trim().length >= 2 &&
    groupName.trim().length >= 2 &&
    store !== '';

  const step2Valid =
    addrCity.trim().length >= 2 &&
    addrStreet.trim().length >= 2 &&
    addrBuilding.trim().length >= 1;

  const joinValid =
    joinName.trim().length >= 2 &&
    code.trim().length >= 3;

  const handleStep1Next = () => {
    if (!step1Valid) return;
    setStep(2);
  };

  const handleCreate = async () => {
    if (!step2Valid || !user?.id) return;
    const storeInfo = STORES.find((s) => s.id === store);
    const storeName = storeInfo ? (isHe ? storeInfo.he : storeInfo.en) : store;
    const address = `${addrStreet.trim()} ${addrBuilding.trim()}, ${addrCity.trim()}`;
    try {
      const order = await createOrder.mutateAsync({
        productUrl: '',
        productTitle: groupName.trim(),
        productPriceAgorot: 0,
        storeKey: store,
        storeLabel: storeName,
        estimatedShippingAgorot: 0,
        freeShippingThresholdAgorot: 0,
        timerMinutes: timerHours * 60,
        maxParticipants: 20,
        pickupResponsibleUserId: user.id,
        preferredPickupLocation: address,
      });
      track('order_created', { orderId: order.id, storeKey: store, timerHours });
      try { await generateInvite.mutateAsync(order.id); } catch { /* non-fatal */ }
      router.replace(`/order/${order.id}` as never);
    } catch { /* errors surfaced by mutation */ }
  };

  const handleJoin = () => {
    if (!joinValid) return;
    const token = extractToken(code);
    router.push(`/join/${encodeURIComponent(token)}` as never);
  };

  const isCreating = createOrder.isPending || generateInvite.isPending;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Mode toggle */}
        <View style={s.toggle}>
          <Pressable
            onPress={() => { setMode('create'); setStep(1); }}
            style={[s.toggleBtn, mode === 'create' && s.toggleBtnOn]}
          >
            <Text style={[s.toggleTx, mode === 'create' && s.toggleTxOn]}>
              {isHe ? 'פתחו הזמנה' : 'Create order'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('join')}
            style={[s.toggleBtn, mode === 'join' && s.toggleBtnOn]}
          >
            <Text style={[s.toggleTx, mode === 'join' && s.toggleTxOn]}>
              {isHe ? 'הצטרפות דרך חבר' : 'Joining from a friend'}
            </Text>
          </Pressable>
        </View>

        {mode === 'create' && step === 1 && (
          <View style={s.form}>
            <View style={s.heading}>
              <Text style={s.kicker}>{isHe ? 'שקענה' : 'SHAKANA'}</Text>
              <Text style={s.title}>{isHe ? 'פתחו הזמנה קבוצתית' : 'Start a group order'}</Text>
              <Text style={s.sub}>
                {isHe ? 'רשמו את השם שלכם, שם הקבוצה ובחרו חנות.' : 'Enter your name, a group name, and pick a store.'}
              </Text>
            </View>

            <View style={s.fields}>
              <FieldRow label={isHe ? 'השם שלי' : 'My name'}>
                <TextInput
                  value={myName}
                  onChangeText={setMyName}
                  placeholder={isHe ? 'למשל: יוסי' : 'e.g. Yossi'}
                  placeholderTextColor={colors.mu2}
                  style={[s.input, isHe && s.inputRtl]}
                  textAlign={isHe ? 'right' : 'left'}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </FieldRow>

              <FieldRow label={isHe ? 'שם הקבוצה' : 'Group name'}>
                <TextInput
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder={isHe ? 'למשל: קומה 3 זרה' : 'e.g. Floor 3 Zara run'}
                  placeholderTextColor={colors.mu2}
                  style={[s.input, isHe && s.inputRtl]}
                  textAlign={isHe ? 'right' : 'left'}
                  autoCapitalize="sentences"
                />
              </FieldRow>

              <FieldRow label={isHe ? 'חנות' : 'Store'}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.storeRow}
                >
                  {STORES.map((st) => {
                    const on = store === st.id;
                    return (
                      <Pressable
                        key={st.id}
                        onPress={() => setStore(st.id)}
                        style={[s.storeChip, on && s.storeChipOn]}
                      >
                        <Text style={[s.storeChipTx, on && s.storeChipTxOn]}>
                          {isHe ? st.he : st.en}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </FieldRow>

              {/* Timer */}
              <FieldRow label={isHe ? 'כמה זמן פתוחה ההזמנה?' : 'How long is the order open?'}>
                <View style={s.timerDisplay}>
                  <Text style={s.timerNum}>{timerHours}</Text>
                  <Text style={s.timerUnit}>{isHe ? 'שעות' : 'hours'}</Text>
                </View>
                <View style={s.timerTrack}>
                  <ScrollView
                    ref={timerRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={TIMER_SLOT}
                    decelerationRate="fast"
                    contentContainerStyle={s.timerRow}
                    onMomentumScrollEnd={(e) => {
                      const idx = Math.round(e.nativeEvent.contentOffset.x / TIMER_SLOT);
                      setTimerHours(TIMER_PRESETS[Math.max(0, Math.min(idx, TIMER_PRESETS.length - 1))]);
                    }}
                  >
                    <View style={{ width: (SCREEN_WIDTH - 40 - TIMER_SLOT) / 2 }} />
                    {TIMER_PRESETS.map((h) => {
                      const on = timerHours === h;
                      return (
                        <Pressable
                          key={h}
                          onPress={() => {
                            setTimerHours(h);
                            timerRef.current?.scrollTo({ x: TIMER_PRESETS.indexOf(h) * TIMER_SLOT, animated: true });
                          }}
                          style={[s.timerChip, on && s.timerChipOn]}
                        >
                          <Text style={[s.timerChipTx, on && s.timerChipTxOn]}>{h}h</Text>
                        </Pressable>
                      );
                    })}
                    <View style={{ width: (SCREEN_WIDTH - 40 - TIMER_SLOT) / 2 }} />
                  </ScrollView>
                </View>
              </FieldRow>
            </View>

            <Pressable
              onPress={handleStep1Next}
              disabled={!step1Valid}
              style={[s.cta, !step1Valid && s.ctaOff]}
              accessibilityRole="button"
            >
              <Text style={s.ctaTx}>{isHe ? 'הוסיפו כתובת ←' : 'Add address →'}</Text>
            </Pressable>
            {!step1Valid && (
              <Text style={s.hint}>
                {isHe ? 'יש למלא שם, שם קבוצה ולבחור חנות' : 'Fill in your name, group name, and pick a store'}
              </Text>
            )}
          </View>
        )}

        {mode === 'create' && step === 2 && (
          <View style={s.form}>
            <Pressable onPress={() => setStep(1)} style={s.backBtn} accessibilityRole="button">
              <Text style={s.backTx}>{isHe ? '‹ חזרה' : '‹ Back'}</Text>
            </Pressable>

            <View style={s.heading}>
              <Text style={s.kicker}>{isHe ? 'שקענה' : 'SHAKANA'}</Text>
              <Text style={s.title}>{isHe ? 'כתובת משלוח' : 'Delivery address'}</Text>
              <Text style={s.sub}>
                {isHe ? 'מלאו כל שדה בנפרד — עיר, רחוב ומספר בניין.' : 'Fill each field separately — city, street, and building number.'}
              </Text>
            </View>

            <View style={s.fields}>
              <FieldRow label={isHe ? 'עיר' : 'City'}>
                <TextInput
                  value={addrCity}
                  onChangeText={setAddrCity}
                  placeholder={isHe ? 'פתח תקווה' : 'Tel Aviv'}
                  placeholderTextColor={colors.mu2}
                  style={[s.input, isHe && s.inputRtl]}
                  textAlign={isHe ? 'right' : 'left'}
                  autoCorrect={false}
                />
              </FieldRow>

              <FieldRow label={isHe ? 'רחוב' : 'Street'}>
                <TextInput
                  value={addrStreet}
                  onChangeText={setAddrStreet}
                  placeholder={isHe ? 'הרצל' : 'Herzl'}
                  placeholderTextColor={colors.mu2}
                  style={[s.input, isHe && s.inputRtl]}
                  textAlign={isHe ? 'right' : 'left'}
                  autoCorrect={false}
                />
              </FieldRow>

              <FieldRow label={isHe ? 'מספר בניין' : 'Building number'}>
                <TextInput
                  value={addrBuilding}
                  onChangeText={setAddrBuilding}
                  placeholder="12"
                  placeholderTextColor={colors.mu2}
                  style={s.input}
                  keyboardType="number-pad"
                  textAlign="left"
                />
              </FieldRow>
            </View>

            {/* Summary pill */}
            <View style={s.summaryCard}>
              <View style={s.summaryRow}>
                {[
                  { label: isHe ? 'שם' : 'NAME', value: groupName.trim() || '—' },
                  { label: isHe ? 'חנות' : 'STORE', value: store ? (STORES.find((st) => st.id === store)?.[isHe ? 'he' : 'en'] ?? store) : '—' },
                  { label: isHe ? 'טיימר' : 'TIMER', value: `${timerHours}h` },
                ].map((item, i) => (
                  <View key={i} style={s.summaryItem}>
                    <Text style={s.summaryLabel}>{item.label}</Text>
                    <Text style={s.summaryValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Pressable
              onPress={handleCreate}
              disabled={!step2Valid || isCreating}
              style={[s.cta, (!step2Valid || isCreating) && s.ctaOff]}
              accessibilityRole="button"
            >
              <Text style={s.ctaTx}>
                {isCreating ? '···' : (isHe ? 'פתחו הזמנה ←' : 'Open order →')}
              </Text>
            </Pressable>

            {!step2Valid && (
              <Text style={s.hint}>
                {isHe ? 'יש למלא עיר, רחוב ומספר בניין' : 'Fill in city, street, and building number'}
              </Text>
            )}

            <Text style={s.launchNote}>
              {isHe
                ? 'ההשקה תהיה בדף ההזמנה — תוכלו להוסיף מוצרים לפני שתלחצו השקה.'
                : 'Launch happens on the order page — you can add products before pressing Launch.'}
            </Text>
          </View>
        )}

        {mode === 'join' && (
          <View style={s.form}>
            <View style={s.heading}>
              <Text style={s.kicker}>{isHe ? 'שקענה' : 'SHAKANA'}</Text>
              <Text style={s.title}>{isHe ? 'הצטרפות דרך חבר' : 'Joining from a friend'}</Text>
              <Text style={s.sub}>
                {isHe ? 'הדביקו את הקישור שקיבלתם, רשמו את שמכם ולחצו הצטרפות.' : 'Paste the link you received, enter your name, and tap Join.'}
              </Text>
            </View>

            <View style={s.fields}>
              <FieldRow label={isHe ? 'השם שלי' : 'My name'}>
                <TextInput
                  value={joinName}
                  onChangeText={setJoinName}
                  placeholder={isHe ? 'למשל: דנה' : 'e.g. Dana'}
                  placeholderTextColor={colors.mu2}
                  style={[s.input, isHe && s.inputRtl]}
                  textAlign={isHe ? 'right' : 'left'}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => codeRef.current?.focus()}
                />
              </FieldRow>

              <FieldRow label={isHe ? 'קוד או קישור הזמנה' : 'Invite code or link'}>
                <TextInput
                  ref={codeRef}
                  value={code}
                  onChangeText={setCode}
                  placeholder={isHe ? 'הדביקו כאן את הקישור שקיבלתם' : 'Paste the link or code here'}
                  placeholderTextColor={colors.mu2}
                  style={[s.input, s.codeInput]}
                  textAlign="left"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={handleJoin}
                />
                {code.trim().length > 0 && (
                  <Text style={s.tokenPreview}>
                    {isHe ? 'קוד: ' : 'Code: '}
                    <Text style={s.tokenCode}>{extractToken(code)}</Text>
                  </Text>
                )}
              </FieldRow>
            </View>

            {/* Steps info */}
            <View style={s.joinCard}>
              <Text style={s.joinCardLabel}>
                {isHe ? 'מה קורה אחרי ההצטרפות?' : 'What happens after joining?'}
              </Text>
              <View style={s.joinSteps}>
                {(isHe
                  ? ['רואים את הקטלוג עם המוצרים שנבחרו', 'בוחרים את הפריטים שלכם', 'משלמים ושולחים ביחד']
                  : ['See the catalog with chosen products', 'Pick your items', 'Pay and ship together']
                ).map((txt, i) => (
                  <View key={i} style={s.joinStep}>
                    <View style={s.joinNum}>
                      <Text style={s.joinNumTx}>{i + 1}</Text>
                    </View>
                    <Text style={s.joinStepTx}>{txt}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Pressable
              onPress={handleJoin}
              disabled={!joinValid}
              style={[s.cta, s.ctaJoin, !joinValid && s.ctaOff]}
              accessibilityRole="button"
            >
              <Text style={s.ctaTx}>{isHe ? 'הצטרפו להזמנה ←' : 'Join the order →'}</Text>
            </Pressable>

            {!joinValid && (
              <Text style={s.hint}>
                {isHe ? 'יש למלא שם ולהדביק קוד / קישור' : 'Enter your name and paste the code or link'}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bg },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120, gap: 24 },

  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.s2,
    borderRadius: radii.pill,
    padding: 4,
    gap: 2,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnOn: { backgroundColor: colors.acc, ...shadow.card },
  toggleTx: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.mu, textAlign: 'center' },
  toggleTxOn: { color: colors.white },

  form:    { gap: 22 },
  heading: { gap: 6 },
  kicker:  { fontFamily: fontFamily.bodyBold, fontSize: 10, letterSpacing: 2.4, color: colors.hot, textTransform: 'uppercase' },
  title:   { fontFamily: fontFamily.display, fontSize: 30, color: colors.tx, lineHeight: 36 },
  sub:     { fontFamily: fontFamily.body, fontSize: 14, color: colors.mu, lineHeight: 20 },

  backBtn: { alignSelf: 'flex-start' },
  backTx:  { fontFamily: fontFamily.bodyBold, fontSize: 15, color: colors.acc },

  fields:    { gap: 16 },
  fieldWrap: { gap: 7 },
  fieldLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.mu,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 54,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s1,
    paddingHorizontal: 16,
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: colors.tx,
  },
  inputRtl:  { textAlign: 'right' },
  codeInput: { fontFamily: fontFamily.body, fontSize: 14, minHeight: 60 },

  tokenPreview: { fontFamily: fontFamily.body, fontSize: 12, color: colors.mu, paddingHorizontal: 4 },
  tokenCode:    { fontFamily: fontFamily.bodyBold, color: colors.tx },

  // Store chips
  storeRow:    { gap: 8, paddingRight: 4 },
  storeChip:   { paddingHorizontal: 18, paddingVertical: 11, borderRadius: radii.pill, borderWidth: 1.5, borderColor: colors.br, backgroundColor: colors.s1 },
  storeChipOn: { borderColor: colors.acc, backgroundColor: colors.accLight },
  storeChipTx: { fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.mu },
  storeChipTxOn: { color: colors.acc },

  // Timer
  timerDisplay: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingHorizontal: 4 },
  timerNum:     { fontFamily: fontFamily.display, fontSize: 56, color: colors.tx, lineHeight: 60 },
  timerUnit:    { fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.mu, paddingBottom: 8, letterSpacing: 0.5 },
  timerTrack:   { marginHorizontal: -20 },
  timerRow:     { alignItems: 'center' },
  timerChip:    {
    width: TIMER_CHIP_W,
    height: 52,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.br,
    backgroundColor: colors.s2,
    marginHorizontal: 4,
  },
  timerChipOn:   { borderColor: colors.acc, backgroundColor: colors.accLight },
  timerChipTx:   { fontFamily: fontFamily.bodyBold, fontSize: 16, color: colors.mu },
  timerChipTxOn: { color: colors.acc },

  // Summary
  summaryCard:  { backgroundColor: colors.ink, borderRadius: radii.xl, padding: 18, ...shadow.cta },
  summaryRow:   { flexDirection: 'row' },
  summaryItem:  { flex: 1, alignItems: 'center', gap: 4 },
  summaryLabel: { fontFamily: fontFamily.bodyBold, fontSize: 9, letterSpacing: 1.4, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' },
  summaryValue: { fontFamily: fontFamily.display, fontSize: 16, color: colors.white, lineHeight: 20 },

  // CTA
  cta:     { minHeight: 58, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.acc, ...shadow.cta },
  ctaJoin: { backgroundColor: colors.hot },
  ctaOff:  { opacity: 0.3 },
  ctaTx:   { fontFamily: fontFamily.bodyBold, fontSize: 16, color: colors.white, letterSpacing: 0.3 },
  hint:    { fontFamily: fontFamily.body, fontSize: 13, color: colors.mu2, textAlign: 'center' },

  launchNote: { fontFamily: fontFamily.body, fontSize: 13, color: colors.mu, textAlign: 'center', lineHeight: 19, paddingHorizontal: 8 },

  // Join card
  joinCard:      { backgroundColor: colors.s1, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.br, padding: 18, gap: 14, ...shadow.card },
  joinCardLabel: { fontFamily: fontFamily.bodyBold, fontSize: 11, letterSpacing: 1.4, color: colors.mu, textTransform: 'uppercase' },
  joinSteps:     { gap: 12 },
  joinStep:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  joinNum:       { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accLight, borderWidth: 1, borderColor: colors.acc, alignItems: 'center', justifyContent: 'center' },
  joinNumTx:     { fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.acc },
  joinStepTx:    { flex: 1, fontFamily: fontFamily.body, fontSize: 14, color: colors.tx, lineHeight: 20 },
});
