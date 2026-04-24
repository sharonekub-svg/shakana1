import { handleOptions } from '../_shared/cors.ts';
import { errorJson, json, readJson } from '../_shared/json.ts';
import { admin, authedUserId, httpError } from '../_shared/supabaseAdmin.ts';

type Body = {
  productUrl: string;
  productTitle: string;
  productPriceAgorot: number;
  productImage?: string;
  maxParticipants: number;
  idempotency_key?: string;
};

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const userId = await authedUserId(req);
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

    const { data: profile, error: profErr } = await admin
      .from('profiles')
      .select('building_id')
      .eq('id', userId)
      .maybeSingle();
    if (profErr) throw profErr;

    const transferGroup = `order_${crypto.randomUUID()}`;

    const { data: order, error: insErr } = await admin
      .from('orders')
      .insert({
        creator_id: userId,
        building_id: profile?.building_id ?? null,
        product_url: body.productUrl,
        product_title: body.productTitle.trim(),
        product_image: body.productImage ?? null,
        product_price_agorot: body.productPriceAgorot,
        max_participants: body.maxParticipants,
        stripe_transfer_group: transferGroup,
        status: 'open',
      })
      .select('*')
      .single();
    if (insErr) throw insErr;

    // Creator is always the first participant.
    const amount = Math.ceil(body.productPriceAgorot / body.maxParticipants);
    const { error: partErr } = await admin.from('participants').insert({
      order_id: order.id,
      user_id: userId,
      status: 'joined',
      amount_agorot: amount,
    });
    if (partErr) throw partErr;

    return json({ order });
  } catch (e) {
    return errorJson(e);
  }
});
