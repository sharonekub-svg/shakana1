import { useEffect, useState } from 'react';
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
import { useLocale } from '@/i18n/locale';
import { loadSharedProductInsights, parseSharedProduct, type SharedProductInsights } from '@/lib/sharedProduct';
import { formatAgorot } from '@/utils/format';
import { formatCompactDuration, timerUnitToMinutes } from '@/utils/timer';

type NewOrderParams = {
  url?: string;
  title?: string;
  source?: string;
  store?: string;
};

const ZARA_START_URL = 'https://www.zara.com/il/';
const CATEGORIES = [
  {
    key: 'fashion',
    enName: 'Fashion',
    heName: 'אופנה',
    enDetail: 'Sizes, colors, links and 1+1 deals.',
    heDetail: 'מידות, צבעים, קישורים ומבצעי 1+1.',
  },
  {
    key: 'beauty',
    enName: 'Beauty',
    heName: 'טיפוח',
    enDetail: 'Care products, refills and pharmacy-style orders.',
    heDetail: 'מוצרי טיפוח, מילויים והזמנות פארם.',
  },
  {
    key: 'home',
    enName: 'Home',
    heName: 'בית',
    enDetail: 'Home goods, kitchen, cleaning and building basics.',
    heDetail: 'מוצרי בית, מטבח, ניקיון ודברים לבניין.',
  },
  {
    key: 'kids',
    enName: 'Kids',
    heName: 'ילדים',
    enDetail: 'Kids clothes, school items and toy orders.',
    heDetail: 'בגדי ילדים, ציוד לבית ספר וצעצועים.',
  },
  {
    key: 'electronics',
    enName: 'Electronics',
    heName: 'אלקטרוניקה',
    enDetail: 'Chargers, gadgets and shared delivery savings.',
    heDetail: 'מטענים, גאדג׳טים וחיסכון במשלוח.',
  },
  {
    key: 'grocery',
    enName: 'Grocery',
    heName: 'סופר',
    enDetail: 'Food and pantry orders with clear pickup.',
    heDetail: 'אוכל ומוצרי מזווה עם איסוף ברור.',
  },
];
const DEFAULT_CATEGORY = CATEGORIES[0]?.key ?? 'fashion';
const TIMER_UNITS = ['minutes', 'hours', 'days'] as const;

