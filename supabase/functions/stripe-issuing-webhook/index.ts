import { admin } from '../_shared/supabaseAdmin.ts';
import { STRIPE_WEBHOOK_SECRET, stripe } from '../_shared/stripe.ts';

// Stripe Issuing posts here for every authorization request. We must
// respond within ~2 seconds with approve/decline. Decision rule:
//
//   - card must exist in virtual_cards and be status='active'
//   - amount <= card.spending_limit_agorot - card.spent_agorot
//   - currency must match (we only mint ILS)
//
// Approval is communicated by returning the request synchronously OR by
// calling stripe.issuing.authorizations.approve()/.decline(). We use the
// API call form so the function can finish processing after the webhook
// HTTP response is sent.
//
// Configure this endpoint in Stripe → Developers → Webhooks with the
// "issuing.authorization.request" event. Use a *different* signing
// secret than the regular Stripe webhook (you can have multiple).

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 });

  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('missing signature', { status: 400 });
  const raw = await req.text();

  const issuingSecret = Deno.env.get('STRIPE_ISSUING_WEBHOOK_SECRET') ?? STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, issuingSecret);
  } catch (err) {
    console.error('issuing webhook signature failed', err);
    return new Response('invalid signature', { status: 400 });
  }

  // Idempotency.
  const { data: dupe } = await admin
    .from('webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .maybeSingle();
  if (dupe) return new Response('already_processed', { status: 200 });

  try {
    if (event.type === 'issuing_authorization.request') {
      await handleAuthorizationRequest(event);
    } else if (event.type === 'issuing_authorization.created') {
      await handleAuthorizationCreated(event);
    } else if (event.type === 'issuing_card.updated') {
      // No-op for now; could mirror status changes from Stripe.
    }

    await admin.from('webhook_events').insert({
      stripe_event_id: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
    });
    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('issuing webhook handler error', err);
    return new Response('retry', { status: 500 });
  }
});

type IssuingAuthorization = {
  id: string;
  amount: number;
  currency: string;
  card: { id: string };
  merchant_data?: { name?: string; category?: string };
  status: string;
};

async function handleAuthorizationRequest(event: {
  data: { object: Record<string, unknown> };
}): Promise<void> {
  const auth = event.data.object as unknown as IssuingAuthorization;
  const { data: card } = await admin
    .from('virtual_cards')
    .select('*')
    .eq('stripe_card_id', auth.card.id)
    .maybeSingle();

  let approved = false;
  let reason = 'unknown_card';

  if (card) {
    if (card.status !== 'active') {
      reason = `card_${card.status}`;
    } else if (auth.currency.toLowerCase() !== 'ils') {
      reason = 'currency_mismatch';
    } else if (auth.amount + card.spent_agorot > card.spending_limit_agorot) {
      reason = 'over_limit';
    } else {
      approved = true;
      reason = 'approved';
    }
  }

  if (approved && card) {
    await stripe.issuing.authorizations.approve(auth.id);
    await admin
      .from('virtual_cards')
      .update({
        spent_agorot: card.spent_agorot + auth.amount,
        used_at: new Date().toISOString(),
        status: card.spent_agorot + auth.amount >= card.spending_limit_agorot ? 'used' : 'active',
      })
      .eq('id', card.id);

    if (card.spent_agorot + auth.amount >= card.spending_limit_agorot) {
      // Single-use card: cancel after first full charge so any retries
      // can never be approved.
      try {
        await stripe.issuing.cards.update(card.stripe_card_id, { status: 'canceled' });
      } catch (e) {
        console.error('card cancel failed', e);
      }
    }
  } else {
    await stripe.issuing.authorizations.decline(auth.id, {
      metadata: { decline_reason: reason },
    });
  }

  await admin.from('card_authorizations').insert({
    virtual_card_id: card?.id ?? null,
    order_id: card?.order_id ?? null,
    stripe_authorization_id: auth.id,
    merchant_name: auth.merchant_data?.name ?? null,
    merchant_category: auth.merchant_data?.category ?? null,
    amount_agorot: auth.amount,
    currency: auth.currency,
    approved,
    decline_reason: approved ? null : reason,
    raw: auth as unknown as Record<string, unknown>,
  });
}

async function handleAuthorizationCreated(event: {
  data: { object: Record<string, unknown> };
}): Promise<void> {
  const auth = event.data.object as unknown as IssuingAuthorization;
  // Stripe records the final settled state — record only if we somehow
  // missed the .request webhook (e.g., legacy approve_async flow).
  await admin
    .from('card_authorizations')
    .upsert(
      {
        stripe_authorization_id: auth.id,
        amount_agorot: auth.amount,
        currency: auth.currency,
        approved: auth.status === 'approved',
        raw: auth as unknown as Record<string, unknown>,
      },
      { onConflict: 'stripe_authorization_id' },
    );
}
