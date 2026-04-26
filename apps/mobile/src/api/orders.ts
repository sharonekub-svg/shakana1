import { useEffect } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { invokeFn, supabase } from '@/lib/supabase';
import { newIdempotencyKey } from '@/utils/idempotency';
import { track } from '@/lib/posthog';
import type { Order, OrderItem, Participant } from '@/types/domain';

type CreateOrderInput = {
  productUrl: string;
  productTitle: string;
  productPriceAgorot: number;
  productImage?: string;
  maxParticipants: number;
};

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const res = await invokeFn<{ order: Order }>('create-order', {
        ...input,
        idempotency_key: newIdempotencyKey(),
      });
      track('start_order_clicked', { orderId: res.order.id });
      return res.order;
    },
  });
}

export function useOrder(orderId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['order', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      if (!orderId) throw new Error('missing orderId');
      const [orderRes, partsRes, itemsRes] = await Promise.all([
        supabase.from('orders').select('*').eq('id', orderId).single(),
        supabase
          .from('participants')
          .select('*')
          .eq('order_id', orderId)
          .order('joined_at', { ascending: true }),
        supabase.from('order_items').select('*').eq('order_id', orderId),
      ]);
      if (orderRes.error) throw orderRes.error;
      if (partsRes.error) throw partsRes.error;
      if (itemsRes.error) throw itemsRes.error;
      return {
        order: orderRes.data as Order,
        participants: (partsRes.data ?? []) as Participant[],
        items: (itemsRes.data ?? []) as OrderItem[],
      };
    },
  });

  // Subscribe to realtime changes on this order + its participants.
  useEffect(() => {
    if (!orderId) return;
    const ch = supabase
      .channel(`order:${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        () => qc.invalidateQueries({ queryKey: ['order', orderId] }),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `order_id=eq.${orderId}`,
        },
        () => qc.invalidateQueries({ queryKey: ['order', orderId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [orderId, qc]);

  return query;
}

export function useUserOrders(userId: string | undefined) {
  return useQuery({
    queryKey: ['userOrders', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, participants!inner(user_id)')
        .eq('participants.user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });
}

export function useConfirmDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      return invokeFn<{ ok: true }>('confirm-delivery', {
        orderId,
        idempotency_key: newIdempotencyKey(),
      });
    },
    onSuccess: (_d, orderId) => {
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      track('order_completed', { orderId });
    },
  });
}
