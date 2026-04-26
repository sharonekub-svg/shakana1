import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

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
import { useLocale } from '@/i18n/locale';
import {
  loadSharedProductInsights,
  parseSharedProduct,
  type SharedProductInsights,
} from '@/lib/sharedProduct';
import { formatAgorot } from '@/utils/format';

type NewOrderParams = {
  url?: string;
  title?: string;
  source?: string;
};

export default function NewOrder() {
  const router = useRouter();
  const params = useLocalSearchParams<NewOrderParams>();
  const { t, language } = useLocale();
  const sharedDraft = parseSharedProduct({
    url: typeof params.url === 'string' ? params.url : null,
    title: typeof params.title === 'string' ? params.title : null,
  });
  const [url, setUrl] = useState(() => sharedDraft?.url ?? '');
  const [title, setTitle] = useState(() => sharedDraft?.title ?? '');
  const [price, setPrice] = useState('');
  const [insights, setInsights] = useState<SharedProductInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(Boolean(sharedDraft));
  const create = useCreateOrder();
  const pushToast = useUiStore((s) => s.pushToast);

  const urlCheck = productUrlSchema.safeParse(url);
  const parsedPriceAgorot = Math.floor(Number(price) * 100);
  const priceAgorot = Number.isFinite(parsedPriceAgorot) && parsedPriceAgorot > 0 ? parsedPriceAgorot : insights?.priceAgorot ?? 0;
  const participantCount = insights?.recommendedParticipants ?? 3;
  const neighborsNeeded = insights?.neighborsNeeded ?? Math.max(1, participantCount - 1);
  const deliveryFeeAgorot = insights?.deliveryFeeAgorot ?? 3000;
  const freeShippingThresholdAgorot = insights?.freeShippingThresholdAgorot ?? 19900;
  const freeShippingGapAgorot = Math.max(0, freeShippingThresholdAgorot - priceAgorot);
  const perPersonAgorot = insights?.perPersonAgorot ?? Math.ceil((priceAgorot + deliveryFeeAgorot) / participantCount);
  const valid = urlCheck.success && title.trim().length > 1 && priceAgorot > 0;

  useEffect(() => {
    if (!sharedDraft) {
      setInsights(null);
      setInsightsLoading(false);
      return;
    }

    let active = true;
    setInsightsLoading(true);

    void loadSharedProductInsights(sharedDraft)
      .then((next) => {
        if (!active) return;
        setInsights(next);
        if (!title.trim()) {
          setTitle(next.title);
        }
        if (!price.trim() && next.priceAgorot) {
          setPrice((next.priceAgorot / 100).toFixed(2).replace(/\.00$/, ''));
        }
      })
      .catch(() => {
        if (!active) return;
        setInsights(null);
      })
      .finally(() => {
        if (!active) return;
        setInsightsLoading(false);
      });

    return () => {
      active = false;
    };
    // We only want to re-run when the shared URL itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedDraft?.url]);

  const submit = async () => {
    if (!valid || create.isPending) return;
    try {
      const order = await create.mutateAsync({
        productUrl: url.trim(),
        productTitle: title.trim(),
        productPriceAgorot: priceAgorot,
        maxParticipants: participantCount,
      });
      router.replace(`/order/${order.id}`);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : t('order.new.error'), 'error');
    }
  };

  const copy = language === 'he'
    ? {
        product: 'מוצר מזוהה',
        detected: 'זיהוי אוטומטי',
        shipping: 'משלוח',
        homeDelivery: 'משלוח לכתובת',
        storePickup: 'איסוף בחנות',
        freeShipping: 'משלוח חינם החל מ־',
        neighbors: 'שכנים מומלצים',
        each: 'בערך לכל אחד',
        missing: 'חסר כדי להגיע למשלוח חינם',
        deal: 'מבצע מזוהה',
        noDeal: 'לא זוהה מבצע נוסף',
        details: 'פרטי המוצר יופיעו כאן ברגע שנטען את הדף הציבורי.',
      }
    : {
        product: 'Product found',
        detected: 'Auto-detected',
        shipping: 'Shipping',
        homeDelivery: 'Home delivery',
        storePickup: 'Store pickup',
        freeShipping: 'Free shipping from',
        neighbors: 'Suggested neighbors',
        each: 'Approx. each',
        missing: 'Still needed for free shipping',
        deal: 'Deal found',
        noDeal: 'No extra deal detected',
        details: 'Product details will appear here once we read the public page.',
      };

  return (
    <ScreenBase style={{ paddingTop: 20, paddingBottom: 36 }}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <Text style={styles.title}>{t('order.new.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ gap: 14 }}>
        {sharedDraft ? (
          <View style={styles.shareNotice}>
            <Text style={styles.shareNoticeLabel}>{t('order.new.sharedLabel')}</Text>
            <Text style={styles.shareNoticeBody}>{t('order.new.sharedBody')}</Text>
          </View>
        ) : null}
        <View style={styles.summaryCard}>
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={styles.summaryKicker}>{copy.detected}</Text>
            <Text style={styles.summaryTitle} numberOfLines={2}>
              {insights?.title || title || copy.product}
            </Text>
            <Text style={styles.summaryBody}>
              {insightsLoading ? copy.details : insights?.dealSummary ? `${copy.deal}: ${insights.dealSummary}` : copy.noDeal}
            </Text>
            {insightsLoading ? <ActivityIndicator color={colors.acc} /> : null}
          </View>
          {insights?.imageUrl ? <Image source={{ uri: insights.imageUrl }} style={styles.summaryImage} /> : null}
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{copy.shipping}</Text>
            <Text style={styles.metricValue}>
              {formatAgorot(deliveryFeeAgorot)}
            </Text>
            <Text style={styles.metricNote}>{copy.homeDelivery}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{copy.freeShipping}</Text>
            <Text style={styles.metricValue}>{formatAgorot(freeShippingThresholdAgorot)}</Text>
            <Text style={styles.metricNote}>{copy.storePickup}: {formatAgorot(0)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{copy.neighbors}</Text>
            <Text style={styles.metricValue}>{neighborsNeeded}</Text>
            <Text style={styles.metricNote}>{formatAgorot(perPersonAgorot)} {copy.each}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{copy.missing}</Text>
            <Text style={styles.metricValue}>{formatAgorot(freeShippingGapAgorot)}</Text>
            <Text style={styles.metricNote}>{language === 'he' ? 'כדי להגיע ל־₪199.' : 'To reach the ₪199 threshold.'}</Text>
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
        <Field label={t('order.new.titleLabel')} value={title} onChange={setTitle} placeholder="ZARA" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <NumField label={t('order.new.priceLabel')} value={price} onChange={setPrice} placeholder="199" />
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <PrimaryBtn
        label={t('order.new.submit')}
        onPress={submit}
        disabled={!valid}
        loading={create.isPending}
      />
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
  title: { fontFamily: fontFamily.display, fontSize: 22, color: colors.tx },
  label: { fontSize: 13, color: colors.mu, fontFamily: fontFamily.bodyMedium },
  shareNotice: {
    gap: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.brBr,
    backgroundColor: colors.cardSoft,
  },
  shareNoticeLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: colors.tx,
  },
  shareNoticeBody: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.mu,
  },
  summaryCard: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.brBr,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    ...shadow.card,
  },
  summaryKicker: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.acc,
    textTransform: 'uppercase',
  },
  summaryTitle: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: colors.tx,
  },
  summaryBody: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.mu,
  },
  summaryImage: {
    width: 84,
    height: 104,
    borderRadius: radii.md,
    backgroundColor: colors.s1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    gap: 5,
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.brBr,
  },
  metricLabel: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: colors.mu,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.tx,
  },
  metricNote: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mu,
  },
});
