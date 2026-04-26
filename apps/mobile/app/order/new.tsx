import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { PrimaryBtn } from '@/components/primitives/Button';
import { Field } from '@/components/primitives/Field';
import { NumField } from '@/components/primitives/NumField';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { productUrlSchema } from '@/utils/validation';
import { useCreateOrder } from '@/api/orders';
import { useUiStore } from '@/stores/uiStore';
import { useLocale } from '@/i18n/locale';
import { parseSharedProduct } from '@/lib/sharedProduct';

const PARTICIPANT_OPTIONS = [2, 3, 4, 5, 6];

type NewOrderParams = {
  url?: string;
  title?: string;
  source?: string;
};

export default function NewOrder() {
  const router = useRouter();
  const params = useLocalSearchParams<NewOrderParams>();
  const { t } = useLocale();
  const sharedDraft = parseSharedProduct({
    url: typeof params.url === 'string' ? params.url : null,
    title: typeof params.title === 'string' ? params.title : null,
  });
  const [url, setUrl] = useState(() => sharedDraft?.url ?? '');
  const [title, setTitle] = useState(() => sharedDraft?.title ?? '');
  const [price, setPrice] = useState('');
  const [maxP, setMaxP] = useState(4);
  const create = useCreateOrder();
  const pushToast = useUiStore((s) => s.pushToast);

  const urlCheck = productUrlSchema.safeParse(url);
  const priceAgorot = Math.floor(Number(price) * 100);
  const valid = urlCheck.success && title.trim().length > 1 && priceAgorot > 0;

  const submit = async () => {
    if (!valid || create.isPending) return;
    try {
      const order = await create.mutateAsync({
        productUrl: url.trim(),
        productTitle: title.trim(),
        productPriceAgorot: priceAgorot,
        maxParticipants: maxP,
      });
      router.replace(`/order/${order.id}`);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : t('order.new.error'), 'error');
    }
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

        <View style={{ gap: 10 }}>
          <Text style={styles.label}>{t('order.new.participantsLabel')}</Text>
          <View style={styles.chips}>
            {PARTICIPANT_OPTIONS.map((n) => {
              const active = n === maxP;
              return (
                <Pressable
                  key={n}
                  onPress={() => setMaxP(n)}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{n}</Text>
                </Pressable>
              );
            })}
          </View>
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
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.s1,
    borderColor: colors.brBr,
    borderWidth: 1.5,
  },
  chipActive: { backgroundColor: colors.acc, borderColor: colors.acc },
  chipText: { fontFamily: fontFamily.bodySemi, fontSize: 15, color: colors.tx },
  chipTextActive: { color: colors.white },
});
