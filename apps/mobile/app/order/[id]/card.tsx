import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { PrimaryBtn } from '@/components/primitives/Button';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { IssuedCard, useIssueCard } from '@/api/cards';
import { useOrder } from '@/api/orders';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { formatAgorot } from '@/utils/format';

function formatCardNumber(num?: string): string {
  if (!num) return '';
  return num.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExp(m: number, y: number): string {
  const mm = String(m).padStart(2, '0');
  const yy = String(y).slice(-2);
  return `${mm}/${yy}`;
}

function CopyableField({
  label,
  value,
  obscured = false,
}: {
  label: string;
  value: string;
  obscured?: boolean;
}) {
  const pushToast = useUiStore((s) => s.pushToast);
  const [reveal, setReveal] = useState(!obscured);

  const copy = async () => {
    await Clipboard.setStringAsync(value);
    pushToast('הועתק', 'success');
  };

  const display = obscured && !reveal ? value.replace(/[\d]/g, '•') : value;

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldValue}>{display}</Text>
        {obscured ? (
          <Pressable
            onPress={() => setReveal((r) => !r)}
            hitSlop={8}
            style={styles.smallBtn}
          >
            <Text style={styles.smallBtnText}>{reveal ? 'הסתר' : 'הצג'}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={copy} hitSlop={8} style={styles.smallBtn}>
          <Text style={styles.smallBtnText}>העתק</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function CardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const { data } = useOrder(id);
  const issue = useIssueCard(String(id));
  const pushToast = useUiStore((s) => s.pushToast);
  const [card, setCard] = useState<IssuedCard | null>(null);

  const isCreator = data?.order && userId === data.order.creator_id;

  useEffect(() => {
    if (!isCreator || card || issue.isPending) return;
    issue
      .mutateAsync()
      .then(setCard)
      .catch((e) =>
        pushToast(
          e instanceof Error ? e.message : 'לא ניתן להנפיק כרטיס',
          'error',
        ),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreator]);

  if (!data) {
    return (
      <ScreenBase style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.acc} />
      </ScreenBase>
    );
  }

  if (!isCreator) {
    return (
      <ScreenBase style={{ paddingTop: 20, paddingBottom: 36 }}>
        <View style={styles.header}>
          <BackBtn onPress={() => router.back()} />
          <Text style={styles.headerTitle}>כרטיס</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.notCreatorBox}>
          <Text style={styles.notCreatorTitle}>הכסף נשמר בנאמנות</Text>
          <Text style={styles.notCreatorSub}>
            יוצר ההזמנה יקבל כרטיס וירטואלי לתשלום באתר. ההזמנה תגיע לכל
            המשתתפים יחד.
          </Text>
        </View>
      </ScreenBase>
    );
  }

  return (
    <ScreenBase style={{ paddingTop: 20, paddingBottom: 36 }}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <Text style={styles.headerTitle}>כרטיס לתשלום</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.intro}>
        <Text style={styles.introText}>
          הכרטיס תקף לסכום של{' '}
          <Text style={styles.amount}>
            {formatAgorot(data.order.product_price_agorot)}
          </Text>
          . העתק את הפרטים והדבק באתר ההזמנה. הכרטיס יבוטל אוטומטית מיד לאחר השימוש.
        </Text>
      </View>

      {!card || issue.isPending ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.acc} size="large" />
          <Text style={styles.loadingText}>מנפיק כרטיס וירטואלי…</Text>
        </View>
      ) : (
        <View style={styles.cardWrap}>
          <View style={styles.cardFace}>
            <Text style={styles.brand}>{(card.brand ?? 'VISA').toUpperCase()}</Text>
            <Text style={styles.pan}>
              {formatCardNumber(card.number) || `•••• •••• •••• ${card.last4 ?? '----'}`}
            </Text>
            <View style={styles.cardBottom}>
              <View>
                <Text style={styles.cardLabel}>תוקף</Text>
                <Text style={styles.cardField}>
                  {formatExp(card.exp_month, card.exp_year)}
                </Text>
              </View>
              <View>
                <Text style={styles.cardLabel}>CVC</Text>
                <Text style={styles.cardField}>{card.cvc ?? '•••'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.fieldsBlock}>
            {card.number ? (
              <CopyableField label="מספר כרטיס" value={card.number} obscured />
            ) : null}
            <CopyableField
              label="תוקף"
              value={formatExp(card.exp_month, card.exp_year)}
            />
            {card.cvc ? (
              <CopyableField label="קוד אבטחה (CVC)" value={card.cvc} obscured />
            ) : null}
          </View>

          <View style={styles.warning}>
            <Text style={styles.warningText}>
              🔒 פרטי הכרטיס מוצגים פעם אחת בלבד. אם תסגור את המסך לפני העתקה תצטרך לפנות לתמיכה.
            </Text>
          </View>
        </View>
      )}

      <View style={{ flex: 1 }} />

      <PrimaryBtn
        label="סיימתי לשלם"
        disabled={!card}
        onPress={() => router.replace(`/order/${id}/escrow`)}
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
  headerTitle: { fontFamily: fontFamily.display, fontSize: 22, color: colors.tx },
  intro: { marginBottom: 18 },
  introText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.mu,
    lineHeight: 22,
  },
  amount: { fontFamily: fontFamily.bodySemi, color: colors.tx },
  loadingBox: { alignItems: 'center', gap: 14, marginVertical: 40 },
  loadingText: { fontFamily: fontFamily.body, color: colors.mu, fontSize: 14 },
  cardWrap: { gap: 18 },
  cardFace: {
    backgroundColor: colors.tx,
    borderRadius: radii.xl,
    padding: 22,
    gap: 18,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  brand: { color: colors.white, fontFamily: fontFamily.bodySemi, fontSize: 12, letterSpacing: 2 },
  pan: {
    color: colors.white,
    fontFamily: fontFamily.bodySemi,
    fontSize: 22,
    letterSpacing: 2,
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 1, fontFamily: fontFamily.body },
  cardField: { color: colors.white, fontFamily: fontFamily.bodySemi, fontSize: 16, marginTop: 2 },
  fieldsBlock: { gap: 12 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, color: colors.mu, fontFamily: fontFamily.bodyMedium },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderColor: colors.brBr,
    borderWidth: 1.5,
    padding: 14,
  },
  fieldValue: {
    flex: 1,
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.tx,
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  smallBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  smallBtnText: { color: colors.acc, fontFamily: fontFamily.bodySemi, fontSize: 13 },
  warning: {
    backgroundColor: colors.accLight,
    borderRadius: radii.sm,
    padding: 12,
  },
  warningText: { fontFamily: fontFamily.body, fontSize: 13, color: colors.acc, lineHeight: 20 },
  notCreatorBox: {
    backgroundColor: colors.accLight,
    borderRadius: radii.lg,
    padding: 24,
    gap: 8,
  },
  notCreatorTitle: { fontFamily: fontFamily.display, fontSize: 20, color: colors.tx },
  notCreatorSub: { fontFamily: fontFamily.body, fontSize: 14, color: colors.mu, lineHeight: 22 },
});
