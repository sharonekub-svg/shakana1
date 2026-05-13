import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { PrimaryBtn } from '@/components/primitives/Button';
import { Field } from '@/components/primitives/Field';
import { NumField } from '@/components/primitives/NumField';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { productUrlSchema } from '@/utils/validation';
import { useCreateOrder } from '@/api/orders';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useLocale, type Language } from '@/i18n/locale';
import { loadSharedProductInsights, parseSharedProduct, type SharedProductInsights } from '@/lib/sharedProduct';
import { fetchProductPageHtml } from '@/api/productInsights';
import { formatAgorot } from '@/utils/format';
import { formatCompactDuration, timerUnitToMinutes } from '@/utils/timer';

type NewOrderParams = {
  url?: string;
  title?: string;
  source?: string;
  store?: string;
};

const ZARA_START_URL = 'https://www.zara.com/il/';
const DEFAULT_DELIVERY_FEE_AGOROT = 3000;
const DEFAULT_FREE_SHIPPING_THRESHOLD_AGOROT = 19900;
const TIMER_UNITS = ['minutes', 'hours', 'days'] as const;
const TIMER_PRESETS = [
  { label: '30m', value: '30', unit: 'minutes' },
  { label: '2h', value: '2', unit: 'hours' },
  { label: '5h', value: '5', unit: 'hours' },
  { label: '1d', value: '1', unit: 'days' },
] as const;

const TOTAL_STEPS = 3;

function LanguagePill({ language, onSelect }: { language: Language; onSelect: (l: Language) => void }) {
  return (
    <View style={styles.langPill}>
      <Pressable
        accessibilityRole="button"
        onPress={() => onSelect('he')}
        style={[styles.langOpt, language === 'he' && styles.langOptActive]}
      >
        <Text style={[styles.langText, language === 'he' && styles.langTextActive]}>עברית</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => onSelect('en')}
        style={[styles.langOpt, language === 'en' && styles.langOptActive]}
      >
        <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>EN</Text>
      </Pressable>
    </View>
  );
}

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.stepBar}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[styles.stepPill, i + 1 < current && styles.stepPillDone, i + 1 === current && styles.stepPillActive]}
        >
          {i + 1 <= current ? (
            <View style={[styles.stepPillDot, i + 1 === current && styles.stepPillDotActive]} />
          ) : (
            <View style={styles.stepPillDot} />
          )}
        </View>
      ))}
    </View>
  );
}

