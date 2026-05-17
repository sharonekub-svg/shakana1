import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { Field } from '@/components/primitives/Field';
import { NumField } from '@/components/primitives/NumField';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useAddOrderItem, useCloseOrder, useOrder } from '@/api/orders';
import { useGenerateInvite } from '@/api/invites';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { Sentry } from '@/lib/sentry';
import { formatAgorot } from '@/utils/format';
import { formatCompactDuration } from '@/utils/timer';
import { useLocale } from '@/i18n/locale';
import { buildInviteUrl } from '@/lib/deeplinks';
import { loadSharedProductInsights, parseSharedProduct, type SharedProductInsights } from '@/lib/sharedProduct';
import { fetchProductPageHtml } from '@/api/productInsights';

const DEFAULT_DELIVERY_FEE_AGOROT = 3000;
const DEFAULT_FREE_SHIPPING_THRESHOLD_AGOROT = 19900;

const AVATAR_COLORS = ['#C5654B', '#D29A4A', '#7A5B43', '#B8956A', '#8B6E5A'];

function WaIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.52 3.48A11.93 11.93 0 0012 0C5.37 0 0 5.37 0 12c0 2.12.55 4.1 1.5 5.84L0 24l6.34-1.66A11.94 11.94 0 0012 24c6.63 0 12-5.37 12-12 0-3.21-1.25-6.23-3.48-8.52z"
        fill="#25D366"
      />
      <Path
        d="M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17c-.17.2-.35.22-.65.07a8.18 8.18 0 01-2.4-1.48 9.03 9.03 0 01-1.66-2.07c-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.03 1-1.03 2.45s1.05 2.84 1.2 3.04c.15.2 2.07 3.16 5.01 4.43.7.3 1.25.48 1.67.62.7.22 1.34.19 1.84.11.56-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"
        fill="#fff"
      />
    </Svg>
  );
}

