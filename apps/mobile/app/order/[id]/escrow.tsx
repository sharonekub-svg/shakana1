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
import { useLocale } from '@/i18n/locale';
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

const statusLabelsHe: Record<ShippingStatus, string> = {
  not_shipped: 'ממתין לשליחה מהחנות',
  shipped: 'ההזמנה נשלחה',
  ready_for_pickup: 'מוכן לאיסוף',
  picked_up: 'נאסף',
  ready_for_distribution: 'מוכן לחלוקה',
};

const statusLabelsEn: Record<ShippingStatus, string> = {
  not_shipped: 'Awaiting shipment from store',
  shipped: 'Order shipped',
  ready_for_pickup: 'Ready for pickup',
  picked_up: 'Picked up',
  ready_for_distribution: 'Ready for distribution',
};

const nextActionsHe: Partial<Record<ShippingStatus, { action: DeliveryAction; label: string }>> = {
  not_shipped: { action: 'mark_shipped', label: 'סמן כנשלח' },
  shipped: { action: 'mark_ready_for_pickup', label: 'סמן כמוכן לאיסוף' },
  ready_for_pickup: { action: 'mark_picked_up', label: 'סמן כנאסף' },
  picked_up: { action: 'mark_ready_for_distribution', label: 'מוכן לחלוקה' },
};

