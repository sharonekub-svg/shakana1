import { handleOptions } from '../_shared/cors.ts';
import { errorJson, json, readJson } from '../_shared/json.ts';
import { admin, authedUserId, httpError } from '../_shared/supabaseAdmin.ts';
import { notifyOrderParticipants } from '../_shared/sendNotifications.ts';

type DeliveryAction =
  | 'update_pickup'
  | 'mark_shipped'
  | 'mark_ready_for_pickup'
  | 'mark_picked_up'
  | 'mark_ready_for_distribution'
  | 'mark_delivered_to_user';

type Body = {
  orderId: string;
  action: DeliveryAction;
  participantId?: string;
  pickupResponsibleUserId?: string;
  preferredPickupLocation?: string;
  trackingNote?: string;
  trackingLocation?: string;
};

type OrderRow = {
  id: string;
  creator_id: string;
  status: string;
  pickup_responsible_user_id: string | null;
  shipping_status: string;
};

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const userId = await authedUserId(req);
    const body = await readJson<Body>(req);
    if (!body.orderId) throw httpError(400, 'missing_orderId');
    if (!body.action) throw httpError(400, 'missing_action');

    const { data: order, error } = await admin
      .from('orders')
      .select('id, creator_id, status, pickup_responsible_user_id, shipping_status')
      .eq('id', body.orderId)
      .maybeSingle<OrderRow>();
    if (error) throw error;
    if (!order) throw httpError(404, 'order_not_found');

    const isCreator = order.creator_id === userId;
    const isPickupManager = order.pickup_responsible_user_id === userId;
    if (!isCreator && !isPickupManager) throw httpError(403, 'not_delivery_manager');
    if (order.status === 'completed' || order.status === 'cancelled') {
      throw httpError(409, 'order_closed');
    }

    if (body.action === 'update_pickup') {
      return await updatePickup(order, body, isCreator);
    }

    if (order.status !== 'escrow' && order.status !== 'delivered') {
      throw httpError(409, 'order_not_ready_for_delivery_updates');
    }

    const note = body.trackingNote?.trim() || undefined;
    const location = body.trackingLocation?.trim() || undefined;

    switch (body.action) {
      case 'mark_shipped':
        return await updateOrderStatus(order, ['not_shipped'], {
          shipping_status: 'shipped',
          shipped_at: new Date().toISOString(),
        }, userId, 'shipped', 'Order shipped by store', location, note);
      case 'mark_ready_for_pickup':
        return await updateOrderStatus(order, ['not_shipped', 'shipped'], {
          shipping_status: 'ready_for_pickup',
          ready_for_pickup_at: new Date().toISOString(),
        }, userId, 'ready_for_pickup', 'Ready for building pickup', location, note);
      case 'mark_picked_up':
        return await updateOrderStatus(order, ['ready_for_pickup'], {
          shipping_status: 'picked_up',
          picked_up_at: new Date().toISOString(),
        }, userId, 'picked_up', 'Picked up — on its way to you', location, note);
      case 'mark_ready_for_distribution':
        return await updateOrderStatus(order, ['picked_up'], {
          status: 'delivered',
          shipping_status: 'ready_for_distribution',
          ready_for_distribution_at: new Date().toISOString(),
          delivery_confirmed_at: new Date().toISOString(),
        }, userId, 'ready_for_distribution', 'Your item is being handed out', location, note);
      case 'mark_delivered_to_user':
        return await markDeliveredToUser(order, body, userId);
      default:
        throw httpError(400, 'invalid_action');
    }
  } catch (e) {
    return errorJson(e);
  }
});

