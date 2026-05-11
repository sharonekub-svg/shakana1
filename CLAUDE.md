# Shakana — AI Development Guide

## Project overview

Group-buy mobile app (Israeli market). Users share a product link, invite building neighbours, pay together, and split shipping savings. Money is held in Stripe manual-capture escrow until all users confirm receipt.

**Stack:**
- `apps/mobile/` — Expo + React Native (TypeScript, RTL/Hebrew, `expo-router`, Supabase Realtime, Stripe)
- `supabase/functions/` — Deno edge functions (auth, Stripe, push notifications)
- `supabase/migrations/` — Postgres schema + RLS policies
- Deploy: Vercel (web), EAS (native), Supabase (backend)

## Branch & commit rules

- Active development branch: `claude/review-website-prs-xUaz9`
- Push with `git push -u origin <branch>` — never force-push to main
- Commit messages: describe WHY, not what. One concise sentence.
- Always run `pnpm typecheck` before committing mobile changes

## Code rules

- **No comments** unless the WHY is non-obvious (hidden constraint, workaround, subtle invariant)
- No half-finished features, no backwards-compat shims for removed code
- Validate only at system boundaries (user input, external APIs) — trust internal guarantees
- All money values in **agorot** (integer, 1/100 of a shekel) — never floats for currency
- Status state machine: `open → locked → paying → escrow → delivered → completed` — never skip states or transition backwards

## Security rules (financial app — treat everything as potentially hostile)

- **Stripe:** always `capture_method: 'manual'` — never auto-capture. Commission stays on platform, not transferred.
- **RLS:** every table has row-level security. Admin client (service key) is only used inside edge functions — never exposed to mobile.
- **No client-side trust:** re-derive amounts server-side in every edge function. Never trust the amount sent by the client.
- **Idempotency:** all Stripe operations use idempotency keys. All webhook events are deduplicated via `webhook_events` table.
- Run `/cso` before every deploy for OWASP + STRIDE review.

## Testing & QA

- `pnpm typecheck` — must pass before every commit (pre-existing errors in `shippingPolicies.ts` and `catalog.ts` are known/pre-existing)
- `/qa https://shakana1.vercel.app` — run after every web deploy to verify golden paths
- Test: auth flow, order creation, invite link, payment sheet, escrow screen, tracking timeline

## Edge function rules

- All functions: verify JWT via `authedUserId()`, validate body shape, return `errorJson(e)` on failure
- Never throw after a Stripe operation without an idempotency key — retries must be safe
- Push notifications must never throw — wrap in `.catch(() => {})` so delivery failure doesn't roll back DB writes

## gstack (recommended)

This project uses [gstack](https://github.com/garrytan/gstack) for AI-assisted workflows.
Install it for the best experience:

```bash
git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup --team
```

**Which skill to use:**

| Task | Skill |
|------|-------|
| Before any deploy | `/cso` — OWASP + STRIDE security sweep |
| Code review / PR | `/review` — eng manager + senior reviewer |
| QA a deployed URL | `/qa https://shakana1.vercel.app` |
| Debug a production issue | `/investigate` |
| New feature planning | `/plan-eng-review` then `/autoplan` |
| Product direction | `/plan-ceo-review` |
| Ship a PR | `/ship` |
| All web browsing | `/browse` — never use mcp chrome tools directly |

Use `/browse` for all web browsing, never use `mcp__claude-in-chrome__*` tools.
Use `~/.claude/skills/gstack/...` for gstack file paths.
