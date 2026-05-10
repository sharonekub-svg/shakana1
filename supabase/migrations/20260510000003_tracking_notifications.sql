-- Push tokens: one row per device per user.
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null default 'unknown',
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

-- Users can only manage their own tokens.
create policy "push_tokens self manage" on public.push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tracking events: one row per shipping milestone per order.
create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  shipping_status text not null,
  label text not null,
  location text,
  note text,
  at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists tracking_events_order_idx on public.tracking_events(order_id, at);

alter table public.tracking_events enable row level security;

-- Order participants can read tracking events.
create policy "tracking_events participants read" on public.tracking_events
  for select using (
    exists (
      select 1 from public.participants pp
      where pp.order_id = tracking_events.order_id and pp.user_id = auth.uid()
    )
  );

-- Add to realtime so the escrow screen updates live.
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'tracking_events'
  ) then
    execute 'alter publication supabase_realtime add table public.tracking_events';
  end if;
end $$;