async function updatePickup(order: OrderRow, body: Body, isCreator: boolean): Promise<Response> {
  const updates: Record<string, unknown> = {};
  const location = body.preferredPickupLocation?.trim();

  if (location !== undefined) {
    if (location.length < 3 || location.length > 160) {
      throw httpError(400, 'invalid_pickup_location');
    }
    updates.preferred_pickup_location = location;
  }

  if (body.pickupResponsibleUserId && body.pickupResponsibleUserId !== order.pickup_responsible_user_id) {
    if (!isCreator) throw httpError(403, 'only_creator_can_change_pickup_manager');
    const { data: participant, error: partErr } = await admin
      .from('participants')
      .select('user_id')
      .eq('order_id', order.id)
      .eq('user_id', body.pickupResponsibleUserId)
      .maybeSingle();
    if (partErr) throw partErr;
    if (!participant) throw httpError(400, 'pickup_manager_must_be_participant');

    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', body.pickupResponsibleUserId)
      .maybeSingle();
    if (profileErr) throw profileErr;

    updates.pickup_responsible_user_id = body.pickupResponsibleUserId;
    updates.pickup_responsible_name =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || 'Pickup manager';
  }

  if (Object.keys(updates).length === 0) throw httpError(400, 'nothing_to_update');

  const { error } = await admin.from('orders').update(updates).eq('id', order.id);
  if (error) throw error;
  return json({ ok: true });
}

const PUSH_MESSAGES: Partial<Record<string, { title: string; body: (label: string) => string }>> = {
  shipped:                  { title: 'Order on its way 📦', body: (l) => l },
  ready_for_pickup:         { title: 'Ready for pickup 🏪',  body: (l) => l },
  picked_up:                { title: 'Picked up 🚶',         body: (l) => l },
  ready_for_distribution:   { title: 'Almost there! 🎉',    body: (l) => l },
  delivered_to_user:        { title: 'Item delivered ✅',    body: (l) => l },
};

async function updateOrderStatus(
  order: OrderRow,
  allowedFrom: string[],
  updates: Record<string, unknown>,
  createdBy: string,
  shippingStatus: string,
  label: string,
  location?: string,
  note?: string,
): Promise<Response> {
  if (!allowedFrom.includes(order.shipping_status)) {
    throw httpError(409, 'invalid_delivery_transition');
  }
  const { error } = await admin.from('orders').update(updates).eq('id', order.id);
  if (error) throw error;

  await admin.from('tracking_events').insert({
    order_id: order.id,
    shipping_status: shippingStatus,
    label,
    location: location ?? null,
    note: note ?? null,
    created_by: createdBy,
  });

  const push = PUSH_MESSAGES[shippingStatus];
  if (push) {
    await notifyOrderParticipants(order.id, {
      title: push.title,
      body: note ? `${label} — ${note}` : label,
      data: { orderId: order.id, shippingStatus },
    });
  }

  return json({ ok: true });
}

async function markDeliveredToUser(order: OrderRow, body: Body, createdBy: string): Promise<Response> {
  if (order.shipping_status !== 'ready_for_distribution' || order.status !== 'delivered') {
    throw httpError(409, 'order_not_ready_for_distribution');
  }
  if (!body.participantId) throw httpError(400, 'missing_participantId');
  const { data: participant, error: partErr } = await admin
    .from('participants')
    .select('id, order_id, status, user_id')
    .eq('id', body.participantId)
    .eq('order_id', order.id)
    .maybeSingle();
  if (partErr) throw partErr;
  if (!participant) throw httpError(404, 'participant_not_found');
  if (participant.status !== 'paid') throw httpError(409, 'participant_not_paid');

  const { error } = await admin
    .from('participants')
    .update({ delivered_to_user_at: new Date().toISOString() })
    .eq('id', participant.id);
  if (error) throw error;

  // Notify only this specific participant.
  const { data: tokenRows } = await admin
    .from('push_tokens')
    .select('token')
    .eq('user_id', participant.user_id);
  if (tokenRows && tokenRows.length > 0) {
    const note = body.trackingNote?.trim();
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokenRows.map((r) => ({
        to: r.token,
        title: 'Item delivered ✅',
        body: note ? `Your item has been handed to you — ${note}` : 'Your item has been handed to you.',
        data: { orderId: order.id },
        sound: 'default',
      }))),
    }).catch(() => {});
  }

  return json({ ok: true });
}
