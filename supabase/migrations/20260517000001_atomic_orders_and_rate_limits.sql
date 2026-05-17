-- Hardening pass: atomic create_order RPC, NOT NULL commission, rate limiting table.

-- 1. Backfill and lock down commission_agorot.
update public.participants set commission_agorot = 0 where commission_agorot is null;
alter table public.participants
  alter column commission_agorot set default 0,
  alter column commission_agorot set not null;

-- 2. Atomic order creation. Wraps order + creator participant + creator item insert
-- in a single transaction so a partial failure cannot leave orphaned rows.
create or replace function public.create_order_atomic(
  p_creator_id uuid,
  p_building_id uuid,
  p_product_url text,
  p_product_title text,
  p_product_image text,
  p_product_price_agorot integer,
  p_max_participants integer,
  p_stripe_transfer_group text,
  p_store_key text,
  p_store_label text,
  p_estimated_shipping_agorot integer,
  p_free_shipping_threshold_agorot integer,
  p_closes_at timestamptz,
  p_edit_locks_at timestamptz,
  p_pickup_responsible_name text,
  p_preferred_pickup_location text,
  p_amount_agorot integer
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_participant_id uuid;
begin
  insert into public.orders (
    creator_id, building_id, product_url, product_title, product_image,
    product_price_agorot, max_participants, stripe_transfer_group, status,
    store_key, store_label, estimated_shipping_agorot, free_shipping_threshold_agorot,
    closes_at, edit_locks_at, founder_checkout_url,
    pickup_responsible_user_id, pickup_responsible_name, preferred_pickup_location
  ) values (
    p_creator_id, p_building_id, p_product_url, p_product_title, p_product_image,
    p_product_price_agorot, p_max_participants, p_stripe_transfer_group, 'open',
    p_store_key, p_store_label, p_estimated_shipping_agorot, p_free_shipping_threshold_agorot,
    p_closes_at, p_edit_locks_at, p_product_url,
    p_creator_id, p_pickup_responsible_name, p_preferred_pickup_location
  )
  returning * into v_order;

  insert into public.participants (order_id, user_id, status, amount_agorot)
  values (v_order.id, p_creator_id, 'joined', p_amount_agorot)
  returning id into v_participant_id;

  insert into public.order_items (order_id, participant_id, title, ref, size, price_agorot)
  values (v_order.id, v_participant_id, p_product_title, p_product_url, null, p_product_price_agorot);

  return v_order;
end;
$$;

revoke all on function public.create_order_atomic(uuid, uuid, text, text, text, integer, integer, text, text, text, integer, integer, timestamptz, timestamptz, text, text, integer) from public;
revoke all on function public.create_order_atomic(uuid, uuid, text, text, text, integer, integer, text, text, text, integer, integer, timestamptz, timestamptz, text, text, integer) from anon;
revoke all on function public.create_order_atomic(uuid, uuid, text, text, text, integer, integer, text, text, text, integer, integer, timestamptz, timestamptz, text, text, integer) from authenticated;

-- 3. Persistent rate limit table. Each row is a token-bucket window for one
-- (user_id, endpoint) pair. Rows older than 1 hour are pruned by edge fn helper.
create table if not exists public.rate_limits (
  user_id uuid not null,
  endpoint text not null,
  window_start timestamptz not null default now(),
  request_count integer not null default 0,
  primary key (user_id, endpoint, window_start)
);

create index if not exists rate_limits_endpoint_window_idx
  on public.rate_limits (endpoint, window_start);

alter table public.rate_limits enable row level security;
-- No policies: service role only.
revoke all on public.rate_limits from anon, authenticated;
