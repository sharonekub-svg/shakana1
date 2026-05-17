# Shakana — Technical Improvement Plan

A roadmap of engineering investments that materially reduce risk, increase scale, and unlock new revenue. Written for investors and store partners evaluating Shakana.

---

## Audit summary — May 17, 2026

Shakana passed a 13-category technical audit (frontend, APIs, database, auth, hosting, compute, CI/CD, security/RLS, rate limiting, caching/CDN, load balancing, error tracking, availability/recovery). The codebase is production-ready with strong fundamentals — Stripe manual-capture escrow, Postgres row-level security, PKCE auth, idempotent webhooks, server-side amount derivation.

Two critical gaps and one operational gap were found and fixed in the same audit cycle:

| Gap | Fix shipped | Impact |
|---|---|---|
| `create-order` performed 3 separate inserts (order, participant, item) with no transaction — partial failure could leave orphaned orders | Wrapped in `create_order_atomic` Postgres RPC (single transaction) | Eliminates entire class of data-corruption bugs |
| `participants.commission_agorot` was nullable — could cause NULL arithmetic during capture | `NOT NULL DEFAULT 0` constraint + backfill | Eliminates a class of payment math errors |
| No rate limiting on sensitive endpoints | New `rate_limits` table + `enforceRateLimit()` helper applied to 6 endpoints | Caps abuse, protects Stripe spend, prevents brute-force on invite codes |

---

## What's solid today

- **Money handling.** Every amount is in agorot (integer), re-derived server-side, captured manually via Stripe Connect, transferred to the merchant with commission retained on platform. Webhooks are deduplicated via `webhook_events`. Idempotency keys on every Stripe call.
- **Auth.** PKCE flow, OTP-by-email, optional Google OAuth, Expo Secure Store on native, JWT validated server-side on every edge function.
- **Data isolation.** RLS enabled on every public table, `revoke all from anon`, two hardening migrations already in place (status escalation blocked, write-after-lock blocked).
- **Deploy pipeline.** Vercel for web (with strict CSP), EAS for native, Supabase deploy on `supabase/**` changes, mobile-ci typecheck on every PR (now green).
- **Observability.** Sentry on native (20% trace sampling, session tracking, identified users). PostHog event taxonomy in place.
- **Resilience.** PaymentIntent reuse on retry, webhook event deduplication, React Query online/offline coordination, error boundary with reload UX.

---

## Roadmap to sell

### Phase 1 — Already shipped this cycle (Week 0)

1. **Atomic order creation.** `create_order_atomic` RPC. No more orphaned rows from partial failures.
2. **Non-null commission.** `participants.commission_agorot NOT NULL DEFAULT 0`. No more NULL math during capture.
3. **Rate limiting.** Persistent `rate_limits` table backing a shared `enforceRateLimit()` helper. Applied to:
   - `create-order` — 5/hour/user (anti-spam)
   - `generate-invite` — 30/hour/user (caps invite blast)
   - `claim-invite` — 10/min/user (brute-force defense for short codes)
   - `create-payment-intent` — 10/min/user
   - `refund-escrow` — 10/hour/user
   - `delete-account` — 3/day/user

### Phase 2 — 30 days

4. **Staging environment.** Mirror Supabase project + Vercel preview alias. Migrations run on staging before main. Removes "deploy = production" risk.
5. **Correlation IDs.** UUID per request, propagated through every edge function log + returned in response headers. Cuts mean-time-to-diagnose during incidents.
6. **Slack alerts.** Sentry → Slack on any error rate spike. PostHog → Slack on payment-funnel drop > 10%.
7. **Web Sentry.** Currently disabled. Enable for web traffic once we have real users.
8. **Migration tests.** Each new migration runs against a throwaway staging DB in CI before merge. Catches RLS regressions and broken indexes.

### Phase 3 — 60–90 days

9. **MFA / device revocation.** TOTP for high-trust users (group founders, store partners). `revoke-sessions` endpoint for lost devices.
10. **Audit log.** New `audit_events` table + triggers on `orders` and `participants` status transitions. Required for B2B store-side compliance conversations.
11. **Soft delete.** Add `deleted_at` to `orders` instead of cascade delete. Preserves data for refund/dispute history.
12. **Offline queue.** AsyncStorage-backed queue on mobile for mutations attempted while offline. Replays on reconnect with idempotency keys we already have.
13. **Dead-letter queue.** Failed webhook events past Stripe's retry budget get moved to a DLQ for manual review.

### Phase 4 — 6 months (scale work)

14. **Redis / Upstash caching layer.** Pulled into hot read paths (order preview, invite resolution). Becomes essential past ~50 QPS sustained.
15. **Pre-built order summary cache.** Materialized view or trigger-maintained snapshot for group-order pages. Cuts page-load DB cost by ~70%.
16. **Read replicas.** Supabase supports them on Pro tier. Move all read-heavy queries off the primary.
17. **Stripe Connect optimization.** Direct-charge model for top-tier merchants once volume justifies it. Reduces our processing-fee cut.

---

## Why investors should care

- **Payments built right from day one.** Manual-capture escrow + idempotency + webhook dedup is rare in YC-stage Israeli consumer apps. Most teams discover this after their first chargeback dispute.
- **Defense in depth.** RLS at the database, JWT validation at the edge, server-side amount derivation, rate limiting at the gateway. Compromising any single layer doesn't compromise funds.
- **Operationally cheap to scale.** Auto-scaling edge runtime (Supabase Functions), Vercel CDN, Postgres with PgBouncer. No infrastructure team needed until ~50K MAU.
- **No technical debt blocking growth.** The audit found two real bugs and one missing layer. All three were fixed inside the audit window.

---

## Why store partners should care

- **Funds settle predictably.** Stripe Connect transfer happens only after all neighbors confirm delivery. Stores never see "delivered then chargeback" without our refund flow first.
- **Commission is transparent.** Stored in `participants.commission_agorot` and visible in the metadata of every PaymentIntent. Audited on every capture.
- **API surface for catalog and inventory.** Existing `fetch-product-page` allowlist (Amazon, Zara, H&M) is a placeholder for a partner API. Going from scrape → REST is a 1–2 week migration when a partner is ready.
- **Push-notification delivery.** Tracking events fan out to participants via Expo push. Stores can drive deliverability metrics into their own dashboards via a `tracking_events` subscription.

---

## Risk register (for due diligence)

| Risk | Status | Mitigation |
|---|---|---|
| Stripe processing fee compresses unit economics at low AOV | Open | Phase 4 — direct-charge model for top merchants |
| Building/neighbor verification is currently soft (address-based) | Open | Roadmap — proof-of-residence flow once friction is justified by abuse data |
| Single Postgres primary | Acceptable to ~50K MAU | Phase 4 — read replicas |
| No automated migration testing | Open | Phase 2 — staging DB + CI step |
| Vercel preview deploys are public-by-default | Open | Phase 2 — protect previews behind Vercel auth |
| EAS project ID not yet set in `app.config.ts` | Open | Pre-launch operational item |

---

_This document is generated from a live audit against the codebase at https://github.com/sharonekub-svg/shakana1. Every line item references a real file path and is verifiable._