export default function NewOrder() {
  const router = useRouter();
  const params = useLocalSearchParams<NewOrderParams>();
  const { language, setLanguage, t } = useLocale();
  const isHebrew = language === 'he';
  const copy = isHebrew
    ? {
        step1Title: 'המוצר',
        step2Title: 'כתובת לאיסוף',
        step3Title: 'טיימר ואישור',
        next: 'הבא',
        back: 'חזרה',
        detectedAfterPaste: 'יזוהה אחרי הדבקת הקישור',
        waitingForLink: 'ממתין לקישור מוצר',
        addPrice: 'הוסף מחיר ידנית',
        readingPrice: 'קורא מחיר...',
        addThreshold: 'הוסף סכום למשלוח חינם',
        unknownThreshold: 'לא ידוע עד שמוסיפים סכום',
        noDeal: 'לא זוהה מבצע כרגע',
        linkNotWorking: 'הלינק לא עובד?',
        closeHelp: 'סגור עזרה',
        linkHelpTitle: 'אפשר להמשיך גם בלי זיהוי אוטומטי',
        linkHelpBody: 'אם Amazon או חנות אחרת חסמה מחיר, תמונה או משלוח, מלא את שם המוצר, המחיר, החנות והמשלוח בשדות למטה.',
        findProductTitle: 'מצא מוצר, העתק קישור וחזור לכאן.',
        findProductBody: 'Shakana פותחת את החנות, אתה בוחר את הפריט המדויק, מעתיק את הקישור, ואז Shakana קוראת מידע ציבורי.',
        openZara: 'פתח את Zara',
        useCopiedLink: 'השתמש בקישור שהועתק',
        copyLinkHelp: 'מצא את המוצר, העתק את קישור הדף וחזור לכאן.',
        noProductLink: 'לא נמצא קישור מוצר בטקסט שהועתק.',
        productLinkAdded: 'קישור המוצר נוסף.',
        store: 'חנות',
        storePlaceholder: 'Zara, H&M, Amazon...',
        titlePlaceholder: 'חולצה מזארה',
        stepProduct: 'קישור מוצר',
        stepProductBody: 'הדבק קישור מכל חנות.',
        addrTitle: 'כתובת לאיסוף',
        addrSubtitle: 'כולם בקבוצה יראו כתובת זו.',
        addrCity: 'עיר',
        addrStreet: 'שם הרחוב',
        addrHouseNum: 'מספר בית',
        addrHouseNumPlaceholder: '22',
        addrApt: 'דירה',
        addrFloor: 'קומה (אופציונלי)',
        addrNote: 'ניתן לעדכן אחרי יצירת ההזמנה.',
        timerShipping: 'טיימר ומשלוח',
        timerShippingBody: 'שכנים יכולים להצטרף עד שהטיימר מסתיים.',
        timer: 'טיימר',
        freeShippingFrom: 'משלוח חינם מסכום',
        product: 'מוצר',
        pasteProductLink: 'הדבק קישור מוצר',
        readingProduct: 'קורא את דף המוצר...',
        deal: 'מבצע',
        simpleOrder: 'הזמנה פשוטה, בלי בלגן.',
        productCost: 'מחיר המוצר',
        deliveryFee: 'דמי משלוח',
        importantCosts: 'עלויות',
        freeShippingMinimum: 'משלוח חינם מ',
        missingFreeDelivery: 'חסר למשלוח חינם',
        costCardNote: 'מחיר המוצר, דמי משלוח וסכום למשלוח חינם — ישירות מהקישור.',
        noTimerLabel: 'ללא טיימר',
        noTimerDesc: 'ההזמנה תישאר פתוחה עד שתסגור אותה ידנית.',
        min: 'דק׳',
        hr: 'שעה',
        day: 'יום',
        timerClosesIn: 'הטיימר נסגר בעוד',
        createOrder: 'צור הזמנה',
        orderSummary: 'סיכום הזמנה',
        finderNote: 'אם החנות חוסמת פרטים, Shakana משאירה את השדות הידניים.',
      }
    : {
        step1Title: 'The product',
        step2Title: 'Pickup address',
        step3Title: 'Timer & review',
        next: 'Next',
        back: 'Back',
        detectedAfterPaste: 'Detected after link paste',
        waitingForLink: 'Waiting for product link',
        addPrice: 'Add price manually',
        readingPrice: 'Reading price...',
        addThreshold: 'Add store threshold',
        unknownThreshold: 'Unknown until threshold is added',
        noDeal: 'No deal detected yet',
        linkNotWorking: 'Link not working?',
        closeHelp: 'Close help',
        linkHelpTitle: 'You can continue without automatic detection',
        linkHelpBody: 'If a store blocks price, image, or shipping details, fill in product name, price, store, and shipping below.',
        findProductTitle: 'Find a product, copy the URL, then come back.',
        findProductBody: 'Shakana opens the store, you choose the exact item, copy the product page link, then Shakana reads public data.',
        openZara: 'Open Zara',
        useCopiedLink: 'Use copied link',
        copyLinkHelp: 'Find the product, copy its page link, then come back here.',
        noProductLink: 'No product link found in the copied text.',
        productLinkAdded: 'Product link added.',
        store: 'Store',
        storePlaceholder: 'Zara, H&M, Amazon...',
        titlePlaceholder: 'Zara shirt',
        stepProduct: 'Product link',
        stepProductBody: 'Paste any store link.',
        addrTitle: 'Pickup address',
        addrSubtitle: 'Everyone in the group will see this address.',
        addrCity: 'City',
        addrStreet: 'Street name',
        addrHouseNum: 'House / building no.',
        addrHouseNumPlaceholder: '22',
        addrApt: 'Apt no.',
        addrFloor: 'Floor (optional)',
        addrNote: 'You can update this after creating the order.',
        timerShipping: 'Timer & shipping',
        timerShippingBody: 'Neighbors can join until the timer ends.',
        timer: 'Timer',
        freeShippingFrom: 'Free shipping from',
        product: 'Product',
        pasteProductLink: 'Paste a product link',
        readingProduct: 'Reading the product page...',
        deal: 'Deal',
        simpleOrder: 'Simple order, no extra clutter.',
        productCost: 'Product cost',
        deliveryFee: 'Delivery fee',
        importantCosts: 'Costs',
        freeShippingMinimum: 'Free delivery from',
        missingFreeDelivery: 'Missing for free delivery',
        costCardNote: 'Product price, delivery fee, and free-shipping minimum — pulled directly from the link.',
        noTimerLabel: 'No timer',
        noTimerDesc: 'The order stays open until you close it manually.',
        min: 'min',
        hr: 'hr',
        day: 'day',
        timerClosesIn: 'Timer closes in',
        createOrder: 'Create order',
        orderSummary: 'Order summary',
        finderNote: 'If the store blocks public details, Shakana keeps manual fields ready.',
      };

  const initialDraft = parseSharedProduct({
    url: typeof params.url === 'string' ? params.url : null,
    title: typeof params.title === 'string' ? params.title : null,
    manualStoreLabel: typeof params.store === 'string' ? params.store : null,
  });
  const isZaraStart = params.store === 'zara' || initialDraft?.source === 'zara';

  const [step, setStep] = useState(1);
  const [url, setUrl] = useState(() => initialDraft?.url ?? '');
  const [storeLabel, setStoreLabel] = useState(() => initialDraft?.storeLabel ?? (typeof params.store === 'string' ? params.store : ''));
  const [title, setTitle] = useState(() => initialDraft?.title ?? '');
  const [price, setPrice] = useState('');
  const [noTimer, setNoTimer] = useState(false);
  const [timerValue, setTimerValue] = useState('30');
  const [timerUnit, setTimerUnit] = useState<(typeof TIMER_UNITS)[number]>('minutes');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('199');
  const [linkHelpOpen, setLinkHelpOpen] = useState(false);
  const [linkMessage, setLinkMessage] = useState('');
  const [insights, setInsights] = useState<SharedProductInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(Boolean(initialDraft));

  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);

  const [addrCity, setAddrCity] = useState(() => profile?.city ?? '');
  const [addrStreet, setAddrStreet] = useState(() => profile?.street ?? '');
  const [addrHouseNum, setAddrHouseNum] = useState(() => profile?.building ?? '');
  const [addrApt, setAddrApt] = useState(() => profile?.apt ?? '');
  const [addrFloor, setAddrFloor] = useState(() => profile?.floor ?? '');

  const create = useCreateOrder();
  const pushToast = useUiStore((s) => s.pushToast);

  const currentDraft = parseSharedProduct({
    url,
    title: title || initialDraft?.title || null,
    manualStoreLabel: storeLabel,
  });

  const urlCheck = productUrlSchema.safeParse(url);
  const parsedPriceAgorot = Math.floor(Number(price) * 100);
  const priceAgorot = insights?.priceAgorot ?? (Number.isFinite(parsedPriceAgorot) && parsedPriceAgorot > 0 ? parsedPriceAgorot : 0);
  const rawTimerValue = Math.max(1, Math.floor(Number(timerValue)) || 30);
  const timerMinutesNumber = Math.max(5, Math.min(10080, timerUnitToMinutes(rawTimerValue, timerUnit)));
  const timerLabel = formatCompactDuration(timerMinutesNumber * 60_000);
  const freeShippingThresholdAgorot =
    insights?.freeShippingThresholdAgorot ??
    Math.max(DEFAULT_FREE_SHIPPING_THRESHOLD_AGOROT, Math.floor(Number(freeShippingThreshold) * 100) || 0);
  const deliveryFeeAgorot =
    typeof insights?.deliveryFeeAgorot === 'number' && insights.deliveryFeeAgorot > 0
      ? insights.deliveryFeeAgorot
      : priceAgorot >= freeShippingThresholdAgorot && freeShippingThresholdAgorot > 0
        ? 0
        : DEFAULT_DELIVERY_FEE_AGOROT;
  const freeShippingGapAgorot = Math.max(0, freeShippingThresholdAgorot - priceAgorot);
  const sourceLabel = insights?.sourceLabel || storeLabel || currentDraft?.storeLabel || copy.detectedAfterPaste;
  const productName = insights?.title || title || currentDraft?.title || copy.waitingForLink;
  const productCostLabel = priceAgorot > 0 ? formatAgorot(priceAgorot) : insightsLoading ? copy.readingPrice : copy.addPrice;
  const freeShippingThresholdLabel = freeShippingThresholdAgorot > 0 ? formatAgorot(freeShippingThresholdAgorot) : copy.addThreshold;
  const freeShippingGapLabel = freeShippingThresholdAgorot > 0 ? formatAgorot(freeShippingGapAgorot) : copy.unknownThreshold;
  const dealLabel = insights?.promotionText || insights?.dealSummary || copy.noDeal;
  const deliveryFeeLabel = insightsLoading ? copy.readingProduct : formatAgorot(deliveryFeeAgorot);
  const fallbackPickupLocation = isHebrew ? 'יתואם אחרי פתיחת ההזמנה' : 'Will be coordinated after opening the order';
  const pickupLocation = [addrStreet, addrHouseNum, addrApt ? (isHebrew ? `דירה ${addrApt}` : `apt ${addrApt}`) : '', addrCity].filter(Boolean).join(', ') || fallbackPickupLocation;

  const step1Valid = urlCheck.success;
  const step3Valid =
    urlCheck.success &&
    sourceLabel.trim().length > 1 &&
    productName.trim().length > 1 &&
    priceAgorot > 0 &&
    Boolean(user?.id);

  useEffect(() => {
    if (!currentDraft) {
      setInsights(null);
      setInsightsLoading(false);
      return;
    }
    let active = true;
    setInsightsLoading(true);
    void loadSharedProductInsights(currentDraft, fetchProductPageHtml)
      .then((next) => {
        if (!active) return;
        setInsights(next);
        setStoreLabel((prev) => prev || next.sourceLabel);
        if (!title.trim()) setTitle(next.title);
        if (!price.trim() && next.priceAgorot) {
          setPrice((next.priceAgorot / 100).toFixed(2).replace(/\.00$/, ''));
        }
        if (next.freeShippingThresholdAgorot) {
          setFreeShippingThreshold((next.freeShippingThresholdAgorot / 100).toFixed(2).replace(/\.00$/, ''));
        }
      })
      .catch(() => { if (active) setInsights(null); })
      .finally(() => { if (active) setInsightsLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDraft?.url]);

  const openZara = async () => {
    await Linking.openURL(ZARA_START_URL);
    setLinkMessage(copy.copyLinkHelp);
  };

  const useCopiedLink = async () => {
    const copied = await Clipboard.getStringAsync();
    const draft = parseSharedProduct({ url: copied, text: copied });
    if (!draft) { setLinkMessage(copy.noProductLink); return; }
    setUrl(draft.url);
    setStoreLabel(draft.storeLabel);
    setTitle((prev) => prev || draft.title);
    setLinkMessage(copy.productLinkAdded);
  };

  const submit = async () => {
    if (!step3Valid || create.isPending) return;
    try {
      const order = await create.mutateAsync({
        productUrl: url.trim(),
        productTitle: productName.trim(),
        productPriceAgorot: priceAgorot,
        productImage: insights?.imageUrl ?? undefined,
        storeKey: currentDraft?.source ?? 'manual',
        storeLabel: sourceLabel.trim(),
        estimatedShippingAgorot: deliveryFeeAgorot,
        freeShippingThresholdAgorot,
        timerMinutes: noTimer ? 0 : timerMinutesNumber,
        maxParticipants: 12,
        pickupResponsibleUserId: user!.id,
        preferredPickupLocation: pickupLocation,
      });
      router.replace(`/order/${order.id}/invite`);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : t('order.new.error'), 'error');
    }
  };

  const stepTitle = step === 1 ? copy.step1Title : step === 2 ? copy.step2Title : copy.step3Title;
  const stepKicker = isHebrew ? `שלב ${step} מתוך ${TOTAL_STEPS}` : `Step ${step} of ${TOTAL_STEPS}`;

  return (
    <ScreenBase padded={false}>
      {/* App bar */}
      <View style={styles.appBar}>
        <BackBtn onPress={step === 1 ? () => router.back() : () => setStep((s) => s - 1)} />
        <View style={styles.appBarCenter}>
          <Text style={styles.appBarKicker}>{stepKicker}</Text>
          <Text style={styles.appBarTitle}>{stepTitle}</Text>
        </View>
        <LanguagePill language={language} onSelect={(l) => void setLanguage(l)} />
      </View>

      {/* Step progress pills */}
      <View style={styles.stepBarWrap}>
        <StepBar current={step} total={TOTAL_STEPS} />
      </View>

      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <>
            {isZaraStart ? (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>ZARA</Text>
                <Text style={styles.cardTitle}>{copy.findProductTitle}</Text>
                <Text style={styles.cardNote}>{copy.findProductBody}</Text>
                <View style={styles.actionRow}>
                  <Pressable style={styles.primarySmall} onPress={openZara}>
                    <Text style={styles.primarySmallText}>{copy.openZara}</Text>
                  </Pressable>
                  <Pressable style={styles.secondarySmall} onPress={useCopiedLink}>
                    <Text style={styles.secondarySmallText}>{copy.useCopiedLink}</Text>
                  </Pressable>
                </View>
                {linkMessage ? <Text style={styles.accentNote}>{linkMessage}</Text> : null}
              </View>
            ) : null}

            {/* URL paste field */}
            <View style={styles.urlCard}>
              <Text style={styles.sectionLabel}>{copy.stepProduct.toUpperCase()}</Text>
              <Text style={styles.cardNote}>{copy.stepProductBody}</Text>
              <View style={styles.urlFieldWrap}>
                <Text style={styles.urlSearchIcon}>🔗</Text>
                <View style={{ flex: 1 }}>
                  <Field
                    label={t('order.new.urlLabel')}
                    value={url}
                    onChange={setUrl}
                    placeholder="https://..."
                    ltr
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Store detection badge */}
              {(sourceLabel && sourceLabel !== copy.detectedAfterPaste) ? (
                <View style={styles.storeDetectBadge}>
                  <View style={styles.storeDetectDot} />
                  <Text style={styles.storeDetectText}>{sourceLabel}</Text>
                </View>
              ) : insightsLoading ? (
                <View style={styles.storeDetectBadge}>
                  <ActivityIndicator size="small" color={colors.acc} />
                  <Text style={styles.storeDetectText}>{copy.readingProduct}</Text>
                </View>
              ) : null}

              {/* Cost breakdown card */}
              <View style={styles.costCard}>
                <Text style={styles.sectionLabel}>{copy.importantCosts.toUpperCase()}</Text>
                <View style={styles.costGrid}>
                  <View style={styles.costItem}>
                    <Text style={styles.costLabel}>{copy.productCost.toUpperCase()}</Text>
                    <Text style={styles.costValue}>{productCostLabel}</Text>
                  </View>
                  <View style={styles.costItem}>
                    <Text style={styles.costLabel}>{copy.deliveryFee.toUpperCase()}</Text>
                    <Text style={styles.costValue}>{deliveryFeeLabel}</Text>
                  </View>
                  <View style={styles.costItem}>
                    <Text style={styles.costLabel}>{copy.freeShippingMinimum.toUpperCase()}</Text>
                    <Text style={styles.costValue}>{freeShippingThresholdLabel}</Text>
                  </View>
                  <View style={styles.costItem}>
                    <Text style={styles.costLabel}>{copy.missingFreeDelivery.toUpperCase()}</Text>
                    <Text style={styles.costValue}>{freeShippingGapLabel}</Text>
                  </View>
                </View>
                <Text style={styles.costNote}>{copy.costCardNote}</Text>
              </View>
            </View>

            {/* Product preview card */}
            {url.trim().length > 4 ? (
              <View style={styles.productCard}>
                <View style={styles.productCopy}>
                  <Text style={styles.sectionLabel}>{copy.product.toUpperCase()}</Text>
                  <Text style={styles.productTitle} numberOfLines={2}>
                    {insights?.title || title || copy.pasteProductLink}
                  </Text>
                  <Text style={styles.productBody}>
                    {insightsLoading ? copy.readingProduct : insights?.promotionText ? `${copy.deal}: ${insights.promotionText}` : copy.simpleOrder}
                  </Text>
                  {insightsLoading ? <ActivityIndicator color={colors.acc} /> : null}
                </View>
                {insights?.imageUrl ? (
                  <Image source={{ uri: insights.imageUrl }} style={styles.productImage} />
                ) : (
                  <View style={[styles.productImage, styles.productImagePlaceholder]}>
                    <Text style={styles.productImagePlaceholderText}>IMG</Text>
                  </View>
                )}
              </View>
            ) : null}

            {/* Link help toggle */}
            <Pressable style={styles.ghostButton} onPress={() => setLinkHelpOpen((o) => !o)}>
              <Text style={styles.ghostButtonText}>{linkHelpOpen ? copy.closeHelp : copy.linkNotWorking}</Text>
            </Pressable>
            {linkHelpOpen ? (
              <View style={styles.helpCard}>
                <Text style={styles.helpTitle}>{copy.linkHelpTitle}</Text>
                <Text style={styles.helpBody}>{copy.linkHelpBody}</Text>
                <Field label={copy.store} value={storeLabel} onChange={setStoreLabel} placeholder={copy.storePlaceholder} />
                <Field label={t('order.new.titleLabel')} value={title} onChange={setTitle} placeholder={copy.titlePlaceholder} />
                <NumField label={t('order.new.priceLabel')} value={price} onChange={setPrice} placeholder="199" />
                <NumField label={copy.freeShippingFrom} value={freeShippingThreshold} onChange={setFreeShippingThreshold} placeholder="199" />
                <Text style={styles.cardNote}>{copy.finderNote}</Text>
              </View>
            ) : null}

            <View style={styles.ctaWrap}>
              <PrimaryBtn label={`${copy.next} →`} onPress={() => setStep(2)} disabled={!step1Valid} />
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>{copy.addrTitle.toUpperCase()}</Text>
              <Text style={styles.cardNote}>{copy.addrSubtitle}</Text>

              <View style={styles.fieldGroup}>
                <Field
                  label={copy.addrCity}
                  value={addrCity}
                  onChange={setAddrCity}
                  placeholder={isHebrew ? 'תל אביב' : 'Tel Aviv'}
                />
                <Field
                  label={copy.addrStreet}
                  value={addrStreet}
                  onChange={setAddrStreet}
                  placeholder={isHebrew ? 'דיזנגוף' : 'Dizengoff'}
                />

                <View style={styles.houseRow}>
                  <View style={styles.houseNumWrap}>
                    <NumField
                      label={copy.addrHouseNum}
                      value={addrHouseNum}
                      onChange={setAddrHouseNum}
                      placeholder={copy.addrHouseNumPlaceholder}
                    />
                  </View>
                  <View style={styles.aptWrap}>
                    <NumField
                      label={copy.addrApt}
                      value={addrApt}
                      onChange={setAddrApt}
                      placeholder="4"
                    />
                  </View>
                </View>

                <NumField
                  label={copy.addrFloor}
                  value={addrFloor}
                  onChange={setAddrFloor}
                  placeholder="2"
                />
              </View>

              {(addrStreet || addrHouseNum || addrCity) ? (
                <View style={styles.addrPreview}>
                  <Text style={styles.sectionLabel}>{isHebrew ? 'תצוגה מקדימה' : 'PREVIEW'}</Text>
                  <Text style={styles.addrPreviewText}>{pickupLocation}</Text>
                </View>
              ) : null}

              <Text style={styles.addrNote}>{copy.addrNote}</Text>
            </View>

            <View style={styles.ctaWrap}>
              <PrimaryBtn label={`${copy.next} →`} onPress={() => setStep(3)} />
            </View>
          </>
        )}

        {step === 3 && (
          <>
            {/* Summary card */}
            <View style={styles.summaryCard}>
              <Text style={styles.sectionLabel}>{copy.orderSummary.toUpperCase()}</Text>
              <Text style={styles.productTitle} numberOfLines={2}>
                {productName !== copy.waitingForLink ? productName : copy.pasteProductLink}
              </Text>
              <View style={styles.summaryMeta}>
                <View style={styles.summaryMetaChip}>
                  <Text style={styles.summaryMetaChipText}>{sourceLabel}</Text>
                </View>
                <Text style={styles.summaryMetaCost}>{productCostLabel}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>{copy.deliveryFee}</Text>
                <Text style={styles.summaryRowValue}>{deliveryFeeLabel}</Text>
              </View>
            </View>

            {/* Timer card */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>{copy.timerShipping.toUpperCase()}</Text>
              <Text style={styles.cardNote}>{copy.timerShippingBody}</Text>

              {/* Large serif timer display */}
              {!noTimer ? (
                <View style={styles.timerHero}>
                  <Text style={styles.timerHeroValue}>{timerLabel}</Text>
                  <Text style={styles.timerHeroSub}>{copy.timerClosesIn}</Text>
                </View>
              ) : null}

              {/* Preset slider dots */}
              <View style={styles.timerPresetRow}>
                <Pressable
                  style={[styles.timerPresetChip, noTimer && styles.timerPresetChipActive]}
                  onPress={() => setNoTimer(true)}
                >
                  <Text style={[styles.timerPresetText, noTimer && styles.timerPresetTextActive]}>{copy.noTimerLabel}</Text>
                </Pressable>
                {TIMER_PRESETS.map((preset) => {
                  const selected = !noTimer && timerValue === preset.value && timerUnit === preset.unit;
                  return (
                    <Pressable
                      key={preset.label}
                      style={[styles.timerPresetChip, selected && styles.timerPresetChipActive]}
                      onPress={() => { setNoTimer(false); setTimerValue(preset.value); setTimerUnit(preset.unit); }}
                    >
                      <Text style={[styles.timerPresetText, selected && styles.timerPresetTextActive]}>{preset.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {noTimer ? (
                <View style={styles.timerDarkBox}>
                  <Text style={styles.timerDarkBoxLabel}>{copy.noTimerDesc}</Text>
                </View>
              ) : (
                <View style={styles.timerPickRow}>
                  <View style={{ flex: 1 }}>
                    <NumField label={copy.timer} value={timerValue} onChange={setTimerValue} placeholder="30" />
                  </View>
                  <View style={styles.timerUnitWrap}>
                    {TIMER_UNITS.map((unit) => (
                      <Pressable
                        key={unit}
                        style={[styles.unitChip, timerUnit === unit && styles.unitChipActive]}
                        onPress={() => setTimerUnit(unit)}
                      >
                        <Text style={[styles.unitChipText, timerUnit === unit && styles.unitChipTextActive]}>
                          {unit === 'minutes' ? copy.min : unit === 'hours' ? copy.hr : copy.day}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.ctaWrap}>
              <PrimaryBtn label={copy.createOrder} onPress={submit} disabled={!step3Valid} loading={create.isPending} />
            </View>
          </>
        )}
      </ScrollView>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.s1,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,24,18,0.10)',
    gap: 10,
  },
  appBarCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  appBarKicker: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.mu2,
    textTransform: 'uppercase',
  },
  appBarTitle: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: colors.tx,
    lineHeight: 24,
  },
  stepBarWrap: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: colors.s1,
  },
  stepBar: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  stepPill: {
    flex: 1,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(30,24,18,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPillDone: {
    backgroundColor: colors.mu2,
  },
  stepPillActive: {
    backgroundColor: colors.acc,
  },
  stepPillDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: 'transparent',
  },
  stepPillDotActive: {
    backgroundColor: colors.white,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
    backgroundColor: colors.s2,
    padding: 2,
  },
  langOpt: {
    minWidth: 32,
    minHeight: 26,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  langOptActive: { backgroundColor: colors.tx },
  langText: { color: colors.mu, fontFamily: fontFamily.bodyBold, fontSize: 10 },
  langTextActive: { color: colors.white },
  screen: {
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 110,
    backgroundColor: colors.bg,
  },
  card: {
    gap: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
    borderRadius: 20,
    backgroundColor: colors.s1,
    ...shadow.card,
  },
  urlCard: {
    gap: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
    borderRadius: 20,
    backgroundColor: colors.s1,
    ...shadow.card,
  },
  urlFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urlSearchIcon: {
    fontSize: 18,
    marginTop: 20,
  },
  sectionLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.mu2,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    lineHeight: 26,
    color: colors.tx,
  },
  cardNote: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mu,
    marginTop: -4,
  },
  storeDetectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.accLight,
    borderWidth: 1,
    borderColor: 'rgba(197,101,75,0.25)',
  },
  storeDetectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.acc,
  },
  storeDetectText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.acc,
    textTransform: 'uppercase',
  },
  costCard: {
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.s2,
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
  },
  costGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  costItem: {
    width: '48%',
    gap: 5,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
  },
  costLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.mu2,
    textTransform: 'uppercase',
  },
  costValue: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: colors.tx,
  },
  costNote: { fontFamily: fontFamily.body, fontSize: 12, lineHeight: 17, color: colors.mu },
  productCard: {
    flexDirection: 'row',
    gap: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
    borderRadius: 20,
    backgroundColor: colors.s1,
    ...shadow.card,
  },
  productCopy: { flex: 1, gap: 6 },
  productTitle: { fontFamily: fontFamily.display, fontSize: 20, color: colors.tx, lineHeight: 26 },
  productBody: { fontFamily: fontFamily.body, fontSize: 13, lineHeight: 19, color: colors.mu },
  productImage: { width: 84, height: 104, borderRadius: 16, backgroundColor: colors.s2 },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
  },
  productImagePlaceholderText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.mu2,
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  primarySmall: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tx,
  },
  primarySmallText: { fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.white },
  secondarySmall: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
    backgroundColor: colors.s2,
  },
  secondarySmallText: { fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.tx },
  accentNote: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.acc },
  ghostButton: {
    minHeight: 46,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
    backgroundColor: colors.s2,
  },
  ghostButtonText: { fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.mu },
  helpCard: {
    gap: 10,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
  },
  helpTitle: { fontFamily: fontFamily.bodyBold, fontSize: 14, color: colors.tx },
  helpBody: { fontFamily: fontFamily.body, fontSize: 12, lineHeight: 18, color: colors.mu },
  fieldGroup: { gap: 8 },
  houseRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  houseNumWrap: { flex: 1.2 },
  aptWrap: { flex: 1 },
  addrPreview: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.s2,
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
    gap: 5,
  },
  addrPreviewText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.tx,
    lineHeight: 20,
  },
  addrNote: { fontFamily: fontFamily.body, fontSize: 12, color: colors.mu, lineHeight: 18 },
  summaryCard: {
    gap: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
    borderRadius: 20,
    backgroundColor: colors.tx,
    ...shadow.card,
  },
  summaryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  summaryMetaChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  summaryMetaChipText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: 'rgba(250,246,239,0.80)',
    textTransform: 'uppercase',
  },
  summaryMetaCost: {
    fontFamily: fontFamily.display,
    fontSize: 18,
    color: colors.white,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  summaryRowLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: 'rgba(250,246,239,0.68)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryRowValue: {
    fontFamily: fontFamily.display,
    fontSize: 16,
    color: colors.white,
  },
  timerHero: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  timerHeroValue: {
    fontFamily: fontFamily.display,
    fontSize: 52,
    color: colors.tx,
    lineHeight: 58,
    fontStyle: 'italic',
  },
  timerHeroSub: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.mu2,
    textTransform: 'uppercase',
  },
  timerPresetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timerPresetChip: {
    minHeight: 38,
    minWidth: 60,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.s2,
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
    paddingHorizontal: 14,
  },
  timerPresetChipActive: { backgroundColor: colors.acc, borderColor: colors.acc },
  timerPresetText: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.tx },
  timerPresetTextActive: { color: colors.white },
  timerPickRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  timerUnitWrap: { flexDirection: 'row', gap: 6, paddingBottom: 2 },
  timerDarkBox: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.tx,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerDarkBoxLabel: { fontFamily: fontFamily.body, fontSize: 13, color: 'rgba(250,246,239,0.78)', textAlign: 'center' },
  unitChip: {
    minHeight: 42,
    minWidth: 46,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(30,24,18,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.s2,
  },
  unitChipActive: { backgroundColor: colors.acc, borderColor: colors.acc },
  unitChipText: { fontFamily: fontFamily.bodyBold, fontSize: 11, color: colors.tx },
  unitChipTextActive: { color: colors.white },
  ctaWrap: {
    paddingBottom: 8,
  },
});
