import { useEffect } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { PrimaryBtn, SecondaryBtn } from '@/components/primitives/Button';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useOrder } from '@/api/orders';
import { useAuthStore } from '@/stores/authStore';
import { formatAgorot } from '@/utils/format';
import type { Participant } from '@/types/domain';

function ParticipantTower({
  participants,
  total,
  currentUserId,
}: {
  participants: Participant[];
  total: number;
  currentUserId: string | undefined;
}) {
  const slots = Array.from({ length: total }, (_, i) => participants[i]);
  return (
    <View style={styles.tower}>
      {slots.map((p, i) => {
        const isMe = p && p.user_id === currentUserId;
        return (
          <View
            key={i}
            style={[
              styles.slot,
              p && styles.slotFilled,
              isMe && styles.slotMe,
            ]}
          >
            {p ? (
              <Text style={styles.slotText}>
                {isMe ? 'את/ה' : `שכן ${i + 1}`} · {p.status === 'paid' ? 'שילם' : 'הצטרף'}
              </Text>
            ) : (
              <Text style={styles.slotEmpty}>ממתין…</Text>
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
  const userId = useAuthStore((s) => s.user?.id);
  const { data, isLoading, error } = useOrder(id);

  const order = data?.order;
  const me = data?.participants.find((p) => p.user_id === userId);

  useEffect(() => {
    // Route to correct sub-screen based on order + this participant's state.
    if (!order || !me) return;
    if (order.status === 'completed') router.replace(`/order/${order.id}/complete`);
    else if (order.status === 'escrow' || order.status === 'card_issued' || order.status === 'delivered')
      router.replace(`/order/${order.id}/escrow`);
  }, [order, me, router]);

  if (isLoading || !data) {
    return (
      <ScreenBase style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.acc} />
      </ScreenBase>
    );
  }
  if (error || !order) {
    return (
      <ScreenBase style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.err, fontFamily: fontFamily.body }}>
          לא ניתן לטעון הזמנה
        </Text>
      </ScreenBase>
    );
  }

  const perPerson = Math.ceil(order.product_price_agorot / order.max_participants);

  return (
    <ScreenBase style={{ paddingTop: 20, paddingBottom: 36 }}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <Text style={styles.headerTitle}>הזמנה</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 24 }}>
        <View style={styles.product}>
          {order.product_image ? (
            <Image source={{ uri: order.product_image }} style={styles.productImg} />
          ) : (
            <View style={[styles.productImg, styles.productPlaceholder]}>
              <Text style={{ fontSize: 28 }}>🛍️</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {order.product_title ?? order.product_url}
            </Text>
            <Text style={styles.productPrice}>
              {formatAgorot(order.product_price_agorot)} · {formatAgorot(perPerson)} לאדם
            </Text>
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>משתתפים</Text>
          <Text style={styles.sectionSub}>
            {data.participants.length} מתוך {order.max_participants}
          </Text>
          <View style={{ height: 14 }} />
          <ParticipantTower
            participants={data.participants}
            total={order.max_participants}
            currentUserId={userId}
          />
        </View>

        <View style={{ gap: 10 }}>
          <PrimaryBtn
            label={me?.status === 'paid' ? 'ממתין לשאר המשתתפים' : 'שלם עכשיו'}
            disabled={me?.status === 'paid'}
            onPress={() => router.push(`/order/${order.id}/pay`)}
          />
          <SecondaryBtn
            label="שתף הזמנה"
            onPress={() => router.push(`/order/${order.id}/invite`)}
          />
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
    borderRadius: radii.lg,
    padding: 12,
  },
  productImg: { width: 72, height: 72, borderRadius: radii.md },
  productPlaceholder: {
    backgroundColor: colors.s1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
});
