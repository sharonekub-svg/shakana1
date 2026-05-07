create table if not exists public.demo_group_orders (
  invite_code text primary key,
  order_payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.demo_group_orders enable row level security;

drop policy if exists "demo_group_orders_service_role_only" on public.demo_group_orders;
create policy "demo_group_orders_service_role_only"
on public.demo_group_orders
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
