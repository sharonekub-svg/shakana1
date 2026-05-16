import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';

import { ScreenBase } from '@/components/primitives/ScreenBase';
import { BackBtn } from '@/components/primitives/BackBtn';
import { PrimaryBtn } from '@/components/primitives/Button';
import { colors, radii, shadow } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';
import { useConfirmDelivery, useOrder, useRefundOrder, useUpdateDelivery, type DeliveryAction } from '@/api/orders';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { formatAgorot } from '@/utils/format';
import type { Participant, ShippingStatus, TrackingEvent } from '@/types/domain';

function Lock() {
  return (
    <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="11" width="16" height="10" rx="2" stroke={colors.white} strokeWidth={2} />
      <Path d="M8 11V8a4 4 0 018 0v3" stroke={colors.white} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

const statusLabels: Record<ShippingStatus, string> = {
  not_shipped: 'Waiting for store shipment',
  shipped: 'Order shipped',
  ready_for_pickup: 'Ready for pickup',
  picked_up: 'Picked up',
  ready_for_distribution: 'Ready for distribution',
};

const nextActions: Partial<Record<ShippingStatus, { action: DeliveryAction; label: string }>> = {
  not_shipped: { action: 'mark_shipped', label: 'Mark order shipped' },
  shipped: { action: 'mark_ready_for_pickup', label: 'Mark ready for pickup' },
  ready_for_pickup: { action: 'mark_picked_up', label: 'Mark picked up' },
  picked_up: { action: 'mark_ready_for_distribution', label: 'Ready for distribution' },
};

export default function Escrow() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useOrder(id);
  const userId = useAuthStore((s) => s.user?.id);
  const confirm = useConfirmDelivery();
  const updateDelivery = useUpdateDelivery();
  const refund = useRefundOrder();
  const pushToast = useUiStore((s) => s.pushToast);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);

  const order = data?.order;
  const participants = data?.participants ?? [];
  const trackingEvents = data?.trackingEvents ?? [];
  const paidCount = participants.filter((p) => p.status === 'paid').length;
  const total = order?.max_participants ?? 0;
  const allPaid = total > 0 && paidCount >= total;
  const shippingStatus = order?.shipping_status ?? 'not_shipped';
  const isCreator = Boolean(order && userId === order.creator_id);
  const isPickupManager = Boolean(order && userId === order.pickup_responsible_user_id);
  const canManageDelivery = isCreator || isPickupManager;
  const me = participants.find((p) => p.user_id === userId);
  const allDelivered = participants.filter((p) => p.status === 'paid').every((p) => Boolean(p.delivered_to_user_at));
  const allReceived = participants.filter((p) => p.status === 'paid').every((p) => Boolean(p.received_confirmed_at));

  const createdAt = order?.created_at ? new Date(order.created_at) : null;
  const refundDeadline = createdAt ? new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000) : null;
  const daysLeft = refundDeadline ? Math.ceil((refundDeadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : 0;
  const withinRefundWindow = daysLeft > 0;

  const runAction = async (action: DeliveryAction, participantId?: string) => {
    if (!order) return;
    try {
      await updateDelivery.mutateAsync({ orderId: order.id, action, participantId });
      pushToast('Order status updated.', 'success');
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Could not update delivery status.', 'error');
    }
  };

  const onReceived = async () => {
    if (!order) return;
    try {
      const result = await confirm.mutateAsync(order.id);
      if (result.completed) {
        router.replace(`/order/${order.id}/complete`);
      } else {
        pushToast('Received confirmation saved. Waiting for the rest of the group.', 'success');
      }
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Could not confirm received.', 'error');
    }
  };

  const onCancelOrder = async () => {
    if (!order) return;
    try {
      await refund.mutateAsync(order.id);
      pushToast('Order cancelled. Refunds are being processed.', 'success');
      router.replace('/(tabs)/orders');
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Could not cancel order.', 'error');
    }
  };

  if (isLoading || !order) {
    return (
      <ScreenBase style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.acc} />
      </ScreenBase>
    );
  }

  const next = nextActions[shippingStatus];
  const canConfirmReceived =
    me?.status === 'paid' && Boolean(me.delivered_to_user_at) && !me.received_confirmed_at;

  return (
    <ScreenBase padded={false}>
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackBtn onPress={() => router.replace('/(tabs)/orders')} />
          <Text style={styles.headerTitle}>Pickup</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.lockBox}>
          <Lock />
          <Text style={styles.lockTitle}>Money is safely held</Text>
          <Text style={styles.lockSub}>
            {allPaid
              ? 'Everyone paid. Stripe will only capture funds after all users confirm they received their item.'
              : `Paid: ${paidCount} of ${total}. Delivery controls unlock after the group is paid.`}
          </Text>
          <Text style={styles.amount}>{formatAgorot(order.product_price_agorot)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>Pickup plan</Text>
          <Text style={styles.cardTitle}>{order.pickup_responsible_name || 'Pickup manager'}</Text>
          <Text style={styles.body}>Preferred location: {order.preferred_pickup_location || 'Not set'}</Text>
          <Text style={styles.warning}>
            {order.pickup_location_note || 'Pickup location may vary depending on the store/shipping provider'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>Delivery status</Text>
          <Text style={styles.cardTitle}>{statusLabels[shippingStatus]}</Text>
          <TrackingTimeline events={trackingEvents} shippingStatus={shippingStatus} />
          {canManageDelivery && next ? (
            <PrimaryBtn
              label={next.label}
              onPress={() => runAction(next.action)}
              loading={updateDelivery.isPending}
              disabled={!allPaid}
            />
          ) : null}
          {!canManageDelivery ? (
            <Text style={styles.body}>Only the order creator or pickup manager can update delivery status.</Text>
          ) : null}
        </View>

        {isCreator && order.status !== 'completed' && order.status !== 'cancelled' ? (
          <View style={styles.card}>
            <Text style={styles.kicker}>ביטול והחזר כספי</Text>
            <Text style={styles.cardTitle}>
              {withinRefundWindow
                ? daysLeft === 1 ? 'נותר יום אחד לביטול' : `נותרו ${daysLeft} ימים לביטול`
                : 'חלון הביטול הסתיים'}
            </Text>
            {withinRefundWindow ? (
              <>
                <Text style={styles.body}>
                  לפי חוק הגנת הצרכן, ניתן לבטל עד 14 ימים מיצירת ההזמנה.
                  {shippingStatus !== 'not_shipped'
                    ? ' ההזמנה כבר בדרך — ביטול עדיין אפשרי וכל הכסף יוחזר למשתתפים.'
                    : ' כל הכסף יוחזר לכל המשתתפים.'}
                </Text>
                {!confirmRefund ? (
                  <Pressable style={styles.cancelBtn} onPress={() => setConfirmRefund(true)}>
                    <Text style={styles.cancelBtnText}>בטל הזמנה והחזר כספי</Text>
                  </Pressable>
                ) : (
                  <View style={{ gap: 10 }}>
                    <Text style={[styles.body, { color: colors.err }]}>
                      בטוח? לא ניתן לבטל את הפעולה. כל המשתתפים יזוכו במלואם.
                    </Text>
                    <PrimaryBtn label="כן, בטל והחזר" onPress={onCancelOrder} loading={refund.isPending} />
                    <Pressable style={styles.cancelBtn} onPress={() => setConfirmRefund(false)}>
                      <Text style={styles.cancelBtnText}>חזור</Text>
                    </Pressable>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.body}>
                {'חלון הביטול של 14 ימים הסתיים ב-'}
                {refundDeadline?.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}.
                {'\nלמקרים חריגים פנה לתמיכה.'}
              </Text>
            )}
          </View>
        ) : null}

        {shippingStatus === 'ready_for_distribution' ? (
          <View style={styles.card}>
            <Text style={styles.kicker}>Distribution</Text>
            <Text style={styles.cardTitle}>Hand items to participants</Text>
            {participants.filter((p) => p.status === 'paid').map((p, index) => (
              <ParticipantDeliveryRow
                key={p.id}
                participant={p}
                index={index}
                isMe={p.user_id === userId}
                canManage={canManageDelivery}
                loading={updateDelivery.isPending}
                onMarkDelivered={() => runAction('mark_delivered_to_user', p.id)}
              />
            ))}
            {canConfirmReceived ? (
              <PrimaryBtn label="I received my item" onPress={onReceived} loading={confirm.isPending} />
            ) : null}
            {allDelivered && !allReceived ? (
              <Text style={styles.body}>All items were handed out. Waiting for every user to confirm received.</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </ScreenBase>
  );
}

const STATUS_ORDER = ['shipped', 'ready_for_pickup', 'picked_up', 'ready_for_distribution'];

function TrackingTimeline({
  events,
  shippingStatus,
}: {
  events: TrackingEvent[];
  shippingStatus: ShippingStatus;
}) {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (events.length === 0) {
    // Fall back to milestone dots when no tracking events are logged yet.
    const pendingLabels = STATUS_ORDER.filter(
      (s) => STATUS_ORDER.indexOf(s) > STATUS_ORDER.indexOf(shippingStatus),
    );
    const doneLabels = STATUS_ORDER.filter(
      (s) => STATUS_ORDER.indexOf(s) <= STATUS_ORDER.indexOf(shippingStatus),
    );
    const allLabels = [...doneLabels, ...pendingLabels];
    return (
      <View style={styles.timeline}>
        {allLabels.map((s) => {
          const done = doneLabels.includes(s);
          return (
            <View key={s} style={styles.timelineRow}>
              <View style={[styles.dot, done && styles.dotOn]} />
              <Text style={[styles.timelineText, done && styles.timelineTextOn]}>
                {statusLabels[s as ShippingStatus] ?? s}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.timeline}>
      {events.map((ev, i) => (
        <View key={ev.id} style={styles.timelineEventRow}>
          <View style={styles.timelineStem}>
            <View style={styles.dotOn} />
            {i < events.length - 1 ? <View style={styles.stemLine} /> : null}
          </View>
          <View style={styles.timelineEventContent}>
            <Text style={styles.timelineTextOn}>{ev.label}</Text>
            {ev.location ? <Text style={styles.timelineMeta}>{ev.location}</Text> : null}
            {ev.note ? <Text style={styles.timelineNote}>{ev.note}</Text> : null}
            <Text style={styles.timelineTime}>{fmt(ev.at)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function ParticipantDeliveryRow({
  participant,
  index,
  isMe,
  canManage,
  loading,
  onMarkDelivered,
}: {
  participant: Participant;
  index: number;
  isMe: boolean;
  canManage: boolean;
  loading: boolean;
  onMarkDelivered: () => void;
}) {
  const delivered = Boolean(participant.delivered_to_user_at);
  const received = Boolean(participant.received_confirmed_at);
  return (
    <View style={styles.participantRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.participantTitle}>{isMe ? 'You' : `Participant ${index + 1}`}</Text>
        <Text style={styles.participantState}>
          {received ? 'Received confirmed' : delivered ? 'Delivered, waiting for confirmation' : 'Not delivered yet'}
        </Text>
      </View>
      {canManage && !delivered ? (
        <PrimaryBtn label="Delivered" onPress={onMarkDelivered} loading={loading} />
      ) : null}
    </View>
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
    marginBottom: 6,
  },
  headerTitle: { fontFamily: fontFamily.display, fontSize: 22, color: colors.tx },
  lockBox: {
    backgroundColor: colors.grn,
    borderRadius: radii.xxl,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    ...shadow.card,
  },
  lockTitle: { fontFamily: fontFamily.display, fontSize: 22, color: colors.white, textAlign: 'center' },
  lockSub: {
    fontFamily: fontFamily.body,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  amount: { fontFamily: fontFamily.display, fontSize: 32, color: colors.white, marginTop: 8 },
  card: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.brBr,
    borderRadius: radii.lg,
    backgroundColor: colors.s1,
    ...shadow.card,
  },
  kicker: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.acc,
    textTransform: 'uppercase',
  },
  cardTitle: { fontFamily: fontFamily.display, fontSize: 21, color: colors.tx },
  body: { fontFamily: fontFamily.body, fontSize: 13, color: colors.mu, lineHeight: 20 },
  warning: { fontFamily: fontFamily.bodySemi, fontSize: 12, color: colors.acc, lineHeight: 18 },
  timeline: { gap: 10 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 11, height: 11, borderRadius: 999, backgroundColor: colors.brBr },
  dotOn: { width: 11, height: 11, borderRadius: 999, backgroundColor: colors.grn },
  timelineText: { fontFamily: fontFamily.body, color: colors.mu, fontSize: 13 },
  timelineTextOn: { color: colors.tx, fontFamily: fontFamily.bodySemi, fontSize: 14 },
  timelineEventRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  timelineStem: { alignItems: 'center', paddingTop: 2 },
  stemLine: { width: 2, flex: 1, minHeight: 16, backgroundColor: colors.grn, opacity: 0.3, marginTop: 4 },
  timelineEventContent: { flex: 1, gap: 2, paddingBottom: 12 },
  timelineMeta: { fontFamily: fontFamily.bodySemi, fontSize: 12, color: colors.acc },
  timelineNote: { fontFamily: fontFamily.body, fontSize: 12, color: colors.mu, lineHeight: 18 },
  timelineTime: { fontFamily: fontFamily.body, fontSize: 11, color: colors.mu, marginTop: 2 },
  participantRow: {
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.br,
    borderRadius: radii.md,
    backgroundColor: colors.cardSoft,
  },
  participantTitle: { fontFamily: fontFamily.bodyBold, fontSize: 14, color: colors.tx },
  participantState: { fontFamily: fontFamily.body, fontSize: 12, color: colors.mu, marginTop: 3 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.br,
    borderRadius: radii.pill,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: colors.s1,
  },
  cancelBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 15,
    color: colors.mu,
  },
});
