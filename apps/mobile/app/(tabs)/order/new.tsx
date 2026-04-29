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
const CATEGORIES = ['Fashion', 'Beauty', 'Home', 'Kids', 'Electronics', 'Grocery'];
const TIMER_UNITS = ['minutes', 'hours', 'days'] as const;

export default function NewOrder() {
  const router = useRouter();
  const params = useLocalSearchParams<NewOrderParams>();
  const { t } = useLocale();
  const initialDraft = parseSharedProduct({
    url: typeof params.url === 'string' ? params.url : null,
    title: typeof params.title === 'string' ? params.title : null,
    manualStoreLabel: typeof params.store === 'string' ? params.store : null,
  });
  const isZaraStart = params.store === 'zara' || initialDraft?.source === 'zara';
  const [url, setUrl] = useState(() => initialDraft?.url ?? '');
  const [storeLabel, setStoreLabel] = useState(() => initialDraft?.storeLabel ?? '');
  const [title, setTitle] = useState(() => initialDraft?.title ?? '');
  const [price, setPrice] = useState('');
  const [participants, setParticipants] = useState('3');
  const [timerValue, setTimerValue] = useState('30');
  const [timerUnit, setTimerUnit] = useState<(typeof TIMER_UNITS)[number]>('minutes');
  const [shipping, setShipping] = useState('30');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('199');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [cartOpen, setCartOpen] = useState(false);
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
    setLinkMessage('Find the product, copy its page link, then come back here.');
  };

  const useCopiedLink = async () => {
    const copied = await Clipboard.getStringAsync();
    const draft = parseSharedProduct({ url: copied, text: copied });
    if (!draft) {
      setLinkMessage('No Zara or H&M product link found in the copied text.');
      return;
    }
    setUrl(draft.url);
    setStoreLabel(draft.storeLabel);
    setTitle((prev) => prev || draft.title);
    setLinkMessage('Product link added.');
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
            <Text style={styles.guideTitle}>Find a product, then use the copied link.</Text>
            <Text style={styles.guideBody}>
              Open Zara, go to the exact product, copy the page link, then come back and tap Use copied link.
            </Text>
            <View style={styles.actions}>
              <Pressable style={styles.primarySmall} onPress={openZara}>
                <Text style={styles.primarySmallText}>Open Zara</Text>
              </Pressable>
              <Pressable style={styles.secondarySmall} onPress={useCopiedLink}>
                <Text style={styles.secondarySmallText}>Use copied link</Text>
              </Pressable>
            </View>
            {linkMessage ? <Text style={styles.noteText}>{linkMessage}</Text> : null}
          </View>
        ) : null}

        <View style={styles.formCard}>
          <Field
            label={t('order.new.urlLabel')}
            value={url}
            onChange={setUrl}
            placeholder="https://..."
            ltr
            keyboardType="url"
            autoCapitalize="none"
          />
          <Field label="Store" value={storeLabel} onChange={setStoreLabel} placeholder="Zara, H&M, Amazon..." />
          <Field label={t('order.new.titleLabel')} value={title} onChange={setTitle} placeholder="Zara shirt" />
          <NumField label={t('order.new.priceLabel')} value={price} onChange={setPrice} placeholder="199" />
          <View style={styles.categoryBlock}>
            <Text style={styles.fieldCaption}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {CATEGORIES.map((item) => (
                <Pressable
                  key={item}
                  style={[styles.categoryChip, category === item && styles.categoryChipActive]}
                  onPress={() => setCategory(item)}
                >
                  <Text style={[styles.categoryChipText, category === item && styles.categoryChipTextActive]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={styles.timerPickRow}>
            <View style={{ flex: 1 }}>
              <NumField label="Timer" value={timerValue} onChange={setTimerValue} placeholder="30" />
            </View>
            <View style={styles.timerUnitWrap}>
              {TIMER_UNITS.map((unit) => (
                <Pressable
                  key={unit}
                  style={[styles.unitChip, timerUnit === unit && styles.unitChipActive]}
                  onPress={() => setTimerUnit(unit)}
                >
                  <Text style={[styles.unitChipText, timerUnit === unit && styles.unitChipTextActive]}>
                    {unit === 'minutes' ? 'min' : unit === 'hours' ? 'hr' : 'day'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <NumField label="Max participants" value={participants} onChange={setParticipants} placeholder="3" />
          <NumField label="Estimated shipping" value={shipping} onChange={setShipping} placeholder="30" />
          <NumField
            label="Free shipping from"
            value={freeShippingThreshold}
            onChange={setFreeShippingThreshold}
            placeholder="199"
          />
        </View>

        <View style={styles.productCard}>
          <View style={styles.productCopy}>
            <Text style={styles.kicker}>Product</Text>
            <Text style={styles.productTitle} numberOfLines={2}>
              {insights?.title || title || 'Paste a product link'}
            </Text>
            <Text style={styles.productBody}>
              {insightsLoading
                ? 'Reading the product page...'
                : insights?.promotionText
                  ? `Deal: ${insights.promotionText}`
                  : 'Simple order, no extra clutter.'}
            </Text>
            {insightsLoading ? <ActivityIndicator color={colors.acc} /> : null}
          </View>
          {insights?.imageUrl ? <Image source={{ uri: insights.imageUrl }} style={styles.productImage} /> : null}
        </View>

        <View style={styles.planCard}>
          <Text style={styles.planTitle}>Timer-based order plan</Text>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>Timer closes in</Text>
            <Text style={styles.planValue}>{timerLabel}</Text>
          </View>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>Estimated shipping</Text>
            <Text style={styles.planValue}>{formatAgorot(deliveryFeeAgorot)}</Text>
          </View>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>Participants</Text>
            <Text style={styles.planValue}>up to {participantCount}</Text>
          </View>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>Shipping saved together</Text>
            <Text style={styles.planValue}>{formatAgorot(shippingSavedAgorot)}</Text>
          </View>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>Approx. each</Text>
            <Text style={styles.planValue}>{formatAgorot(perPersonAgorot)}</Text>
          </View>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>Shared order missing for free shipping</Text>
            <Text style={styles.planValue}>{formatAgorot(freeShippingGapAgorot)}</Text>
          </View>
        </View>

        <Pressable style={styles.drawerHandle} onPress={() => setCartOpen((open) => !open)}>
          <Text style={styles.drawerHandleText}>{cartOpen ? 'Hide cart drawer' : 'Show cart drawer'}</Text>
          <Text style={styles.drawerCount}>1 item</Text>
        </Pressable>

        {cartOpen ? (
          <View style={styles.cartDrawer}>
            <Text style={styles.kicker}>Shopping cart</Text>
            <Text style={styles.cartTitle}>{title || 'Manual product'}</Text>
            <Text style={styles.cartLine}>Store: {storeLabel || 'Choose store'}</Text>
            <Text style={styles.cartLine}>Category: {category}</Text>
            <Text style={styles.cartLine}>Product price: {formatAgorot(priceAgorot)}</Text>
            <Text style={styles.cartLine}>Shipping estimate: {formatAgorot(deliveryFeeAgorot)}</Text>
            <Text style={styles.cartHint}>This drawer keeps browsing clean while still showing what will be ordered.</Text>
          </View>
        ) : null}

        <View style={styles.pickupCard}>
          <Text style={styles.kicker}>Pickup</Text>
          <Text style={styles.pickupTitle}>Pickup manager: you</Text>
          <Text style={styles.pickupBody}>
            Choose the preferred pickup point before creating the order. Everyone will see it, and it can be
            updated later by the order creator or pickup manager.
          </Text>
          <Field
            label="Preferred pickup location"
            value={pickupLocation}
            onChange={setPickupLocation}
            placeholder="Building lobby, Zara pickup point, or your apartment"
          />
          <Text style={styles.uncertainText}>
            Pickup location may vary depending on the store/shipping provider
          </Text>
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
