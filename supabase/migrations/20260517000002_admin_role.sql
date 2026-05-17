-- Admin role + ban flag + audit log.
-- Column-level UPDATE is revoked from authenticated so users physically
-- cannot grant themselves admin or unban themselves via the client.

alter table public.profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists banned_at timestamptz;

revoke update (is_admin, banned_at) on public.profiles from authenticated, anon;

create index if not exists profiles_is_admin_idx on public.profiles(is_admin) where is_admin = true;
create index if not exists profiles_banned_at_idx on public.profiles(banned_at) where banned_at is not null;

-- ── Audit log of every admin-initiated action. ──────────────────────────
create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  target_order_id uuid references public.orders(id) on delete set null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_actions_admin_idx on public.admin_actions(admin_id);
create index if not exists admin_actions_target_order_idx on public.admin_actions(target_order_id);
create index if not exists admin_actions_target_user_idx on public.admin_actions(target_user_id);

alter table public.admin_actions enable row level security;
-- Service role only. No policies → no access from client.
revoke all on public.admin_actions from anon, authenticated;

-- ── Bootstrap: founder is the first admin. ──────────────────────────────
update public.profiles
set is_admin = true
where id in (
  select id from auth.users where lower(email) = 'sharonekub@gmail.com'
);
