import { handleOptions } from '../_shared/cors.ts';
import { errorJson, json, readJson } from '../_shared/json.ts';
import { admin, authedUserId, httpError } from '../_shared/supabaseAdmin.ts';
import { enforceRateLimit } from '../_shared/rateLimit.ts';

type Body = {
  productUrl: string;
  productTitle: string;
  productPriceAgorot: number;
  productImage?: string;
  storeKey: string;
  storeLabel: string;
  estimatedShippingAgorot: number;
  freeShippingThresholdAgorot: number;
  timerMinutes: number;
  maxParticipants: number;
  pickupResponsibleUserId: string;
  preferredPickupLocation: string;
  idempotency_key?: string;
};

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const userId = await authedUserId(req);
    await enforceRateLimit(userId, 'create-order', { max: 5, windowSeconds: 3600 });
    const body = await readJson<Body>(req);

    if (!body.productUrl || !/^https?:\/\//i.test(body.productUrl)) {
      throw httpError(400, 'invalid_url');
    }
    if (!body.productTitle || body.productTitle.trim().length < 2) {
      throw httpError(400, 'invalid_title');
    }
    if (!Number.isInteger(body.productPriceAgorot) || body.productPriceAgorot <= 0) {
      throw httpError(400, 'invalid_price');
    }
    if (
      !Number.isInteger(body.maxParticipants) ||
      body.maxParticipants < 2 ||
      body.maxParticipants > 12
    ) {
      throw httpError(400, 'invalid_participants');
    }
    // 0 = no timer (manual close); positive = timer minutes (5–10080)
    if (body.timerMinutes !== 0 && (!Number.isInteger(body.timerMinutes) || body.timerMinutes < 5 || body.timerMinutes > 10080)) {
      throw httpError(400, 'invalid_timer');
    }
    if (!Number.isInteger(body.estimatedShippingAgorot) || body.estimatedShippingAgorot < 0) {
      throw httpError(400, 'invalid_shipping');
    }
    if (!Number.isInteger(body.freeShippingThresholdAgorot) || body.freeShippingThresholdAgorot < 0) {
      throw httpError(400, 'invalid_free_shipping_threshold');
    }
    const storeKey = (body.storeKey || 'manual').trim().slice(0, 40);
    const storeLabel = (body.storeLabel || storeKey).trim().slice(0, 80);
    if (storeLabel.length < 2) throw httpError(400, 'invalid_store');
    if (body.pickupResponsibleUserId !== userId) {
      throw httpError(400, 'pickup_manager_must_be_creator_initially');
    }
    const pickupLocation = body.preferredPickupLocation?.trim() ?? '';
    if (pickupLocation.length < 3 || pickupLocation.length > 160) {
      throw httpError(400, 'invalid_pickup_location');
    }

    const { data: profile, error: profErr } = await admin
      .from('profiles')
      .select('building_id, first_name, last_name')
      .eq('id', userId)
      .maybeSingle();
    if (profErr) throw profErr;
    const pickupName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();

    const transferGroup = `order_${crypto.randomUUID()}`;
    const hasTimer = body.timerMinutes > 0;
    const closesAt = hasTimer ? new Date(Date.now() + body.timerMinutes * 60_000) : null;
    const editLocksAt = closesAt ? new Date(closesAt.getTime() - 15_000) : null;
    const amount = body.productPriceAgorot + body.estimatedShippingAgorot;

    const { data: order, error: rpcErr } = await admin.rpc('create_order_atomic', {
      p_creator_id: userId,
      p_building_id: profile?.building_id ?? null,
      p_product_url: body.productUrl,
      p_product_title: body.productTitle.trim(),
      p_product_image: body.productImage ?? null,
      p_product_price_agorot: body.productPriceAgorot,
      p_max_participants: body.maxParticipants,
      p_stripe_transfer_group: transferGroup,
      p_store_key: storeKey,
      p_store_label: storeLabel,
      p_estimated_shipping_agorot: body.estimatedShippingAgorot,
      p_free_shipping_threshold_agorot: body.freeShippingThresholdAgorot,
      p_closes_at: closesAt?.toISOString() ?? null,
      p_edit_locks_at: editLocksAt?.toISOString() ?? null,
      p_pickup_responsible_name: pickupName || 'Order creator',
      p_preferred_pickup_location: pickupLocation,
      p_amount_agorot: amount,
    });

    if (rpcErr) throw rpcErr;
    if (!order) throw httpError(500, 'order_insert_failed');

    return json({ order });
  } catch (e) {
    return errorJson(e);
  }
});
