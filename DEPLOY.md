# Deploy walkthrough

Run these once on **your local machine** (not in a Claude Code on Web sandbox — those don't have outbound network to Vercel/Supabase). Total time: ~10 minutes.

## 0. Prereqs

```bash
git clone https://github.com/sharonekub-svg/shakana1.git
cd shakana1
# Tools you'll need locally:
which curl jq pnpm   # install via brew / apt if missing
```

## 1. Apply the database schema

Open the Supabase SQL Editor:
https://supabase.com/dashboard/project/<your-ref>/sql/new

Paste the entire contents of [`supabase/scripts/all-migrations.sql`](supabase/scripts/all-migrations.sql) → **Run**. Schema, RLS, triggers, and the `claim_invite` RPC are now live.

Then in **Authentication → Providers**:
- Enable **Phone (SMS)**, hook up your Twilio / MessageBird credentials, and set template:
  `הקוד שלך ל-שכנה הוא: {{ .Code }}`
- Enable **Google** with your OAuth client.

## 2. Configure environment

```bash
cp .env.deploy.example .env.deploy
# Open .env.deploy in your editor and paste in:
#   - Supabase URL + anon key + service-role key (Project Settings → API)
#   - Stripe publishable + secret + webhook signing secret + Connect acct id
#   - Sentry DSN (sentry.io → project → Client Keys)
#   - PostHog Project API key + host
#   - Vercel token (vercel.com/account/tokens) + project + team IDs
```

## 3. Push env vars to Vercel + redeploy

```bash
bash scripts/apply-env.sh
```

This:
- Deletes old env vars and rewrites every `EXPO_PUBLIC_*` key in Vercel
- Triggers a fresh production redeploy
- Writes `supabase/.env.local` for local edge-function dev

The site will be live at **https://shakana1.vercel.app** within ~2 minutes.

## 4. Deploy Supabase edge functions

```bash
supabase login                                  # one-time
supabase link --project-ref <your-ref>          # one-time
supabase secrets set --env-file supabase/.env.local
for fn in create-order generate-invite claim-invite create-payment-intent confirm-delivery refund-escrow delete-account; do
  supabase functions deploy "$fn"
done
supabase functions deploy stripe-webhook --no-verify-jwt
```

## 5. Point Stripe at the webhooks

Two webhook endpoints — one for collecting participant payments, one for
authorizing the issued virtual card in real time.

### 5a. Payments webhook

In the Stripe Dashboard → Developers → Webhooks → **Add endpoint**:

```
URL: https://<your-supabase-ref>.functions.supabase.co/stripe-webhook
Events:
  - payment_intent.succeeded
  - payment_intent.canceled
  - payment_intent.payment_failed
```

Copy the new signing secret (`whsec_...`) into `.env.deploy` as `STRIPE_WEBHOOK_SECRET`.

### 5b. Issuing webhook (VCC)

Create a Stripe Issuing cardholder (one per platform — represents Shakana
as the merchant of record). In Stripe → Issuing → Cardholders → **New
cardholder** (Type: Company). Copy the cardholder id (`ich_...`) into
`.env.deploy` as `STRIPE_ISSUING_CARDHOLDER_ID`.

Then add a second webhook endpoint:

```
URL: https://<your-supabase-ref>.functions.supabase.co/stripe-issuing-webhook
Events:
  - issuing_authorization.request
  - issuing_authorization.created
  - issuing_card.updated
```

⚠️ Crucial: this endpoint **must respond within 2 seconds** to authorization
requests, otherwise Stripe declines on its own. If the function ever gets
slow, route it through a closer region.

Copy this endpoint's signing secret into `.env.deploy` as
`STRIPE_ISSUING_WEBHOOK_SECRET`. (It's a different secret than the
payments webhook — Stripe issues one per endpoint.)

After updating `.env.deploy`, run `supabase secrets set --env-file
supabase/.env.local` to push the new secrets to your edge functions.

## 6. Verify

```bash
curl -i https://shakana1.vercel.app                    # should 200 with the Shakana SPA
supabase functions invoke create-order --no-verify-jwt # auth-required, expect 401: confirms function is up
```

## 7. (Optional) Mobile build

```bash
cd apps/mobile
pnpm install
eas init                  # one-time
eas build --platform ios  # or android
```
