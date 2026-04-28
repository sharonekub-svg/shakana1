import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { PrimaryBtn, SecondaryBtn } from '@/components/primitives/Button';
import { colors, radii } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useCloseOrder, useOrder } from '@/api/orders';
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
          <View key={i} style={[styles.slot, p && styles.slotFilled, isMe && styles.slotMe]}>
            {p ? (
              <Text style={styles.slotText}>
                {isMe ? 'YOU' : `SEAT ${i + 1}`} | {p.status === 'paid' ? 'PAID' : 'OPEN'}
              </Text>
            ) : (
              <Text style={styles.slotEmpty}>OPEN SLOT</Text>
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
  const closeOrder = useCloseOrder();
  const [now, setNow] = useState(Date.now());

  const order = data?.order;
  const me = data?.participants.find((p) => p.user_id === userId);
  const participantCount = data?.participants.length ?? 0;

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
    if (!order?.closes_at || !['open', 'paying'].includes(order.status) || closeOrder.isPending) return;
    if (new Date(order.closes_at).getTime() <= now) {
      void closeOrder.mutateAsync(order.id).catch(() => {});
    }
  }, [closeOrder, now, order]);

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
        <Text style={{ color: colors.err, fontFamily: fontFamily.body }}>Unable to load order.</Text>
      </ScreenBase>
    );
  }

  const estimatedShipping = order.estimated_shipping_agorot ?? 0;
  const freeShippingThreshold = order.free_shipping_threshold_agorot ?? 0;
  const sharedOrderTotal = order.product_price_agorot * participantCount;
  const freeShippingGap = Math.max(0, freeShippingThreshold - sharedOrderTotal);
  const shippingSaved = Math.max(0, estimatedShipping * Math.max(0, participantCount - 1));
  const perPerson = Math.ceil((order.product_price_agorot + estimatedShipping / Math.max(1, participantCount || order.max_participants)));
  const closesAtMs = order.closes_at ? new Date(order.closes_at).getTime() : null;
  const editLocksAtMs = order.edit_locks_at ? new Date(order.edit_locks_at).getTime() : null;
  const remainingMs = closesAtMs ? Math.max(0, closesAtMs - now) : null;
  const editLocked = Boolean(editLocksAtMs && editLocksAtMs <= now);
  const totalSeconds = remainingMs == null ? 0 : Math.ceil(remainingMs / 1000);
  const timerLabel =
    remainingMs == null
      ? 'No timer'
      : `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;

  return (
    <ScreenBase style={{ paddingTop: 20, paddingBottom: 36 }}>
      <View style={styles.header}>
        <BackBtn onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Order</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 24 }}>
        <View style={styles.product}>
          {order.product_image ? (
            <Image source={{ uri: order.product_image }} style={styles.productImg} />
          ) : (
            <View style={[styles.productImg, styles.productPlaceholder]}>
              <Text style={styles.placeholderText}>ITEM</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {order.product_title ?? order.product_url}
            </Text>
            <Text style={styles.productPrice}>
              {order.store_label ?? 'Store'} | {formatAgorot(order.product_price_agorot)}
            </Text>
          </View>
        </View>

        <View style={styles.timerCard}>
          <Text style={styles.kicker}>Timer order</Text>
          <Text style={styles.timerValue}>{order.status === 'locked' ? 'Locked' : timerLabel}</Text>
          <Text style={styles.timerBody}>
            Users can join until the timer ends. Edits lock 15 seconds before closing.
          </Text>
          <Text style={styles.timerNote}>
            {editLocked || order.status === 'locked' ? 'Edits are locked.' : 'Edits are still open.'}
          </Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Participants</Text>
          <Text style={styles.sectionSub}>
            {data.participants.length} of {order.max_participants}
          </Text>
          <View style={{ height: 14 }} />
          <ParticipantTower
            participants={data.participants}
            total={order.max_participants}
            currentUserId={userId}
          />
        </View>

        <View style={styles.pickupCard}>
          <Text style={styles.kicker}>Smart suggestions</Text>
          <Text style={styles.pickupBody}>Estimated shipping: {formatAgorot(estimatedShipping)}</Text>
          <Text style={styles.pickupBody}>Approx. each right now: {formatAgorot(perPerson)}</Text>
          <Text style={styles.pickupBody}>Shipping saved together: {formatAgorot(shippingSaved)}</Text>
          <Text style={styles.pickupBody}>Missing for free shipping: {formatAgorot(freeShippingGap)}</Text>
        </View>

        <View style={styles.pickupCard}>
          <Text style={styles.kicker}>Pickup plan</Text>
          <Text style={styles.pickupTitle}>{order.pickup_responsible_name || 'Pickup manager assigned'}</Text>
          <Text style={styles.pickupBody}>
            Preferred location: {order.preferred_pickup_location || 'Will be added by the order creator'}
          </Text>
          <Text style={styles.pickupNote}>
            {order.pickup_location_note || 'Pickup location may vary depending on the store/shipping provider'}
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          {order.status === 'locked' && order.creator_id === userId ? (
            <PrimaryBtn
              label="Founder checkout manually"
              onPress={() => {
                void Linking.openURL(order.founder_checkout_url || order.product_url);
              }}
            />
          ) : order.status === 'locked' ? (
            <PrimaryBtn
              label={me?.status === 'paid' ? 'Already paid' : 'Pay now'}
              disabled={me?.status === 'paid'}
              onPress={() => router.push(`/order/${order.id}/pay`)}
            />
          ) : (
            <PrimaryBtn label="Payment opens when timer ends" disabled onPress={() => {}} />
          )}
          <SecondaryBtn label="Share order" onPress={() => router.push(`/order/${order.id}/invite`)} />
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
  timerCard: {
    gap: 8,
    padding: 18,
    borderRadius: radii.lg,
    backgroundColor: colors.navy,
  },
  timerValue: {
    fontFamily: fontFamily.display,
    fontSize: 36,
    color: colors.white,
  },
  timerBody: { fontFamily: fontFamily.body, fontSize: 13, color: 'rgba(255,255,255,0.86)', lineHeight: 20 },
  timerNote: { fontFamily: fontFamily.bodySemi, fontSize: 12, color: colors.s1, lineHeight: 18 },
});
