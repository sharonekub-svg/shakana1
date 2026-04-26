-- Virtual Credit Card (Stripe Issuing) tables.
-- Added in the VCC redesign: when an order's accumulated balance reaches
-- the target, the platform mints a one-time card via Stripe Issuing whose
-- spending limit equals the order amount. The order creator pastes the
-- card into the merchant checkout. Authorizations are approved/declined
-- in real time by the issuing webhook against this table.

create table if not exists public.virtual_cards (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  stripe_card_id text not null unique,
  stripe_cardholder_id text not null,
  status text not null default 'active'
    check (status in ('pending','active','used','cancelled','expired')),
  last4 text,
  exp_month integer,
  exp_year integer,
  brand text,
  spending_limit_agorot integer not null check (spending_limit_agorot > 0),
  spent_agorot integer not null default 0 check (spent_agorot >= 0),
  issued_at timestamptz not null default now(),
  used_at timestamptz,
  cancelled_at timestamptz
);

create index if not exists virtual_cards_order_idx on public.virtual_cards(order_id);
create index if not exists virtual_cards_status_idx on public.virtual_cards(status);

alter table public.virtual_cards enable row level security;

-- Members of the order can read the row's existence (for status), but the
-- full PAN is never stored — it lives only in Stripe and is fetched on
-- demand by the issue-card function (returned once over TLS to the client).
drop policy if exists "virtual_cards member read" on public.virtual_cards;
create policy "virtual_cards member read" on public.virtual_cards
  for select using (
    exists (
      select 1 from public.participants pp
      where pp.order_id = virtual_cards.order_id and pp.user_id = auth.uid()
    )
  );

-- ── Card authorizations ledger (one row per Stripe issuing_authorization)
create table if not exists public.card_authorizations (
  id uuid primary key default gen_random_uuid(),
  virtual_card_id uuid not null references public.virtual_cards(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  stripe_authorization_id text not null unique,
  merchant_name text,
  merchant_category text,
  amount_agorot integer not null,
  currency text not null default 'ils',
  approved boolean not null,
  decline_reason text,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index if not exists card_authorizations_card_idx on public.card_authorizations(virtual_card_id);
create index if not exists card_authorizations_order_idx on public.card_authorizations(order_id);

alter table public.card_authorizations enable row level security;
-- No client policy → service role only.

-- ── Order status enum: add card_issued ──────────────────────────────────
do $$ begin
  alter type order_status add value if not exists 'card_issued' before 'delivered';
exception when others then
  -- Some PG versions can't reorder enum values; just append.
  begin
    alter type order_status add value if not exists 'card_issued';
  exception when others then null; end;
end $$;