export default function OrderShell() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { language } = useLocale();
  const isHebrew = language === 'he';
  const userId = useAuthStore((s) => s.user?.id);
  const pushToast = useUiStore((s) => s.pushToast);
  const { data, isLoading, error } = useOrder(id);
  const closeOrder = useCloseOrder();
  const addItem = useAddOrderItem();
  const generateInvite = useGenerateInvite();
  const [now, setNow] = useState(Date.now());
  const [itemTitle, setItemTitle] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemSize, setItemSize] = useState('');
  const [itemColor, setItemColor] = useState('');
  const [itemRef, setItemRef] = useState('');
  const [detectedSizes, setDetectedSizes] = useState<string[]>([]);
  const [detectedColors, setDetectedColors] = useState<string[]>([]);
  const [itemInsights, setItemInsights] = useState<SharedProductInsights | null>(null);
  const [itemInsightsLoading, setItemInsightsLoading] = useState(false);
  const [itemStoreError, setItemStoreError] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const order = data?.order;
  const me = data?.participants.find((p) => p.user_id === userId);
  const participantCount = data?.participants.length ?? 0;
  const cartItems = data?.items ?? [];
  const myItems = cartItems.filter((item) => item.participant_id === me?.id);
  const neighborItems = cartItems.filter((item) => item.participant_id !== me?.id);

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
    const draft = parseSharedProduct({ url: order.product_url, title: order.product_title, manualStoreLabel: order.store_label });
    if (!draft) return;
    let active = true;
    void loadSharedProductInsights(draft, fetchProductPageHtml)
      .then((insights) => {
        if (!active) return;
        setDetectedSizes(insights.availableSizes);
        setDetectedColors(insights.availableColors);
      })
      .catch(() => { if (!active) return; setDetectedSizes([]); setDetectedColors([]); });
    return () => { active = false; };
  }, [order?.product_title, order?.product_url, order?.store_label]);

  useEffect(() => {
    const draft = parseSharedProduct({ url: itemRef, title: itemTitle, manualStoreLabel: order?.store_label });
    if (!draft || !order) { setItemStoreError(''); setItemInsights(null); return; }
    const sameStore = !order.store_key || order.store_key === 'manual' || draft.source === order.store_key;
    if (!sameStore) { setItemStoreError(isHebrew ? 'הלינק חייב להיות מאותה חנות.' : 'The link must be from the same store.'); setItemInsights(null); setDetectedSizes([]); setDetectedColors([]); return; }
    let active = true;
    setItemStoreError('');
    setItemInsightsLoading(true);
    void loadSharedProductInsights(draft, fetchProductPageHtml)
      .then((insights) => {
        if (!active) return;
        setItemInsights(insights);
        setDetectedSizes(insights.availableSizes);
        setDetectedColors(insights.availableColors);
        setItemTitle((prev) => prev.trim() ? prev : insights.title);
        if (insights.priceAgorot) setItemPrice((insights.priceAgorot / 100).toFixed(2).replace(/\.00$/, ''));
      })
      .catch(() => { if (!active) return; setItemInsights(null); })
      .finally(() => { if (active) setItemInsightsLoading(false); });
    return () => { active = false; };
  }, [isHebrew, itemRef, order?.store_key, order?.store_label]);

  useEffect(() => {
    if (!order?.closes_at || !['open', 'paying'].includes(order.status) || closeOrder.isPending) return;
    if (new Date(order.closes_at).getTime() <= now) {
      void closeOrder.mutateAsync(order.id).catch((err) => Sentry.captureException(err));
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
      <ScreenBase style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={styles.errorTitle}>{isHebrew ? 'לא הצלחנו לטעון את ההזמנה.' : 'Unable to load order.'}</Text>
        <Pressable onPress={() => router.replace('/(tabs)/orders')} style={styles.errorBtn}>
          <Text style={styles.errorBtnText}>{isHebrew ? 'חזרה להזמנות' : 'Back to orders'}</Text>
        </Pressable>
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
      : order.product_price_agorot >= freeShippingThreshold ? 0 : DEFAULT_DELIVERY_FEE_AGOROT;
  const shippingSaved = Math.max(0, estimatedShipping * Math.max(0, participantCount - 1));
  const closesAtMs = order.closes_at ? new Date(order.closes_at).getTime() : null;
  const editLocksAtMs = order.edit_locks_at ? new Date(order.edit_locks_at).getTime() : null;
  const remainingMs = closesAtMs ? Math.max(0, closesAtMs - now) : null;
  const editLocked = Boolean(editLocksAtMs && editLocksAtMs <= now);
  const timerLabel = remainingMs == null ? (isHebrew ? 'ללא טיימר' : 'No timer') : formatCompactDuration(remainingMs);

  const sizeOptions = detectedSizes;
  const colorOptions = detectedColors;
  const requiresSize = sizeOptions.length > 0;
  const requiresColor = colorOptions.length > 0;
  const hasSelectedOptions = (!requiresSize || itemSize.trim().length > 0) && (!requiresColor || itemColor.trim().length > 0);
  const hasSavedOptions = cartItems.some((item) => Boolean(item.size?.trim()));
  const needsAnyOptions = requiresSize || requiresColor;
  const canShareOrder = hasSavedOptions || !needsAnyOptions || hasSelectedOptions;
  const itemPriceAgorot = Math.floor(Number(itemPrice) * 100);
  const canAddItem =
    Boolean(me?.id) && !editLocked && ['open', 'paying'].includes(order.status) &&
    itemTitle.trim().length > 1 && (!requiresSize || itemSize.trim().length > 0) &&
    (!requiresColor || itemColor.trim().length > 0) && !itemStoreError &&
    Number.isFinite(itemPriceAgorot) && itemPriceAgorot > 0;

  const onAddItem = async () => {
    if (!me?.id || !canAddItem) return;
    await addItem.mutateAsync({
      orderId: order.id, participantId: me.id, title: itemTitle, ref: itemRef,
      size: [
        itemSize.trim() ? `${isHebrew ? 'מידה' : 'Size'}: ${itemSize.trim()}` : null,
        itemColor.trim() ? `${isHebrew ? 'צבע' : 'Color'}: ${itemColor.trim()}` : null,
      ].filter(Boolean).join(' | ') || null,
      priceAgorot: itemPriceAgorot,
    });
    setItemTitle(''); setItemPrice(''); setItemSize(''); setItemColor(''); setItemRef('');
    setAddOpen(false);
    pushToast(isHebrew ? 'המוצר נוסף לסל המשותף.' : 'Product added to the shared cart.', 'success');
  };

  const onShareOrder = async () => {
    if (!canShareOrder) { pushToast(isHebrew ? 'בחר מידה וצבע לפני שיתוף' : 'Choose size and color before sharing', 'error'); return; }
    try {
      const invite = await generateInvite.mutateAsync(order.id);
      const inviteUrl = buildInviteUrl(invite.token);
      const cartTotal = cartItems.reduce((s, i) => s + i.price_agorot, 0);
      const cartFreeShippingGap = Math.max(0, freeShippingThreshold - cartTotal);
      const message = isHebrew
        ? `פתחתי הזמנה ב-Shakana: ${order.product_title ?? order.product_url}. דמי משלוח: ${formatAgorot(estimatedShipping)}. חסר למשלוח חינם: ${formatAgorot(cartFreeShippingGap)}. ${inviteUrl}`
        : `I opened a Shakana order: ${order.product_title ?? order.product_url}. Delivery: ${formatAgorot(estimatedShipping)}. Missing for free ship.: ${formatAgorot(cartFreeShippingGap)}. ${inviteUrl}`;
      await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : isHebrew ? 'לא הצלחנו לפתוח שיתוף.' : 'Could not open sharing.', 'error');
    }
  };

  const statusLabel = me?.status === 'paid' ? (isHebrew ? 'שולם' : 'PAID') : (isHebrew ? 'הצטרפת' : 'JOINED');

  return (
    <ScreenBase padded={false} safeEdges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <Text style={styles.headerKicker}>SHAKANA</Text>
        {me ? (
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{statusLabel}</Text>
          </View>
        ) : <View style={{ width: 56 }} />}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Order title + meta */}
        <View style={styles.titleBlock}>
          <Text style={styles.orderTitle} numberOfLines={2}>
            {order.product_title ?? (isHebrew ? 'הזמנה' : 'Order')}
          </Text>
          <View style={styles.metaRow}>
            {order.store_label ? (
              <View style={styles.storePill}>
                <Text style={styles.storePillText}>{order.store_label.toUpperCase()}</Text>
              </View>
            ) : null}
            <View style={styles.timerPill}>
              <Text style={styles.timerPillText}>
                {order.status === 'locked' ? (isHebrew ? 'נעול' : 'LOCKED') : timerLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Savings hero */}
        <View style={styles.savingsHero}>
          <View style={styles.savingsHeroLeft}>
            <Text style={styles.savingsHeroKicker}>{isHebrew ? 'חיסכון משלוח יחד' : 'Shipping saved together'}</Text>
            <Text style={styles.savingsHeroAmount}>{formatAgorot(shippingSaved)}</Text>
          </View>
          <View style={styles.savingsHeroRight}>
            <View style={styles.neighborAvatarRow}>
              {data.participants.slice(0, 4).map((p, i) => (
                <View key={p.id} style={[styles.neighborAvatar, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length], marginLeft: i > 0 ? -10 : 0 }]}>
                  <Text style={styles.neighborAvatarText}>{(p.user_id ?? '?').slice(0, 1).toUpperCase()}</Text>
                </View>
              ))}
              {participantCount > 4 ? (
                <View style={[styles.neighborAvatar, { backgroundColor: colors.mu2, marginLeft: -10 }]}>
                  <Text style={styles.neighborAvatarText}>+{participantCount - 4}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.savingsHeroNeighbors}>
              {participantCount} {isHebrew ? 'שכנים' : 'neighbors'}
            </Text>
          </View>
        </View>

        {/* Your items */}
        <Text style={styles.sectionTitle}>{isHebrew ? 'הפריטים שלך' : 'YOUR ITEMS'}</Text>
        {myItems.length === 0 ? (
          <View style={styles.emptyItemsCard}>
            <Text style={styles.emptyItemsText}>
              {isHebrew ? 'עוד לא הוספת פריטים' : 'No items added yet'}
            </Text>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {myItems.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={[styles.itemColorDot, { backgroundColor: colors.acc }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.title}</Text>
                  {item.size ? <Text style={styles.itemMeta}>{item.size}</Text> : null}
                </View>
                <View style={styles.privateBadge}>
                  <Text style={styles.privateBadgeText}>{isHebrew ? 'פרטי' : 'PRIVATE'}</Text>
                </View>
                <Text style={styles.itemPrice}>{formatAgorot(item.price_agorot)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Neighbors' items */}
        <Text style={styles.sectionTitle}>{isHebrew ? 'פריטי השכנים' : 'NEIGHBORS\' ITEMS'}</Text>
        <View style={styles.neighborsCard}>
          <View style={styles.neighborsCardRow}>
            <View style={styles.neighborAvatarRowSmall}>
              {data.participants.filter((p) => p.user_id !== userId).slice(0, 4).map((p, i) => (
                <View key={p.id} style={[styles.neighborAvatarSm, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length], marginLeft: i > 0 ? -8 : 0 }]}>
                  <Text style={styles.neighborAvatarSmText}>{(p.user_id ?? '?').slice(0, 1).toUpperCase()}</Text>
                </View>
              ))}
            </View>
            <View>
              <Text style={styles.neighborsCount}>{Math.max(0, participantCount - (me ? 1 : 0))} {isHebrew ? 'שכנים' : 'neighbors'}</Text>
              <Text style={styles.neighborsMeta}>{neighborItems.length} {isHebrew ? 'פריטים' : 'items'}</Text>
            </View>
          </View>
          <Text style={styles.neighborsPrivacyNote}>
            {isHebrew ? 'פרטי הפריטים של השכנים מוסתרים לפרטיות' : 'Neighbors\' item details are hidden for privacy'}
          </Text>
        </View>

        {/* Add item form */}
        {['open', 'paying'].includes(order.status) && me ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setAddOpen((o) => !o)}
            style={styles.addItemToggle}
          >
            <Text style={styles.addItemToggleText}>
              {addOpen ? (isHebrew ? 'סגור' : 'Close') : (isHebrew ? '+ הוסף פריט' : '+ Add item')}
            </Text>
          </Pressable>
        ) : null}

        {addOpen && me && (
          <View style={styles.addCard}>
            <Text style={styles.addCardTitle}>{isHebrew ? 'הוסף את הפריט שלך' : 'Add your item'}</Text>
            <Field label={isHebrew ? 'קישור מוצר' : 'Product link'} value={itemRef} onChange={setItemRef} placeholder="https://..." ltr />
            {itemInsightsLoading ? <Text style={styles.hintText}>{isHebrew ? 'קורא את הלינק...' : 'Reading link...'}</Text> : null}
            {itemStoreError ? <Text style={styles.errorText}>{itemStoreError}</Text> : null}
            {itemInsights ? (
              <View style={styles.detectedCard}>
                <Text style={styles.detectedStore}>{itemInsights.sourceLabel}</Text>
                <Text style={styles.detectedTitle}>{itemInsights.title}</Text>
              </View>
            ) : null}
            <Field label={isHebrew ? 'שם מוצר' : 'Product name'} value={itemTitle} onChange={setItemTitle} placeholder={isHebrew ? 'חולצה מזארה...' : 'Zara shirt...'} />
            <NumField label={isHebrew ? 'מחיר' : 'Price'} value={itemPrice} onChange={setItemPrice} placeholder="99" />
            {requiresSize ? (
              <View style={styles.optionGroup}>
                <Text style={styles.optionLabel}>{isHebrew ? 'בחר מידה' : 'Choose size'}</Text>
                <View style={styles.optionRow}>
                  {sizeOptions.map((size) => (
                    <Pressable key={size} accessibilityRole="button" onPress={() => setItemSize(size)}
                      style={[styles.optionChip, itemSize === size && styles.optionChipActive]}>
                      <Text style={[styles.optionChipText, itemSize === size && styles.optionChipTextActive]}>{size}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <Field label={isHebrew ? 'מידה / גרסה' : 'Size / variant'} value={itemSize} onChange={setItemSize} placeholder="M, XL, 42..." />
            )}
            {requiresColor ? (
              <View style={styles.optionGroup}>
                <Text style={styles.optionLabel}>{isHebrew ? 'בחר צבע' : 'Choose color'}</Text>
                <View style={styles.optionRow}>
                  {colorOptions.map((color) => (
                    <Pressable key={color} accessibilityRole="button" onPress={() => setItemColor(color)}
                      style={[styles.optionChip, itemColor === color && styles.optionChipActive]}>
                      <Text style={[styles.optionChipText, itemColor === color && styles.optionChipTextActive]}>{color}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <Field label={isHebrew ? 'צבע / הערה' : 'Color / note'} value={itemColor} onChange={setItemColor} placeholder={isHebrew ? 'שחור, לבן...' : 'Black, white...'} />
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => void onAddItem().catch((e) => pushToast(e instanceof Error ? e.message : 'Error', 'error'))}
              style={[styles.addBtn, !canAddItem && styles.addBtnDisabled]}
              disabled={!canAddItem || addItem.isPending}
            >
              <Text style={styles.addBtnText}>
                {addItem.isPending ? (isHebrew ? 'מוסיף...' : 'Adding...') : (editLocked ? (isHebrew ? 'הסל ננעל' : 'Cart locked') : (isHebrew ? 'הוסף לסל' : 'Add to cart'))}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Share / Invite */}
        <View style={styles.inviteCard}>
          <View style={styles.inviteCardTop}>
            <Rect x={0} y={0} width={0} height={0} />
            <View style={styles.qrPlaceholder}>
              <Svg width={56} height={56} viewBox="0 0 56 56" fill="none">
                <Rect x={4} y={4} width={20} height={20} rx={3} stroke={colors.tx} strokeWidth={2.5} />
                <Rect x={32} y={4} width={20} height={20} rx={3} stroke={colors.tx} strokeWidth={2.5} />
                <Rect x={4} y={32} width={20} height={20} rx={3} stroke={colors.tx} strokeWidth={2.5} />
                <Rect x={9} y={9} width={10} height={10} rx={1} fill={colors.tx} />
                <Rect x={37} y={9} width={10} height={10} rx={1} fill={colors.tx} />
                <Rect x={9} y={37} width={10} height={10} rx={1} fill={colors.tx} />
                <Path d="M32 32h6v6h-6zM40 32h6v6h-6zM32 40h6v6h-6zM40 40h6v6h-6z" fill={colors.tx} />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inviteTitle}>{isHebrew ? 'הזמן שכנים' : 'Invite neighbors'}</Text>
              <Text style={styles.inviteBody}>
                {isHebrew ? `${Math.max(0, 5 - participantCount)} שכנים נוספים למשלוח חינם` : `${Math.max(0, 5 - participantCount)} more neighbors for free shipping`}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => void onShareOrder()}
            disabled={generateInvite.isPending}
            style={({ pressed }) => [styles.waBtn, pressed && { opacity: 0.9 }]}
          >
            <WaIcon />
            <Text style={styles.waBtnText}>
              {generateInvite.isPending ? '...' : (isHebrew ? 'שתף ב-WhatsApp' : 'Invite via WhatsApp')}
            </Text>
          </Pressable>
        </View>

        {/* Close order (creator only, no timer) */}
        {!order.closes_at && order.creator_id === userId && ['open', 'paying'].includes(order.status) ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void closeOrder.mutateAsync(order.id).catch((e: unknown) => pushToast(e instanceof Error ? e.message : 'Error', 'error'))}
            style={styles.closeBtn}
          >
            <Text style={styles.closeBtnText}>
              {closeOrder.isPending ? (isHebrew ? 'סוגר...' : 'Closing...') : (isHebrew ? 'סגור הזמנה' : 'Close order')}
            </Text>
          </Pressable>
        ) : null}

        {/* Checkout (founder, locked) */}
        {order.status === 'locked' && order.creator_id === userId ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void Linking.openURL(order.founder_checkout_url || order.product_url)}
            style={styles.checkoutBtn}
          >
            <Text style={styles.checkoutBtnText}>{isHebrew ? 'פתח Checkout למייסד' : 'Open founder checkout'}</Text>
          </Pressable>
        ) : null}

      </ScrollView>
    </ScreenBase>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerKicker: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 2.4,
    color: colors.acc,
  },
  statusBadge: {
    backgroundColor: colors.accLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  statusBadgeText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.acc,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 48,
    gap: 16,
  },
  titleBlock: {
    gap: 10,
    paddingTop: 4,
  },
  orderTitle: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    color: colors.tx,
    lineHeight: 34,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  storePill: {
    backgroundColor: colors.s2,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  storePillText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.mu,
  },
  timerPill: {
    backgroundColor: colors.accLight,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  timerPillText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.acc,
  },
  savingsHero: {
    backgroundColor: colors.navy,
    borderRadius: 26,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow.cta,
  },
  savingsHeroLeft: { gap: 6 },
  savingsHeroKicker: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: 'rgba(250,246,239,0.65)',
    textTransform: 'uppercase',
  },
  savingsHeroAmount: {
    fontFamily: fontFamily.display,
    fontSize: 36,
    color: colors.white,
  },
  savingsHeroRight: { alignItems: 'flex-end', gap: 8 },
  neighborAvatarRow: { flexDirection: 'row', alignItems: 'center' },
  neighborAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.navy,
  },
  neighborAvatarText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 13,
    color: colors.white,
  },
  savingsHeroNeighbors: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: 'rgba(250,246,239,0.72)',
  },
  sectionTitle: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.mu,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  emptyItemsCard: {
    backgroundColor: colors.s1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.br,
    padding: 20,
    alignItems: 'center',
  },
  emptyItemsText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.mu2,
  },
  itemsList: { gap: 10 },
  itemCard: {
    backgroundColor: colors.s1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.br,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadow.card,
  },
  itemColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  itemName: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: colors.tx,
  },
  itemMeta: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mu,
    marginTop: 2,
  },
  privateBadge: {
    backgroundColor: colors.s2,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  privateBadgeText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.mu,
  },
  itemPrice: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.tx,
  },
  neighborsCard: {
    backgroundColor: colors.s1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.br,
    padding: 18,
    gap: 12,
    ...shadow.card,
  },
  neighborsCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  neighborAvatarRowSmall: { flexDirection: 'row', alignItems: 'center' },
  neighborAvatarSm: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  neighborAvatarSmText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    color: colors.white,
  },
  neighborsCount: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    color: colors.tx,
  },
  neighborsMeta: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.mu,
    marginTop: 2,
  },
  neighborsPrivacyNote: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mu2,
    lineHeight: 18,
  },
  addItemToggle: {
    backgroundColor: colors.accLight,
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  addItemToggleText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.acc,
  },
  addCard: {
    backgroundColor: colors.s1,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.br,
    padding: 18,
    gap: 12,
    ...shadow.card,
  },
  addCardTitle: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: colors.tx,
    marginBottom: 4,
  },
  hintText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.mu,
  },
  errorText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    color: colors.err,
  },
  detectedCard: {
    backgroundColor: colors.accLight,
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  detectedStore: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.acc,
    textTransform: 'uppercase',
  },
  detectedTitle: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    color: colors.tx,
  },
  optionGroup: { gap: 8 },
  optionLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: colors.mu,
    letterSpacing: 0.6,
  },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.br,
    backgroundColor: colors.s1,
  },
  optionChipActive: { backgroundColor: colors.tx, borderColor: colors.tx },
  optionChipText: { fontFamily: fontFamily.bodySemi, fontSize: 13, color: colors.mu },
  optionChipTextActive: { color: colors.white },
  addBtn: {
    backgroundColor: colors.acc,
    borderRadius: radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    ...shadow.cta,
  },
  addBtnDisabled: { backgroundColor: colors.br },
  addBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: colors.white,
    letterSpacing: 0.4,
  },
  inviteCard: {
    backgroundColor: colors.s1,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.br,
    padding: 18,
    gap: 14,
    ...shadow.card,
  },
  inviteCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  qrPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.br,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTitle: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: colors.tx,
  },
  inviteBody: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.mu,
    marginTop: 4,
    lineHeight: 19,
  },
  waBtn: {
    backgroundColor: '#25D366',
    borderRadius: radii.pill,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...shadow.cta,
  },
  waBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: colors.white,
    letterSpacing: 0.4,
  },
  closeBtn: {
    borderWidth: 1,
    borderColor: colors.br,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.mu,
  },
  checkoutBtn: {
    backgroundColor: colors.navy,
    borderRadius: radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadow.cta,
  },
  checkoutBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: colors.white,
    letterSpacing: 0.4,
  },
  errorTitle: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: colors.tx,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorBtn: {
    backgroundColor: colors.acc,
    borderRadius: radii.pill,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  errorBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.white,
  },
  cartCard: {
    backgroundColor: colors.s1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.br,
    padding: 16,
    gap: 0,
  },
  cartTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.br,
  },
  cartTotalLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.tx,
  },
  cartTotalValue: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 14,
    color: colors.tx,
  },
});