const nextActionsEn: Partial<Record<ShippingStatus, { action: DeliveryAction; label: string }>> = {
  not_shipped: { action: 'mark_shipped', label: 'Mark as shipped' },
  shipped: { action: 'mark_ready_for_pickup', label: 'Mark as ready for pickup' },
  ready_for_pickup: { action: 'mark_picked_up', label: 'Mark as picked up' },
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
  const { language } = useLocale();
  const isHe = language === 'he';
  const statusLabels = isHe ? statusLabelsHe : statusLabelsEn;
  const nextActions = isHe ? nextActionsHe : nextActionsEn;
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
      pushToast(isHe ? 'הסטטוס עודכן.' : 'Status updated.', 'success');
    } catch (e) {
      pushToast(
        e instanceof Error ? e.message : isHe ? 'לא הצלחנו לעדכן את הסטטוס.' : 'Could not update status.',
        'error',
      );
    }
  };

  const onReceived = async () => {
    if (!order) return;
    try {
      const result = await confirm.mutateAsync(order.id);
      if (result.completed) {
        router.replace(`/order/${order.id}/complete`);
      } else {
        pushToast(
          isHe ? 'אישור קבלה נשמר. ממתין לשאר הקבוצה.' : 'Delivery confirmed. Waiting for the rest of the group.',
          'success',
        );
      }
    } catch (e) {
      pushToast(
        e instanceof Error ? e.message : isHe ? 'לא הצלחנו לאשר קבלה.' : 'Could not confirm delivery.',
        'error',
      );
    }
  };

  const onCancelOrder = async () => {
    if (!order) return;
    try {
      await refund.mutateAsync(order.id);
      pushToast(
        isHe ? 'ההזמנה בוטלה. ההחזרים מתבצעים.' : 'Order cancelled. Refunds in progress.',
        'success',
      );
      router.replace('/(tabs)/orders');
    } catch (e) {
      pushToast(
        e instanceof Error ? e.message : isHe ? 'לא הצלחנו לבטל את ההזמנה.' : 'Could not cancel the order.',
        'error',
      );
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
          <Text style={styles.headerTitle}>{isHe ? 'איסוף' : 'Pickup'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.lockBox}>
          <Lock />
          <Text style={styles.lockTitle}>
            {isHe ? 'הכסף מוחזק בבטחה' : 'Funds held in escrow'}
          </Text>
          <Text style={styles.lockSub}>
            {allPaid
              ? isHe
                ? 'כולם שילמו. Stripe ישחרר את הכסף רק לאחר שכל המשתתפים יאשרו קבלה.'
                : 'Everyone paid. Stripe releases the funds only after every participant confirms delivery.'
              : isHe
              ? `שילמו: ${paidCount} מתוך ${total}. שליטת המשלוח תיפתח כשהקבוצה תשלם במלואה.`
              : `Paid: ${paidCount} of ${total}. Delivery controls unlock once the group is fully paid.`}
          </Text>
          <Text style={styles.amount}>{formatAgorot(order.product_price_agorot)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>{isHe ? 'תוכנית איסוף' : 'PICKUP PLAN'}</Text>
          <Text style={styles.cardTitle}>
            {order.pickup_responsible_name || (isHe ? 'אחראי איסוף' : 'Pickup manager')}
          </Text>
          <Text style={styles.body}>
            {isHe ? 'מיקום מועדף: ' : 'Preferred location: '}
            {order.preferred_pickup_location || (isHe ? 'לא הוגדר' : 'not set')}
          </Text>
          <Text style={styles.warning}>
            {order.pickup_location_note ||
              (isHe
                ? 'מיקום האיסוף עשוי להשתנות בהתאם לחנות או ספק המשלוח'
                : 'The pickup location may change depending on the store or carrier')}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.kicker}>{isHe ? 'סטטוס משלוח' : 'SHIPPING STATUS'}</Text>
          <Text style={styles.cardTitle}>{statusLabels[shippingStatus]}</Text>
          <TrackingTimeline events={trackingEvents} shippingStatus={shippingStatus} statusLabels={statusLabels} isHe={isHe} />
          {canManageDelivery && next ? (
            <PrimaryBtn
              label={next.label}
              onPress={() => runAction(next.action)}
              loading={updateDelivery.isPending}
              disabled={!allPaid}
            />
          ) : null}
          {!canManageDelivery ? (
            <Text style={styles.body}>
              {isHe
                ? 'רק יוצר ההזמנה או אחראי האיסוף יכולים לעדכן את הסטטוס.'
                : 'Only the order creator or the pickup manager can update the status.'}
            </Text>
          ) : null}
        </View>

        {isCreator && order.status !== 'completed' && order.status !== 'cancelled' ? (
          <View style={styles.card}>
            <Text style={styles.kicker}>{isHe ? 'ביטול והחזר כספי' : 'CANCEL & REFUND'}</Text>
            <Text style={styles.cardTitle}>
              {withinRefundWindow
                ? isHe
                  ? daysLeft === 1
                    ? 'נותר יום אחד לביטול'
                    : `נותרו ${daysLeft} ימים לביטול`
                  : daysLeft === 1
                  ? '1 day left to cancel'
                  : `${daysLeft} days left to cancel`
                : isHe
                ? 'חלון הביטול הסתיים'
                : 'Cancellation window has closed'}
            </Text>
            {withinRefundWindow ? (
              <>
                <Text style={styles.body}>
                  {isHe
                    ? 'לפי חוק הגנת הצרכן, ניתן לבטל עד 14 ימים מיצירת ההזמנה.'
                    : 'Under Israeli Consumer Protection Law you can cancel up to 14 days after creating the order.'}
                  {shippingStatus !== 'not_shipped'
                    ? isHe
                      ? ' ההזמנה כבר בדרך — ביטול עדיין אפשרי וכל הכסף יוחזר למשתתפים.'
                      : ' The order is already on its way — cancellation is still possible and every participant will be refunded in full.'
                    : isHe
                    ? ' כל הכסף יוחזר לכל המשתתפים.'
                    : ' Everyone will be refunded in full.'}
                </Text>
                {!confirmRefund ? (
                  <Pressable style={styles.cancelBtn} onPress={() => setConfirmRefund(true)}>
                    <Text style={styles.cancelBtnText}>
                      {isHe ? 'בטל הזמנה והחזר כספי' : 'Cancel order & refund'}
                    </Text>
                  </Pressable>
                ) : (
                  <View style={{ gap: 10 }}>
                    <Text style={[styles.body, { color: colors.err }]}>
                      {isHe
                        ? 'בטוח? לא ניתן לבטל את הפעולה. כל המשתתפים יזוכו במלואם.'
                        : 'Are you sure? This cannot be undone. Every participant will be refunded in full.'}
                    </Text>
                    <PrimaryBtn
                      label={isHe ? 'כן, בטל והחזר' : 'Yes, cancel and refund'}
                      onPress={onCancelOrder}
                      loading={refund.isPending}
                    />
                    <Pressable style={styles.cancelBtn} onPress={() => setConfirmRefund(false)}>
                      <Text style={styles.cancelBtnText}>{isHe ? 'חזור' : 'Back'}</Text>
                    </Pressable>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.body}>
                {isHe
                  ? `חלון הביטול של 14 ימים הסתיים ב-${refundDeadline?.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}.\nלמקרים חריגים פנה לתמיכה.`
                  : `The 14-day cancellation window closed on ${refundDeadline?.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.\nContact support for exceptional cases.`}
              </Text>
            )}
          </View>
        ) : null}

        {shippingStatus === 'ready_for_distribution' ? (
          <View style={styles.card}>
            <Text style={styles.kicker}>{isHe ? 'חלוקה' : 'DISTRIBUTION'}</Text>
            <Text style={styles.cardTitle}>
              {isHe ? 'העבר פריטים למשתתפים' : 'Hand out items to participants'}
            </Text>
            {participants.filter((p) => p.status === 'paid').map((p, index) => (
              <ParticipantDeliveryRow
                key={p.id}
                participant={p}
                index={index}
                isMe={p.user_id === userId}
                canManage={canManageDelivery}
                loading={updateDelivery.isPending}
                isHe={isHe}
                onMarkDelivered={() => runAction('mark_delivered_to_user', p.id)}
              />
            ))}
            {canConfirmReceived ? (
              <PrimaryBtn
                label={isHe ? 'קיבלתי את הפריט שלי' : 'I received my item'}
                onPress={onReceived}
                loading={confirm.isPending}
              />
            ) : null}
            {allDelivered && !allReceived ? (
              <Text style={styles.body}>
                {isHe
                  ? 'כל הפריטים נמסרו. ממתין לאישור קבלה מכל המשתתפים.'
                  : 'All items handed out. Waiting for everyone to confirm receipt.'}
              </Text>
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
  statusLabels,
  isHe,
}: {
  events: TrackingEvent[];
  shippingStatus: ShippingStatus;
  statusLabels: Record<ShippingStatus, string>;
  isHe: boolean;
}) {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(isHe ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (events.length === 0) {
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
  isHe,
  onMarkDelivered,
}: {
  participant: Participant;
  index: number;
  isMe: boolean;
  canManage: boolean;
  loading: boolean;
  isHe: boolean;
  onMarkDelivered: () => void;
}) {
  const delivered = Boolean(participant.delivered_to_user_at);
  const received = Boolean(participant.received_confirmed_at);
  return (
    <View style={styles.participantRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.participantTitle}>
          {isMe ? (isHe ? 'אתה' : 'You') : isHe ? `משתתף ${index + 1}` : `Participant ${index + 1}`}
        </Text>
        <Text style={styles.participantState}>
          {received
            ? isHe ? 'קבלה אושרה' : 'Receipt confirmed'
            : delivered
            ? isHe ? 'נמסר, ממתין לאישור' : 'Handed over, awaiting confirmation'
            : isHe ? 'טרם נמסר' : 'Not yet handed over'}
        </Text>
      </View>
      {canManage && !delivered ? (
        <PrimaryBtn label={isHe ? 'נמסר' : 'Handed over'} onPress={onMarkDelivered} loading={loading} />
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
