-- Tighten two RLS policies that allowed unsafe client-side writes.

-- 1. Prevent creators from escalating order status via the client.
--    All status transitions must go through edge functions (admin client).
--    The `using` clause already restricts to draft/open rows; the `with check`
--    now also prevents the new row from leaving draft/open state.
drop policy if exists "orders creator update" on public.orders;
create policy "orders creator update" on public.orders
  for update using (
    creator_id = auth.uid() and status in ('draft', 'open')
  ) with check (
    creator_id = auth.uid() and status in ('draft', 'open')
  );

-- 2. Prevent inserting order items once an order is locked/completed/cancelled.
--    Inserting items into a locked order would affect the server-side
--    payment-intent amount calculation.
drop policy if exists "order_items self write" on public.order_items;
create policy "order_items self write" on public.order_items
  for insert with check (
    exists (
      select 1
      from public.participants pp
      join public.orders o on o.id = pp.order_id
      where pp.id = order_items.participant_id
        and pp.user_id = auth.uid()
        and o.status in ('open', 'paying')
    )
  );
