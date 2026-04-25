import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

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

const PARTICIPANT_OPTIONS = [2, 3, 4, 5, 6];

export default function NewOrder() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
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
      pushToast(e instanceof Error ? e.message : 'שגיאה ביצירת ההזמנה', 'error');
    }
  };

  return (
    <ScreenBase style={{ paddingTop: 20, paddingBottom: 36 }}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <Text style={styles.title}>הזמנה חדשה</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ gap: 14 }}>
        <Field
          label="קישור למוצר"
          value={url}
          onChange={setUrl}
          placeholder="https://..."
          ltr
          keyboardType="url"
          autoCapitalize="none"
        />
        <Field label="שם המוצר" value={title} onChange={setTitle} placeholder="שמלה שחורה ZARA" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <NumField label="מחיר (₪)" value={price} onChange={setPrice} placeholder="199" />
        </View>

        <View style={{ gap: 10 }}>
          <Text style={styles.label}>מספר משתתפים</Text>
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
        label="צור הזמנה והזמן שכנים"
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