export default function NewOrder() {
  const router = useRouter();
  const params = useLocalSearchParams<NewOrderParams>();
  const { language, t } = useLocale();
  const isHebrew = language === 'he';
  const copy = isHebrew
    ? {
        detectedAfterPaste: 'יזוהה אחרי הדבקת הקישור',
        waitingForLink: 'ממתין לקישור מוצר',
        addPrice: 'הוסף מחיר ידנית',
        addThreshold: 'הוסף סכום למשלוח חינם',
        unknownThreshold: 'לא ידוע עד שמוסיפים סכום',
        noDeal: 'לא זוהה מבצע כרגע',
        linkNotWorking: 'הלינק לא עובד?',
        closeHelp: 'סגור עזרה',
        linkHelpTitle: 'אפשר להמשיך גם בלי זיהוי אוטומטי',
        linkHelpBody:
          'אם Amazon או חנות אחרת חסמה מחיר, תמונה או משלוח, מלא את שם המוצר, המחיר, החנות והמשלוח בשדות למעלה. ההזמנה והשיתוף עדיין יעבדו רגיל.',
        findProductTitle: 'מצא מוצר, העתק קישור וחזור לכאן.',
        findProductBody:
          'זה המסלול הבטוח והפשוט: Shakana פותחת את החנות, אתה בוחר את הפריט המדויק, מעתיק את הקישור של דף המוצר, ואז Shakana קוראת מידע ציבורי ומשאירה שדות ידניים אם החנות חוסמת פרטים.',
        openZara: 'פתח את Zara',
        useCopiedLink: 'השתמש בקישור שהועתק',
        copyLinkHelp: 'מצא את המוצר, העתק את קישור הדף וחזור לכאן.',
        noProductLink: 'לא נמצא קישור מוצר בטקסט שהועתק.',
        productLinkAdded: 'קישור המוצר נוסף.',
        store: 'חנות',
        storePlaceholder: 'Zara, H&M, Amazon...',
        titlePlaceholder: 'חולצה מזארה',
        stepProduct: 'קישור מוצר',
        stepProductBody: 'הדבק קישור מכל חנות. פרמטרים של מעקב יוסרו אוטומטית.',
        detailsCategory: 'פרטים וקטגוריה',
        detailsCategoryBody: 'אם הקישור לא מצליח להביא שם, מחיר או תמונה, אפשר להוסיף אותם ידנית כאן.',
        category: 'קטגוריה',
        timerShipping: 'טיימר ומשלוח',
        timerShippingBody: 'שכנים יכולים להצטרף עד שהטיימר מסתיים. עריכות ננעלות מעט לפני הסגירה.',
        timer: 'טיימר',
        maxParticipants: 'מקסימום משתתפים',
        estimatedShipping: 'משלוח משוער',
        freeShippingFrom: 'משלוח חינם מסכום',
        product: 'מוצר',
        pasteProductLink: 'הדבק קישור מוצר',
        readingProduct: 'קורא את דף המוצר...',
        deal: 'מבצע',
        simpleOrder: 'הזמנה פשוטה, בלי בלגן.',
        finderResult: 'תוצאת איתור מוצר',
        finderTitle: 'מה Shakana מצאה מהקישור',
        whatItIs: 'מה המוצר',
        whereFrom: 'מאיפה זה מגיע',
        productCost: 'מחיר המוצר',
        freeDeliveryFrom: 'משלוח חינם מ',
        missingFreeDelivery: 'חסר למשלוח חינם',
        neighborsToShare: 'שכנים לשיתוף הקישור',
        dealCheck: 'בדיקת מבצע / 1+1',
        finderNote: 'אם החנות חוסמת פרטים ציבוריים, Shakana משאירה את השדות הידניים כדי שההזמנה עדיין תמשיך.',
        timerPlan: 'תוכנית הזמנה לפי טיימר',
        timerPlanIntro: 'אין יעד סכום: ההזמנה נסגרת לפי זמן, ואז מייסד ההזמנה מקבל קישור וקונה ידנית.',
        timerClosesIn: 'הטיימר נסגר בעוד',
        participants: 'משתתפים',
        upTo: 'עד',
        shippingSaved: 'חיסכון משלוח יחד',
        approxEach: 'בערך לכל אחד',
        missingShared: 'חסר להזמנה המשותפת למשלוח חינם',
        showCart: 'הצג סל',
        hideCart: 'הסתר סל',
        oneItem: 'פריט אחד',
        shoppingCart: 'סל קניות',
        manualProduct: 'מוצר שלא זוהה אוטומטית',
        chooseStore: 'בחר חנות',
        productPrice: 'מחיר מוצר',
        shippingEstimate: 'משלוח משוער',
        cartHint: 'המגירה משאירה את הגלישה נקייה ועדיין מראה מה יוזמן.',
        pickup: 'איסוף',
        pickupManager: 'אחראי איסוף: אתה',
        pickupBody:
          'בחר נקודת איסוף מועדפת לפני יצירת ההזמנה. כולם יראו אותה, ואפשר לעדכן אותה בהמשך.',
        pickupLocation: 'מיקום איסוף מועדף',
        pickupPlaceholder: 'לובי הבניין, נקודת איסוף, או הדירה שלך',
        pickupUncertain: 'מיקום האיסוף עשוי להשתנות לפי החנות או חברת המשלוחים',
        min: 'דק׳',
        hr: 'שעה',
        day: 'יום',
      }
    : {
        detectedAfterPaste: 'Detected after link paste',
        waitingForLink: 'Waiting for product link',
        addPrice: 'Add price manually',
        addThreshold: 'Add store threshold',
        unknownThreshold: 'Unknown until threshold is added',
        noDeal: 'No deal detected yet',
        linkNotWorking: 'Link not working?',
        closeHelp: 'Close help',
        linkHelpTitle: 'You can continue without automatic detection',
        linkHelpBody:
          'If Amazon or another store blocks price, image, or shipping details, fill in product name, price, store, and shipping in the fields above. The order and invite link will still work.',
        findProductTitle: 'Find a product, copy the URL, then come back.',
        findProductBody:
          'This is the safe practical flow: Shakana opens the store, you choose the exact item, copy the product page link, then Shakana reads public product data and keeps manual fields ready if the store blocks details.',
        openZara: 'Open Zara',
        useCopiedLink: 'Use copied link',
        copyLinkHelp: 'Find the product, copy its page link, then come back here.',
        noProductLink: 'No product link found in the copied text.',
        productLinkAdded: 'Product link added.',
        store: 'Store',
        storePlaceholder: 'Zara, H&M, Amazon...',
        titlePlaceholder: 'Zara shirt',
        stepProduct: 'Product link',
        stepProductBody: 'Paste any store link. Tracking parameters are removed automatically.',
        detailsCategory: 'Details and category',
        detailsCategoryBody: 'If the link cannot reveal title, price, or image, add them manually here.',
        category: 'Category',
        timerShipping: 'Timer and shipping',
        timerShippingBody: 'People can join until the timer ends. Edits lock right before closing.',
        timer: 'Timer',
        maxParticipants: 'Max participants',
        estimatedShipping: 'Estimated shipping',
        freeShippingFrom: 'Free shipping from',
        product: 'Product',
        pasteProductLink: 'Paste a product link',
        readingProduct: 'Reading the product page...',
        deal: 'Deal',
        simpleOrder: 'Simple order, no extra clutter.',
        finderResult: 'Product finder result',
        finderTitle: 'What Shakana found from the link',
        whatItIs: 'What it is',
        whereFrom: 'Where it comes from',
        productCost: 'Product cost',
        freeDeliveryFrom: 'Free delivery from',
        missingFreeDelivery: 'Missing for free delivery',
        neighborsToShare: 'Neighbors to share link',
        dealCheck: 'Deal / 1+1 check',
        finderNote: 'If the store blocks public details, Shakana keeps the manual fields above so the order can still continue.',
        timerPlan: 'Timer-based order plan',
        timerPlanIntro: 'No target amount: the order closes by time, then the founder gets the checkout link and buys manually.',
        timerClosesIn: 'Timer closes in',
        participants: 'Participants',
        upTo: 'up to',
        shippingSaved: 'Shipping saved together',
        approxEach: 'Approx. each',
        missingShared: 'Shared order missing for free shipping',
        showCart: 'Show cart drawer',
        hideCart: 'Hide cart drawer',
        oneItem: '1 item',
        shoppingCart: 'Shopping cart',
        manualProduct: 'Manual product',
        chooseStore: 'Choose store',
        productPrice: 'Product price',
        shippingEstimate: 'Shipping estimate',
        cartHint: 'This drawer keeps browsing clean while still showing what will be ordered.',
        pickup: 'Pickup',
        pickupManager: 'Pickup manager: you',
        pickupBody:
          'Choose the preferred pickup point before creating the order. Everyone will see it, and it can be updated later.',
        pickupLocation: 'Preferred pickup location',
        pickupPlaceholder: 'Building lobby, pickup point, or your apartment',
        pickupUncertain: 'Pickup location may vary depending on the store/shipping provider',
        min: 'min',
        hr: 'hr',
        day: 'day',
      };
  const initialDraft = parseSharedProduct({
    url: typeof params.url === 'string' ? params.url : null,
    title: typeof params.title === 'string' ? params.title : null,
    manualStoreLabel: typeof params.store === 'string' ? params.store : null,
  });
  const isZaraStart = params.store === 'zara' || initialDraft?.source === 'zara';
  const [url, setUrl] = useState(() => initialDraft?.url ?? '');
  const [storeLabel, setStoreLabel] = useState(() => initialDraft?.storeLabel ?? (typeof params.store === 'string' ? params.store : ''));
  const [title, setTitle] = useState(() => initialDraft?.title ?? '');
  const [price, setPrice] = useState('');
  const [participants, setParticipants] = useState('3');
  const [timerValue, setTimerValue] = useState('30');
  const [timerUnit, setTimerUnit] = useState<(typeof TIMER_UNITS)[number]>('minutes');
  const [shipping, setShipping] = useState('30');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('199');
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [cartOpen, setCartOpen] = useState(false);
  const [linkHelpOpen, setLinkHelpOpen] = useState(false);
  const [insights, setInsights] = useState<SharedProductInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(Boolean(initialDraft));
  const [linkMessage, setLinkMessage] = useState('');
  const create = useCreateOrder();
  const pushToast = useUiStore((s) => s.pushToast);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const defaultPickupLocation = [profile?.street, profile?.building, profile?.city]
    .filter(Boolean)
    .join(', ');
  const [pickupLocation, setPickupLocation] = useState(defaultPickupLocation);
  const currentDraft = parseSharedProduct({
    url,
    title: title || initialDraft?.title || null,
    manualStoreLabel: storeLabel,
  });

  const urlCheck = productUrlSchema.safeParse(url);
  const parsedPriceAgorot = Math.floor(Number(price) * 100);
  const priceAgorot = Number.isFinite(parsedPriceAgorot) && parsedPriceAgorot > 0 ? parsedPriceAgorot : insights?.priceAgorot ?? 0;
  const participantCount = Math.max(2, Math.min(12, Math.floor(Number(participants)) || 3));
  const rawTimerValue = Math.max(1, Math.floor(Number(timerValue)) || 30);
  const timerMinutesNumber = Math.max(5, Math.min(10080, timerUnitToMinutes(rawTimerValue, timerUnit)));
  const timerLabel = formatCompactDuration(timerMinutesNumber * 60_000);
  const deliveryFeeAgorot = Math.max(0, Math.floor(Number(shipping) * 100) || insights?.deliveryFeeAgorot || 0);
  const freeShippingThresholdAgorot =
    Math.max(0, Math.floor(Number(freeShippingThreshold) * 100) || insights?.freeShippingThresholdAgorot || 0);
  const sharedOrderTotalAgorot = priceAgorot * participantCount;
  const freeShippingGapAgorot = Math.max(0, freeShippingThresholdAgorot - sharedOrderTotalAgorot);
  const shippingSavedAgorot = Math.max(0, deliveryFeeAgorot * Math.max(0, participantCount - 1));
  const perPersonAgorot = Math.ceil((priceAgorot + deliveryFeeAgorot / participantCount));
  const neighborsToInvite = Math.max(0, participantCount - 1);
  const sourceLabel = insights?.sourceLabel || storeLabel || currentDraft?.storeLabel || copy.detectedAfterPaste;
  const productName = insights?.title || title || currentDraft?.title || copy.waitingForLink;
  const productCostLabel = priceAgorot > 0 ? formatAgorot(priceAgorot) : copy.addPrice;
  const freeShippingThresholdLabel =
    freeShippingThresholdAgorot > 0 ? formatAgorot(freeShippingThresholdAgorot) : copy.addThreshold;
  const freeShippingGapLabel =
    freeShippingThresholdAgorot > 0 ? formatAgorot(freeShippingGapAgorot) : copy.unknownThreshold;
  const dealLabel = insights?.promotionText || insights?.dealSummary || copy.noDeal;
  const valid =
    urlCheck.success &&
    storeLabel.trim().length > 1 &&
    title.trim().length > 1 &&
    priceAgorot > 0 &&
    pickupLocation.trim().length > 2 &&
    Boolean(user?.id);

  useEffect(() => {
    if (!pickupLocation.trim() && defaultPickupLocation) {
      setPickupLocation(defaultPickupLocation);
    }
  }, [defaultPickupLocation, pickupLocation]);

  useEffect(() => {
    if (!currentDraft) {
      setInsights(null);
      setInsightsLoading(false);
      return;
    }

    let active = true;
    setInsightsLoading(true);

    void loadSharedProductInsights(currentDraft)
      .then((next) => {
        if (!active) return;
        setInsights(next);
        setStoreLabel((prev) => prev || next.sourceLabel);
        if (!title.trim()) setTitle(next.title);
        if (!price.trim() && next.priceAgorot) {
          setPrice((next.priceAgorot / 100).toFixed(2).replace(/\.00$/, ''));
        }
        if (next.deliveryFeeAgorot) setShipping((next.deliveryFeeAgorot / 100).toFixed(2).replace(/\.00$/, ''));
        if (next.freeShippingThresholdAgorot) {
          setFreeShippingThreshold((next.freeShippingThresholdAgorot / 100).toFixed(2).replace(/\.00$/, ''));
        }
      })
      .catch(() => {
        if (active) setInsights(null);
      })
      .finally(() => {
        if (active) setInsightsLoading(false);
      });

    return () => {
      active = false;
    };
    // Re-read only when the product URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDraft?.url]);

  const openZara = async () => {
    await Linking.openURL(ZARA_START_URL);
    setLinkMessage(copy.copyLinkHelp);
  };

  const useCopiedLink = async () => {
    const copied = await Clipboard.getStringAsync();
    const draft = parseSharedProduct({ url: copied, text: copied });
    if (!draft) {
      setLinkMessage(copy.noProductLink);
      return;
    }
    setUrl(draft.url);
    setStoreLabel(draft.storeLabel);
    setTitle((prev) => prev || draft.title);
    setLinkMessage(copy.productLinkAdded);
  };

  const submit = async () => {
    if (!valid || create.isPending) return;
    try {
      const order = await create.mutateAsync({
        productUrl: url.trim(),
        productTitle: title.trim(),
        productPriceAgorot: priceAgorot,
        productImage: insights?.imageUrl ?? undefined,
        storeKey: currentDraft?.source ?? 'manual',
        storeLabel: storeLabel.trim(),
        estimatedShippingAgorot: deliveryFeeAgorot,
        freeShippingThresholdAgorot,
        timerMinutes: timerMinutesNumber,
        maxParticipants: participantCount,
        pickupResponsibleUserId: user!.id,
        preferredPickupLocation: pickupLocation.trim(),
      });
      router.replace(`/order/${order.id}`);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : t('order.new.error'), 'error');
    }
  };

  return (
    <ScreenBase padded={false}>
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackBtn onPress={() => router.back()} />
          <Text style={styles.title}>{t('order.new.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {isZaraStart ? (
          <View style={styles.guideCard}>
            <Text style={styles.kicker}>ZARA</Text>
            <Text style={styles.guideTitle}>{copy.findProductTitle}</Text>
            <Text style={styles.guideBody}>
              {copy.findProductBody}
            </Text>
            <View style={styles.actions}>
              <Pressable style={styles.primarySmall} onPress={openZara}>
                <Text style={styles.primarySmallText}>{copy.openZara}</Text>
              </Pressable>
              <Pressable style={styles.secondarySmall} onPress={useCopiedLink}>
                <Text style={styles.secondarySmallText}>{copy.useCopiedLink}</Text>
              </Pressable>
            </View>
            {linkMessage ? <Text style={styles.noteText}>{linkMessage}</Text> : null}
          </View>
        ) : null}

        <View style={styles.formCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <View style={styles.stepCopy}>
              <Text style={styles.stepTitle}>{copy.stepProduct}</Text>
              <Text style={styles.stepBody}>{copy.stepProductBody}</Text>
            </View>
          </View>
          <Field
            label={t('order.new.urlLabel')}
            value={url}
            onChange={setUrl}
            placeholder="https://..."
            ltr
            keyboardType="url"
            autoCapitalize="none"
          />
          <Field label={copy.store} value={storeLabel} onChange={setStoreLabel} placeholder={copy.storePlaceholder} />
          <Field label={t('order.new.titleLabel')} value={title} onChange={setTitle} placeholder={copy.titlePlaceholder} />
          <NumField label={t('order.new.priceLabel')} value={price} onChange={setPrice} placeholder="199" />
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <View style={styles.stepCopy}>
              <Text style={styles.stepTitle}>{copy.detailsCategory}</Text>
              <Text style={styles.stepBody}>{copy.detailsCategoryBody}</Text>
            </View>
          </View>
          <View style={styles.categoryBlock}>
            <Text style={styles.fieldCaption}>{copy.category}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {CATEGORIES.map((item) => (
                <Pressable
                  key={item.key}
                  style={[styles.categoryChip, category === item.key && styles.categoryChipActive]}
                  onPress={() => setCategory(item.key)}
                >
                  <Text style={[styles.categoryChipText, category === item.key && styles.categoryChipTextActive]}>
                    {isHebrew ? item.heName : item.enName}
                  </Text>
                  <Text style={[styles.categoryDetail, category === item.key && styles.categoryDetailActive]}>
                    {isHebrew ? item.heDetail : item.enDetail}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3</Text>
            </View>
            <View style={styles.stepCopy}>
              <Text style={styles.stepTitle}>{copy.timerShipping}</Text>
              <Text style={styles.stepBody}>{copy.timerShippingBody}</Text>
            </View>
          </View>
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
          <NumField label={copy.maxParticipants} value={participants} onChange={setParticipants} placeholder="3" />
          <NumField label={copy.estimatedShipping} value={shipping} onChange={setShipping} placeholder="30" />
          <NumField
            label={copy.freeShippingFrom}
            value={freeShippingThreshold}
            onChange={setFreeShippingThreshold}
            placeholder="199"
          />
        </View>

        <View style={styles.productCard}>
          <View style={styles.productCopy}>
            <Text style={styles.kicker}>{copy.product}</Text>
            <Text style={styles.productTitle} numberOfLines={2}>
              {insights?.title || title || copy.pasteProductLink}
            </Text>
            <Text style={styles.productBody}>
              {insightsLoading
                ? copy.readingProduct
                : insights?.promotionText
                  ? `${copy.deal}: ${insights.promotionText}`
                  : copy.simpleOrder}
            </Text>
            {insightsLoading ? <ActivityIndicator color={colors.acc} /> : null}
          </View>
          {insights?.imageUrl ? <Image source={{ uri: insights.imageUrl }} style={styles.productImage} /> : null}
        </View>

        <View style={styles.finderCard}>
          <Text style={styles.kicker}>{copy.finderResult}</Text>
          <Text style={styles.finderTitle}>{copy.finderTitle}</Text>
          <View style={styles.finderGrid}>
            <View style={styles.finderCell}>
              <Text style={styles.finderLabel}>{copy.whatItIs}</Text>
              <Text style={styles.finderValue}>{productName}</Text>
            </View>
            <View style={styles.finderCell}>
              <Text style={styles.finderLabel}>{copy.whereFrom}</Text>
              <Text style={styles.finderValue}>{sourceLabel}</Text>
            </View>
            <View style={styles.finderCell}>
              <Text style={styles.finderLabel}>{copy.productCost}</Text>
              <Text style={styles.finderValue}>{productCostLabel}</Text>
            </View>
            <View style={styles.finderCell}>
              <Text style={styles.finderLabel}>{copy.freeDeliveryFrom}</Text>
              <Text style={styles.finderValue}>{freeShippingThresholdLabel}</Text>
            </View>
            <View style={styles.finderCell}>
              <Text style={styles.finderLabel}>{copy.missingFreeDelivery}</Text>
              <Text style={styles.finderValue}>{freeShippingGapLabel}</Text>
            </View>
            <View style={styles.finderCell}>
              <Text style={styles.finderLabel}>{copy.neighborsToShare}</Text>
              <Text style={styles.finderValue}>{neighborsToInvite}</Text>
            </View>
          </View>
          <View style={styles.dealBox}>
            <Text style={styles.finderLabel}>{copy.dealCheck}</Text>
            <Text style={styles.dealText}>{dealLabel}</Text>
          </View>
          <Text style={styles.finderNote}>{copy.finderNote}</Text>
          <Pressable style={styles.linkHelpButton} onPress={() => setLinkHelpOpen((open) => !open)}>
            <Text style={styles.linkHelpButtonText}>{linkHelpOpen ? copy.closeHelp : copy.linkNotWorking}</Text>
          </Pressable>
          {linkHelpOpen ? (
            <View style={styles.linkHelpCard}>
              <Text style={styles.linkHelpTitle}>{copy.linkHelpTitle}</Text>
              <Text style={styles.linkHelpBody}>{copy.linkHelpBody}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.planCard}>
          <Text style={styles.planTitle}>{copy.timerPlan}</Text>
          <Text style={styles.planIntro}>{copy.timerPlanIntro}</Text>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>{copy.timerClosesIn}</Text>
            <Text style={styles.planValue}>{timerLabel}</Text>
          </View>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>{copy.estimatedShipping}</Text>
            <Text style={styles.planValue}>{formatAgorot(deliveryFeeAgorot)}</Text>
          </View>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>{copy.participants}</Text>
            <Text style={styles.planValue}>{copy.upTo} {participantCount}</Text>
          </View>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>{copy.shippingSaved}</Text>
            <Text style={styles.planValue}>{formatAgorot(shippingSavedAgorot)}</Text>
          </View>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>{copy.approxEach}</Text>
            <Text style={styles.planValue}>{formatAgorot(perPersonAgorot)}</Text>
          </View>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>{copy.missingShared}</Text>
            <Text style={styles.planValue}>{formatAgorot(freeShippingGapAgorot)}</Text>
          </View>
        </View>

        <Pressable style={styles.drawerHandle} onPress={() => setCartOpen((open) => !open)}>
          <Text style={styles.drawerHandleText}>{cartOpen ? copy.hideCart : copy.showCart}</Text>
          <Text style={styles.drawerCount}>{copy.oneItem}</Text>
        </Pressable>

        {cartOpen ? (
          <View style={styles.cartDrawer}>
            <Text style={styles.kicker}>{copy.shoppingCart}</Text>
            <Text style={styles.cartTitle}>{title || copy.manualProduct}</Text>
            <Text style={styles.cartLine}>{copy.store}: {storeLabel || copy.chooseStore}</Text>
            <Text style={styles.cartLine}>{copy.category}: {CATEGORIES.find((item) => item.key === category)?.[isHebrew ? 'heName' : 'enName']}</Text>
            <Text style={styles.cartLine}>{copy.productPrice}: {formatAgorot(priceAgorot)}</Text>
            <Text style={styles.cartLine}>{copy.shippingEstimate}: {formatAgorot(deliveryFeeAgorot)}</Text>
            <Text style={styles.cartHint}>{copy.cartHint}</Text>
          </View>
        ) : null}

        <View style={styles.pickupCard}>
          <Text style={styles.kicker}>{copy.pickup}</Text>
          <Text style={styles.pickupTitle}>{copy.pickupManager}</Text>
          <Text style={styles.pickupBody}>{copy.pickupBody}</Text>
          <Field
            label={copy.pickupLocation}
            value={pickupLocation}
            onChange={setPickupLocation}
            placeholder={copy.pickupPlaceholder}
          />
          <Text style={styles.uncertainText}>{copy.pickupUncertain}</Text>
        </View>

        <PrimaryBtn label={t('order.new.submit')} onPress={submit} disabled={!valid} loading={create.isPending} />
      </ScrollView>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.tx,
  },
  guideCard: {
    gap: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.brBr,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    ...shadow.card,
  },
  kicker: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.acc,
    textTransform: 'uppercase',
  },
  guideTitle: {
    fontFamily: fontFamily.display,
    fontSize: 21,
    lineHeight: 25,
    color: colors.tx,
  },
  guideBody: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.mu,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  primarySmall: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
  primarySmallText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.white,
  },
  secondarySmall: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brBr,
    backgroundColor: colors.cardSoft,
  },
  secondarySmallText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.tx,
  },
  noteText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    lineHeight: 18,
    color: colors.acc,
  },
  formCard: {
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.brBr,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
  },
  stepHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.cardSoft,
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
  stepBadgeText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: colors.white,
  },
  stepCopy: {
    flex: 1,
    gap: 3,
  },
  stepTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.tx,
  },
  stepBody: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 17,
    color: colors.mu,
  },
  productCard: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.brBr,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    ...shadow.card,
  },
  productCopy: {
    flex: 1,
    gap: 8,
  },
  productTitle: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: colors.tx,
  },
  productBody: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.mu,
  },
  productImage: {
    width: 84,
    height: 104,
    borderRadius: radii.md,
    backgroundColor: colors.s1,
  },
  finderCard: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.brBr,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    ...shadow.card,
  },
  finderTitle: {
    fontFamily: fontFamily.display,
    fontSize: 21,
    color: colors.tx,
  },
  finderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  finderCell: {
    width: '48%',
    minHeight: 86,
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.br,
  },
  finderLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 0.7,
    color: colors.mu,
    textTransform: 'uppercase',
  },
  finderValue: {
    marginTop: 8,
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.tx,
  },
  dealBox: {
    gap: 6,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.accLight,
  },
  dealText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.acc,
  },
  finderNote: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mu,
  },
  linkHelpButton: {
    minHeight: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
  linkHelpButtonText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.white,
  },
  linkHelpCard: {
    gap: 6,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.br,
  },
  linkHelpTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.tx,
  },
  linkHelpBody: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mu,
  },
  planCard: {
    gap: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.brBr,
    borderRadius: radii.lg,
    backgroundColor: colors.cardSoft,
  },
  planTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: colors.tx,
  },
  planIntro: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mu,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  planLabel: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.mu,
  },
  planValue: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.tx,
  },
  pickupCard: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.brBr,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    ...shadow.card,
  },
  pickupTitle: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: colors.tx,
  },
  pickupBody: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.mu,
  },
  uncertainText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    lineHeight: 18,
    color: colors.acc,
  },
  categoryBlock: {
    gap: 8,
  },
  fieldCaption: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: colors.tx,
  },
  chipRow: {
    gap: 8,
  },
  categoryChip: {
    width: 172,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.white,
  },
  categoryChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  categoryChipText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: colors.tx,
  },
  categoryChipTextActive: {
    color: colors.white,
  },
  categoryDetail: {
    marginTop: 4,
    fontFamily: fontFamily.body,
    fontSize: 10,
    lineHeight: 14,
    color: colors.mu,
  },
  categoryDetailActive: {
    color: 'rgba(255,255,255,0.78)',
  },
  timerPickRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  timerUnitWrap: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 2,
  },
  unitChip: {
    minHeight: 42,
    minWidth: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.br,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardSoft,
  },
  unitChipActive: {
    backgroundColor: colors.acc,
    borderColor: colors.acc,
  },
  unitChipText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    color: colors.tx,
  },
  unitChipTextActive: {
    color: colors.white,
  },
  drawerHandle: {
    minHeight: 54,
    paddingHorizontal: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerHandleText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.white,
  },
  drawerCount: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: colors.s1,
  },
  cartDrawer: {
    gap: 8,
    padding: 16,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.white,
    ...shadow.card,
  },
  cartTitle: {
    fontFamily: fontFamily.display,
    fontSize: 21,
    color: colors.tx,
  },
  cartLine: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.mu,
  },
  cartHint: {
    marginTop: 4,
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    lineHeight: 18,
    color: colors.acc,
  },
});
