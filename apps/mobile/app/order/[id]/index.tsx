import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { PrimaryBtn, SecondaryBtn } from '@/components/primitives/Button';
import { Field } from '@/components/primitives/Field';
import { NumField } from '@/components/primitives/NumField';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useAddOrderItem, useCloseOrder, useOrder } from '@/api/orders';
import { useGenerateInvite } from '@/api/invites';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { formatAgorot } from '@/utils/format';
import { formatCompactDuration } from '@/utils/timer';
import type { Participant } from '@/types/domain';
import { useLocale } from '@/i18n/locale';
import { buildInviteUrl } from '@/lib/deeplinks';
import { loadSharedProductInsights, parseSharedProduct } from '@/lib/sharedProduct';
import { fetchProductPageHtml } from '@/api/productInsights';

const DEFAULT_DELIVERY_FEE_AGOROT = 3000;
const DEFAULT_FREE_SHIPPING_THRESHOLD_AGOROT = 19900;

function ParticipantTower({
  participants,
  currentUserId,
}: {
  participants: Participant[];
  currentUserId: string | undefined;
}) {
  const { language } = useLocale();
  const isHebrew = language === 'he';
  const slots = participants;
  return (
    <View style={styles.tower}>
      {slots.map((p, i) => {
        const isMe = p && p.user_id === currentUserId;
        return (
          <View key={i} style={[styles.slot, p && styles.slotFilled, isMe && styles.slotMe]}>
            {p ? (
              <Text style={styles.slotText}>
                {isMe ? (isHebrew ? 'אתה' : 'YOU') : `${isHebrew ? 'מקום' : 'SEAT'} ${i + 1}`} | {p.status === 'paid' ? (isHebrew ? 'שולם' : 'PAID') : (isHebrew ? 'פתוח' : 'OPEN')}
              </Text>
            ) : (
              <Text style={styles.slotEmpty}>{isHebrew ? 'מקום פנוי' : 'OPEN SLOT'}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function OrderShell() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { language } = useLocale();
  const isHebrew = language === 'he';
  const copy = isHebrew
    ? {
        unableToLoad: 'לא הצלחנו לטעון את ההזמנה.',
        noTimer: 'אין טיימר',
        mainProduct: 'המוצר הראשי',
        productAdded: 'המוצר נוסף לסל המשותף.',
        order: 'הזמנה',
        item: 'פריט',
        store: 'חנות',
        timerOrder: 'הזמנה לפי טיימר',
        locked: 'נעול',
        timerBody: 'משתמשים יכולים להצטרף ולהוסיף פריטים עד שהטיימר מסתיים. עריכות ננעלות 15 שניות לפני הסגירה.',
        editsLocked: 'העריכות נעולות.',
        editsOpen: 'העריכות עדיין פתוחות.',
        participants: 'משתתפים',
        finderSummary: 'סיכום איתור מוצר',
        importantCosts: 'עלויות חשובות',
        productCost: 'מחיר המוצר',
        shippingFee: 'דמי משלוח',
        freeShippingMinimum: 'סכום למשלוח חינם',
        costCardNote: 'אלה שלושת המספרים הכי חשובים להזמנה הזאת.',
        whatItIs: 'מה המוצר',
        notDetected: 'שם המוצר לא זוהה',
        whereFrom: 'מאיפה זה מגיע',
        detectedFromLink: 'החנות זוהתה מהקישור',
        productPriceDetected: 'מחיר מוצר שזוהה',
        estimatedShipping: 'משלוח משוער',
        freeDeliveryNeeds: 'כל ההזמנה צריכה להגיע לסכום הזה למשלוח חינם',
        approxEach: 'בערך לכל אחד עכשיו',
        shippingSaved: 'חיסכון משלוח יחד',
        missingParticipants: 'חסר למשלוח חינם לפי משתתפים',
        missingCart: 'חסר למשלוח חינם לפי הסל',
        neighborsCanJoin: 'שכנים שעוד יכולים להצטרף מהקישור',
        dealNote:
          'בדיקת המבצעים קוראת טקסט ציבורי של המוצר עבור 1+1, סייל ומבצעים דומים. אם החנות חוסמת פרטים, המשתמשים עדיין יכולים להוסיף אותם ידנית.',
        fullCart: 'הסל המשותף המלא',
        items: 'פריטים',
        hide: 'הסתר',
        show: 'הצג',
        size: 'מידה',
        productLinkSaved: 'קישור מוצר נשמר',
        manualItem: 'פריט ידני',
        addProduct: 'הוסף את המוצר שלך',
        addProductBody: 'משתמשים שהצטרפו יכולים להוסיף עוד מוצר לאותו סל משותף. בדמו הזה התשלום מדולג, אז זה רק מעדכן את הסל ומקל לבדוק את הזרימה.',
        productName: 'שם מוצר',
        productPlaceholder: 'חולצה מזארה, ג׳ינס מ-H&M...',
        price: 'מחיר',
        sizeNote: 'מידה / הערה',
        sizePlaceholder: 'M, שחור',
        productLink: 'קישור מוצר',
        cartLocked: 'הסל ננעל בגלל הטיימר',
        adding: 'מוסיף...',
        addToCart: 'הוסף לסל המשותף',
        couldNotAdd: 'לא הצלחנו להוסיף את המוצר.',
        pickupPlan: 'תוכנית איסוף',
        pickupManager: 'אחראי איסוף נקבע',
        preferredLocation: 'מיקום מועדף',
        creatorWillAdd: 'יוגדר על ידי יוצר ההזמנה',
        pickupMayVary: 'מיקום האיסוף עשוי להשתנות לפי החנות או חברת המשלוחים',
        founderCheckout: 'פתח Checkout למייסד',
        skippedProgress: 'התשלום מדולג: הצג התקדמות הזמנה',
        createInvite: 'צור קישור הזמנה',
        explainOrder: 'הסבר את ההזמנה',
        noTimer: 'ללא טיימר',
        noTimerOrder: 'הזמנה ידנית',
        noTimerBody: 'ההזמנה פתוחה עד שתסגור אותה ידנית.',
        closeOrder: 'סגור הזמנה',
        closingOrder: 'סוגר...',
      }
    : {
        unableToLoad: 'Unable to load order.',
        noTimer: 'No timer',
        mainProduct: 'Main product',
        productAdded: 'Product added to the shared cart.',
        order: 'Order',
        item: 'ITEM',
        store: 'Store',
        timerOrder: 'Timer order',
        locked: 'Locked',
        timerBody: 'Users can join and add cart items until the timer ends. Edits lock 15 seconds before closing.',
        editsLocked: 'Edits are locked.',
        editsOpen: 'Edits are still open.',
        participants: 'Participants',
        finderSummary: 'Product finder summary',
        importantCosts: 'Important costs',
        productCost: 'Product price',
        shippingFee: 'Delivery fee',
        freeShippingMinimum: 'Free delivery minimum',
        costCardNote: 'These are the three most important numbers for this order.',
        whatItIs: 'What it is',
        notDetected: 'Product name was not detected',
        whereFrom: 'Where it comes from',
        detectedFromLink: 'Store detected from link',
        productPriceDetected: 'Product price detected',
        estimatedShipping: 'Estimated shipping',
        freeDeliveryNeeds: 'Whole order needs for free delivery',
        approxEach: 'Approx. each right now',
        shippingSaved: 'Shipping saved together',
        missingParticipants: 'Missing for free shipping by participants',
        missingCart: 'Missing for free shipping by cart total',
        neighborsCanJoin: 'Neighbors who can still join from share link',
        dealNote:
          'Deal detection checks public product text for 1+1, sale, and similar promotions. If the store blocks details, users can still add them manually.',
        fullCart: 'Full shared cart',
        items: 'items',
        hide: 'Hide',
        show: 'Show',
        size: 'Size',
        productLinkSaved: 'Product link saved',
        manualItem: 'Manual item',
        addProduct: 'Add your product',
        addProductBody: 'Joined users can add one more product to the same shared cart. Payment is skipped in this demo, so this only updates the cart and keeps the flow easy to test.',
        productName: 'Product name',
        productPlaceholder: 'Zara shirt, H&M jeans...',
        price: 'Price',
        sizeNote: 'Size / note',
        sizePlaceholder: 'M, black',
        productLink: 'Product link',
        cartLocked: 'Cart locked by timer',
        adding: 'Adding...',
        addToCart: 'Add to shared cart',
        couldNotAdd: 'Could not add the product.',
        pickupPlan: 'Pickup plan',
        pickupManager: 'Pickup manager assigned',
        preferredLocation: 'Preferred location',
        creatorWillAdd: 'Will be added by the order creator',
        pickupMayVary: 'Pickup location may vary depending on the store/shipping provider',
        founderCheckout: 'Open founder checkout',
        skippedProgress: 'Payment skipped: view order progress',
        createInvite: 'Create invite link',
        explainOrder: 'Explain this order',
        noTimer: 'No timer',
        noTimerOrder: 'Manual order',
        noTimerBody: 'Order stays open until you close it manually.',
        closeOrder: 'Close order',
        closingOrder: 'Closing...',
      };
  const actionCopy = {
    changeTimer: isHebrew ? 'שנה' : 'Change',
    chooseBeforeShare: isHebrew ? 'בחר מידה וצבע לפני שיתוף' : 'Choose size and color before sharing',
    shareHint: isHebrew
      ? 'בחר מידה וצבע כדי שהקישור לוואטסאפ יישלח עם פרטי הזמנה נכונים.'
      : 'Choose size and color so the WhatsApp link includes the correct order details.',
    shareAction: isHebrew ? 'שתף ב-WhatsApp' : 'Share on WhatsApp',
  };
  const userId = useAuthStore((s) => s.user?.id);
  const pushToast = useUiStore((s) => s.pushToast);
  const { data, isLoading, error } = useOrder(id);
  const closeOrder = useCloseOrder();
  const addItem = useAddOrderItem();
  const generateInvite = useGenerateInvite();
  const [now, setNow] = useState(Date.now());
  const [cartOpen, setCartOpen] = useState(true);
  const [itemTitle, setItemTitle] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemSize, setItemSize] = useState('');
  const [itemColor, setItemColor] = useState('');
  const [itemRef, setItemRef] = useState('');
  const [detectedSizes, setDetectedSizes] = useState<string[]>([]);
  const [detectedColors, setDetectedColors] = useState<string[]>([]);

  const order = data?.order;
  const me = data?.participants.find((p) => p.user_id === userId);
  const participantCount = data?.participants.length ?? 0;
  const cartItems = data?.items ?? [];
  const loadErrorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : null;

  useEffect(() => {
    if (!order || !me) return;
    if (order.status === 'completed') router.replace(`/order/${order.id}/complete`);
    else if (order.status === 'escrow' || order.status === 'delivered') router.replace(`/order/${order.id}/escrow`);
  }, [order, me, router]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!order) return;
    setItemTitle((prev) => prev || order.product_title || '');
    setItemPrice((prev) => prev || (order.product_price_agorot / 100).toFixed(2).replace(/\.00$/, ''));
    setItemRef((prev) => prev || order.product_url);
  }, [order]);

  useEffect(() => {
    if (!order?.product_url) return;
    const draft = parseSharedProduct({
      url: order.product_url,
      title: order.product_title,
      manualStoreLabel: order.store_label,
    });
    if (!draft) return;
    let active = true;
    void loadSharedProductInsights(draft, fetchProductPageHtml)
      .then((insights) => {
        if (!active) return;
        setDetectedSizes(insights.availableSizes);
        setDetectedColors(insights.availableColors);
      })
      .catch(() => {
        if (!active) return;
        setDetectedSizes([]);
        setDetectedColors([]);
      });
    return () => {
      active = false;
    };
  }, [order?.product_title, order?.product_url, order?.store_label]);

  useEffect(() => {
    if (!order?.closes_at || !['open', 'paying'].includes(order.status) || closeOrder.isPending) return;
    if (new Date(order.closes_at).getTime() <= now) {
      void closeOrder.mutateAsync(order.id).catch(() => {});
    }
  }, [closeOrder, now, order]);

  if (isLoading) {
    return (
      <ScreenBase style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.acc} />
      </ScreenBase>
    );
  }
  if (error || !data || !order) {
    return (
      <ScreenBase style={styles.loadErrorScreen}>
        <View style={styles.loadErrorCard}>
          <Text style={styles.loadErrorTitle}>{copy.unableToLoad}</Text>
          {loadErrorMessage ? <Text style={styles.loadErrorBody}>{loadErrorMessage}</Text> : null}
          <SecondaryBtn label={isHebrew ? 'חזרה להזמנות' : 'Back to orders'} onPress={() => router.replace('/(tabs)/orders')} />
        </View>
      </ScreenBase>
    );
  }

  const freeShippingThreshold =
    typeof order.free_shipping_threshold_agorot === 'number' && order.free_shipping_threshold_agorot > 0
      ? order.free_shipping_threshold_agorot
      : DEFAULT_FREE_SHIPPING_THRESHOLD_AGOROT;
  const estimatedShipping =
    typeof order.estimated_shipping_agorot === 'number' && order.estimated_shipping_agorot > 0
      ? order.estimated_shipping_agorot
      : order.product_price_agorot >= freeShippingThreshold
        ? 0
        : DEFAULT_DELIVERY_FEE_AGOROT;
  const sharedOrderTotal = order.product_price_agorot * participantCount;
  const freeShippingGap = Math.max(0, freeShippingThreshold - sharedOrderTotal);
  const shippingSaved = Math.max(0, estimatedShipping * Math.max(0, participantCount - 1));
  const perPerson = Math.ceil((order.product_price_agorot + estimatedShipping / Math.max(1, participantCount || order.max_participants)));
  const neighborsToInvite = Math.max(0, order.max_participants - participantCount);
  const closesAtMs = order.closes_at ? new Date(order.closes_at).getTime() : null;
  const editLocksAtMs = order.edit_locks_at ? new Date(order.edit_locks_at).getTime() : null;
  const remainingMs = closesAtMs ? Math.max(0, closesAtMs - now) : null;
  const editLocked = Boolean(editLocksAtMs && editLocksAtMs <= now);
  const timerLabel = remainingMs == null ? copy.noTimer : formatCompactDuration(remainingMs);
  const visibleCartItems = cartItems.length > 0
    ? cartItems
    : [
        {
          id: 'main-product-preview',
          title: order.product_title ?? copy.mainProduct,
          price_agorot: order.product_price_agorot,
          ref: order.product_url,
          size: null,
          participant_id: me?.id ?? '',
          order_id: order.id,
        },
      ];
  const cartTotal = visibleCartItems.reduce((sum, item) => sum + item.price_agorot, 0);
  const cartFreeShippingGap = Math.max(0, freeShippingThreshold - cartTotal);
  const hasSavedOptions = cartItems.some((item) => Boolean(item.size?.trim()));
  const hasSelectedOptions = itemSize.trim().length > 0 || itemColor.trim().length > 0;
  const canShareOrder = hasSavedOptions || hasSelectedOptions;
  const itemPriceAgorot = Math.floor(Number(itemPrice) * 100);
  const canAddItem =
    Boolean(me?.id) &&
    !editLocked &&
    ['open', 'paying'].includes(order.status) &&
    itemTitle.trim().length > 1 &&
    (detectedSizes.length === 0 || itemSize.trim().length > 0) &&
    (detectedColors.length === 0 || itemColor.trim().length > 0) &&
    Number.isFinite(itemPriceAgorot) &&
    itemPriceAgorot > 0;

  const onAddItem = async () => {
    if (!me?.id || !canAddItem) return;
    const sizeStr = itemSize.trim();
    const colorStr = itemColor.trim();
    const optionParts = [
      sizeStr && `${isHebrew ? 'מידה' : 'Size'}: ${sizeStr}`,
      colorStr && `${isHebrew ? 'צבע' : 'Color'}: ${colorStr}`,
    ].filter(Boolean);
    await addItem.mutateAsync({
      orderId: order.id,
      participantId: me.id,
      title: itemTitle,
      ref: itemRef,
      size: optionParts.join(' | ') || null,
      priceAgorot: itemPriceAgorot,
    });
    setItemTitle('');
    setItemPrice('');
    setItemSize('');
    setItemColor('');
    setItemRef('');
    pushToast(copy.productAdded, 'success');
  };

  const onShareOrder = async () => {
    if (!canShareOrder) {
      pushToast(actionCopy.chooseBeforeShare, 'error');
      return;
    }
    try {
      const invite = await generateInvite.mutateAsync(order.id);
      const inviteUrl = buildInviteUrl(invite.token);
      const optionText = hasSelectedOptions
        ? isHebrew
          ? ` מידה: ${itemSize.trim()}, צבע: ${itemColor.trim()}.`
          : ` Size: ${itemSize.trim()}, color: ${itemColor.trim()}.`
        : '';
      const message = isHebrew
        ? `פתחתי הזמנה ב-Shakana: ${order.product_title ?? order.product_url}.${optionText} דמי משלוח: ${formatAgorot(estimatedShipping)}. משלוח חינם מ-${formatAgorot(freeShippingThreshold)}. חסר למשלוח חינם: ${formatAgorot(cartFreeShippingGap)}. ${inviteUrl}`
        : `I opened a Shakana order: ${order.product_title ?? order.product_url}.${optionText} Delivery fee: ${formatAgorot(estimatedShipping)}. Free delivery from ${formatAgorot(freeShippingThreshold)}. Missing for free delivery: ${formatAgorot(cartFreeShippingGap)}. ${inviteUrl}`;
      await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : isHebrew ? 'לא הצלחנו לפתוח שיתוף.' : 'Could not open sharing.', 'error');
    }
  };

  return (
    <ScreenBase style={{ paddingTop: 20, paddingBottom: 36 }}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <Text style={styles.headerTitle}>{copy.order}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 24 }}>
        <View style={styles.product}>
          {order.product_image ? (
            <Image source={{ uri: order.product_image }} style={styles.productImg} />
          ) : (
            <View style={[styles.productImg, styles.productPlaceholder]}>
              <Text style={styles.placeholderText}>{copy.item}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {order.product_title ?? order.product_url}
            </Text>
            <Text style={styles.productPrice}>
              {order.store_label ?? copy.store} | {formatAgorot(order.product_price_agorot)}
            </Text>
          </View>
        </View>

        <View style={styles.costCard}>
          <Text style={styles.costKicker}>{copy.importantCosts}</Text>
          <View style={styles.costGrid}>
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>{copy.productCost}</Text>
              <Text style={styles.costValue}>{formatAgorot(order.product_price_agorot)}</Text>
            </View>
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>{copy.shippingFee}</Text>
              <Text style={styles.costValue}>{formatAgorot(estimatedShipping)}</Text>
            </View>
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>{copy.freeShippingMinimum}</Text>
              <Text style={styles.costValue}>{formatAgorot(freeShippingThreshold)}</Text>
            </View>
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>{copy.missingCart}</Text>
              <Text style={styles.costValue}>{formatAgorot(cartFreeShippingGap)}</Text>
            </View>
          </View>
          <Text style={styles.costNote}>{copy.costCardNote}</Text>
        </View>

        <View style={styles.timerCard}>
          <View style={styles.timerHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>{order.closes_at ? copy.timerOrder : copy.noTimerOrder}</Text>
              <Text style={styles.timerValue}>
                {order.status === 'locked' ? copy.locked : order.closes_at ? timerLabel : copy.noTimer}
              </Text>
            </View>
            </View>
          <View style={styles.timerMetricRow}>
            <View style={styles.timerMetric}>
              <Text style={styles.timerMetricLabel}>{copy.shippingFee}</Text>
              <Text style={styles.timerMetricValue}>{formatAgorot(estimatedShipping)}</Text>
            </View>
            <View style={styles.timerMetric}>
              <Text style={styles.timerMetricLabel}>{copy.freeShippingMinimum}</Text>
              <Text style={styles.timerMetricValue}>{formatAgorot(freeShippingThreshold)}</Text>
            </View>
          </View>
          <Text style={styles.timerBody}>{order.closes_at ? copy.timerBody : copy.noTimerBody}</Text>
          <Text style={styles.timerNote}>
            {editLocked || order.status === 'locked' ? copy.editsLocked : copy.editsOpen}
          </Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>{copy.participants}</Text>
          <Text style={styles.sectionSub}>
            {isHebrew ? `${data.participants.length} משתתפים בהזמנה` : `${data.participants.length} participants in this order`}
          </Text>
          <View style={{ height: 14 }} />
          <ParticipantTower
            participants={data.participants}
            currentUserId={userId}
          />
        </View>

        <View style={styles.pickupCard}>
          <Text style={styles.kicker}>{copy.finderSummary}</Text>
          <Text style={styles.pickupBody}>{copy.whatItIs}: {order.product_title ?? copy.notDetected}</Text>
          <Text style={styles.pickupBody}>{copy.whereFrom}: {order.store_label ?? copy.detectedFromLink}</Text>
          <Text style={styles.pickupBody}>{copy.productPriceDetected}: {formatAgorot(order.product_price_agorot)}</Text>
          <Text style={styles.pickupBody}>{copy.estimatedShipping}: {formatAgorot(estimatedShipping)}</Text>
          <Text style={styles.pickupBody}>{copy.freeDeliveryNeeds}: {formatAgorot(freeShippingThreshold)}</Text>
          <Text style={styles.pickupBody}>{copy.approxEach}: {formatAgorot(perPerson)}</Text>
          <Text style={styles.pickupBody}>{copy.shippingSaved}: {formatAgorot(shippingSaved)}</Text>
          <Text style={styles.pickupBody}>{copy.missingParticipants}: {formatAgorot(freeShippingGap)}</Text>
          <Text style={styles.pickupBody}>{copy.missingCart}: {formatAgorot(cartFreeShippingGap)}</Text>
          <Text style={styles.pickupBody}>{copy.neighborsCanJoin}: {neighborsToInvite}</Text>
          <Text style={styles.pickupNote}>{copy.dealNote}</Text>
        </View>

        <View style={styles.cartHeader}>
          <View>
            <Text style={styles.sectionTitle}>{copy.fullCart}</Text>
            <Text style={styles.sectionSub}>
              {visibleCartItems.length} {copy.items} | {formatAgorot(cartTotal)}
            </Text>
          </View>
          <Pressable style={styles.cartToggle} onPress={() => setCartOpen((open) => !open)}>
            <Text style={styles.cartToggleText}>{cartOpen ? copy.hide : copy.show}</Text>
          </Pressable>
        </View>

        {cartOpen ? (
          <View style={styles.pickupCard}>
            {visibleCartItems.map((item, index) => (
              <View key={item.id} style={styles.cartItem}>
                <View style={styles.cartIndex}>
                  <Text style={styles.cartIndexText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemTitle}>{item.title}</Text>
                  <Text style={styles.cartItemMeta}>
                    {item.size ? `${copy.size}: ${item.size} | ` : ''}
                    {item.ref ? copy.productLinkSaved : copy.manualItem}
                  </Text>
                </View>
                <Text style={styles.cartItemPrice}>{formatAgorot(item.price_agorot)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.pickupCard}>
          <Text style={styles.kicker}>{copy.addProduct}</Text>
          <Text style={styles.pickupBody}>{copy.addProductBody}</Text>
          <Field label={copy.productName} value={itemTitle} onChange={setItemTitle} placeholder={copy.productPlaceholder} />
          <View style={styles.addRow}>
            <View style={{ flex: 1 }}>
              <NumField label={copy.price} value={itemPrice} onChange={setItemPrice} placeholder="99" />
            </View>
          </View>
          {detectedSizes.length > 0 ? (
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>{isHebrew ? 'בחר מידה' : 'Choose size'}</Text>
              <View style={styles.optionRow}>
                {detectedSizes.map((size) => {
                  const selected = itemSize === size;
                  return (
                    <Pressable
                      key={size}
                      accessibilityRole="button"
                      style={[styles.optionChip, selected && styles.optionChipActive]}
                      onPress={() => setItemSize(size)}
                    >
                      <Text style={[styles.optionChipText, selected && styles.optionChipTextActive]}>{size}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            <Field
              label={isHebrew ? 'מידה / גרסה (אם רלוונטי)' : 'Size / variant (if applicable)'}
              value={itemSize}
              onChange={setItemSize}
              placeholder={isHebrew ? 'M, Queen, 42, XL...' : 'M, Queen, 42, XL...'}
            />
          )}
          {detectedColors.length > 0 ? (
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>{isHebrew ? 'בחר צבע' : 'Choose color'}</Text>
              <View style={styles.optionRow}>
                {detectedColors.map((color) => {
                  const selected = itemColor === color;
                  return (
                    <Pressable
                      key={color}
                      accessibilityRole="button"
                      style={[styles.optionChip, selected && styles.optionChipActive]}
                      onPress={() => setItemColor(color)}
                    >
                      <Text style={[styles.optionChipText, selected && styles.optionChipTextActive]}>{color}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            <Field
              label={isHebrew ? 'צבע / הערה (אם רלוונטי)' : 'Color / note (if applicable)'}
              value={itemColor}
              onChange={setItemColor}
              placeholder={isHebrew ? 'שחור, עץ אלון, לבן...' : 'Black, oak wood, white...'}
            />
          )}
          {((detectedSizes.length > 0 && !itemSize.trim()) || (detectedColors.length > 0 && !itemColor.trim())) ? (
            <Text style={styles.requiredHint}>{isHebrew ? 'חובה לבחור מידה וצבע מהרשימה לפני הוספה לסל.' : 'Choose size and color from the list before adding to cart.'}</Text>
          ) : null}
          <Field label={copy.productLink} value={itemRef} onChange={setItemRef} placeholder="https://..." ltr />
          <PrimaryBtn
            label={
              editLocked || order.status === 'locked'
                ? copy.cartLocked
                : addItem.isPending
                  ? copy.adding
                  : copy.addToCart
            }
            onPress={() => {
              void onAddItem().catch((error) => {
                pushToast(error instanceof Error ? error.message : copy.couldNotAdd, 'error');
              });
            }}
            disabled={!canAddItem}
            loading={addItem.isPending}
          />
        </View>

        <View style={styles.pickupCard}>
          <Text style={styles.kicker}>{copy.pickupPlan}</Text>
          <Text style={styles.pickupTitle}>{order.pickup_responsible_name || copy.pickupManager}</Text>
          <Text style={styles.pickupBody}>
            {copy.preferredLocation}: {order.preferred_pickup_location || copy.creatorWillAdd}
          </Text>
          <Text style={styles.pickupNote}>
            {order.pickup_location_note || copy.pickupMayVary}
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          {order.status === 'locked' && order.creator_id === userId ? (
            <PrimaryBtn
              label={copy.founderCheckout}
              onPress={() => {
                void Linking.openURL(order.founder_checkout_url || order.product_url);
              }}
            />
          ) : order.status !== 'locked' ? (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.shareButton,
                !canShareOrder && styles.shareButtonDisabled,
                pressed && canShareOrder && { transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => {
                void onShareOrder();
              }}
              disabled={generateInvite.isPending}
            >
              <Text style={styles.shareButtonText}>
                {generateInvite.isPending ? '...' : canShareOrder ? actionCopy.shareAction : actionCopy.chooseBeforeShare}
              </Text>
            </Pressable>
          )}
          {!canShareOrder ? <Text style={styles.shareHint}>{actionCopy.shareHint}</Text> : null}
          {!order.closes_at && order.creator_id === userId && ['open', 'paying'].includes(order.status) ? (
            <SecondaryBtn
              label={closeOrder.isPending ? copy.closingOrder : copy.closeOrder}
              onPress={() => {
                void closeOrder.mutateAsync(order.id).catch((e: unknown) => {
                  pushToast(e instanceof Error ? e.message : copy.closingOrder, 'error');
                });
              }}
            />
          ) : null}
        </View>
      </ScrollView>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitle: { fontFamily: fontFamily.display, fontSize: 22, color: colors.tx },
  product: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderColor: colors.br,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
  },
  productImg: { width: 72, height: 72, borderRadius: radii.md },
  productPlaceholder: {
    backgroundColor: colors.s1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brBr,
  },
  placeholderText: { fontFamily: fontFamily.bodySemi, fontSize: 11, color: colors.tx, letterSpacing: 1.2 },
  productTitle: { fontFamily: fontFamily.bodySemi, fontSize: 15, color: colors.tx },
  productPrice: { fontFamily: fontFamily.body, fontSize: 13, color: colors.mu, marginTop: 4 },
  sectionTitle: { fontFamily: fontFamily.display, fontSize: 20, color: colors.tx },
  sectionSub: { fontFamily: fontFamily.body, fontSize: 13, color: colors.mu, marginTop: 4 },
  tower: { gap: 8 },
  slot: {
    backgroundColor: colors.s1,
    borderRadius: radii.md,
    borderColor: colors.brBr,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  slotFilled: {
    backgroundColor: colors.white,
    borderStyle: 'solid',
    borderColor: colors.brBr,
  },
  slotMe: { borderColor: colors.acc, backgroundColor: colors.accLight },
  slotText: { fontFamily: fontFamily.bodySemi, fontSize: 14, color: colors.tx },
  slotEmpty: { fontFamily: fontFamily.body, fontSize: 14, color: colors.mu },
  pickupCard: {
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.brBr,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
  },
  costCard: {
    gap: 12,
    padding: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.navy,
  },
  costKicker: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.s1,
    textTransform: 'uppercase',
  },
  costGrid: {
    gap: 10,
  },
  costItem: {
    gap: 6,
    padding: 14,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  costLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  costValue: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    color: colors.white,
  },
  costNote: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.78)',
  },
  kicker: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.acc,
    textTransform: 'uppercase',
  },
  pickupTitle: { fontFamily: fontFamily.display, fontSize: 20, color: colors.tx },
  pickupBody: { fontFamily: fontFamily.body, fontSize: 13, color: colors.mu, lineHeight: 20 },
  pickupNote: { fontFamily: fontFamily.bodySemi, fontSize: 12, color: colors.acc, lineHeight: 18 },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cartToggle: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.pill,
    backgroundColor: colors.accLight,
  },
  cartToggleText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: colors.acc,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.br,
  },
  cartIndex: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
  cartIndexText: { fontFamily: fontFamily.bodyBold, fontSize: 12, color: colors.white },
  cartItemTitle: { fontFamily: fontFamily.bodyBold, fontSize: 14, color: colors.tx },
  cartItemMeta: { fontFamily: fontFamily.body, fontSize: 12, color: colors.mu, marginTop: 3 },
  cartItemPrice: { fontFamily: fontFamily.bodyBold, fontSize: 13, color: colors.tx },
  addRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  optionGroup: {
    gap: 10,
  },
  optionLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.tx,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    minHeight: 42,
    minWidth: 58,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brBr,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  optionChipActive: {
    backgroundColor: colors.acc,
    borderColor: colors.acc,
  },
  optionChipText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.tx,
  },
  optionChipTextActive: {
    color: colors.white,
  },
  requiredHint: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    lineHeight: 18,
    color: colors.acc,
  },
  shareButton: {
    width: '100%',
    minHeight: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.acc,
  },
  shareButtonDisabled: {
    backgroundColor: colors.s1,
    borderColor: colors.brBr,
  },
  shareButtonText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 17,
    color: colors.navy,
  },
  shareHint: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    lineHeight: 18,
    color: colors.acc,
    textAlign: 'center',
  },
  loadErrorScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadErrorCard: {
    width: '100%',
    maxWidth: 420,
    gap: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.brBr,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
  },
  loadErrorTitle: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: colors.err,
    textAlign: 'center',
  },
  loadErrorBody: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.mu,
    textAlign: 'center',
  },
  timerCard: {
    gap: 8,
    padding: 18,
    borderRadius: radii.lg,
    backgroundColor: colors.navy,
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerChangeButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lime,
    borderWidth: 1,
    borderColor: colors.acc,
  },
  timerChangeText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.navy,
  },
  timerValue: {
    fontFamily: fontFamily.display,
    fontSize: 36,
    color: colors.white,
  },
  timerMetricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timerMetric: {
    flex: 1,
    gap: 4,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  timerMetricLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.68)',
  },
  timerMetricValue: {
    fontFamily: fontFamily.display,
    fontSize: 18,
    color: colors.white,
  },
  timerBody: { fontFamily: fontFamily.body, fontSize: 13, color: 'rgba(255,255,255,0.86)', lineHeight: 20 },
  timerNote: { fontFamily: fontFamily.bodySemi, fontSize: 12, color: colors.s1, lineHeight: 18 },
});
