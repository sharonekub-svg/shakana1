import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { invokeFn } from '@/lib/supabase';

export type AdminOrder = {
  id: string;
  creator_id: string;
  status: string;
  product_title: string | null;
  product_price_agorot: number;
  max_participants: number;
  store_label: string | null;
  created_at: string;
  cancelled_at: string | null;
  completed_at: string | null;
};

export type AdminUser = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  street: string;
  building: string;
  is_admin: boolean;
  banned_at: string | null;
  created_at: string;
};

type ListPage<T extends 'orders' | 'users'> = {
  total: number;
  page: number;
  pageSize: number;
} & (T extends 'orders' ? { orders: AdminOrder[] } : { users: AdminUser[] });

export function useAdminOrders(args: { status?: string; q?: string; page?: number }) {
  return useQuery({
    queryKey: ['admin', 'orders', args],
    placeholderData: keepPreviousData,
    queryFn: () => invokeFn<ListPage<'orders'>>('admin-list-orders', args),
  });
}

export function useAdminUsers(args: { q?: string; banned?: boolean; page?: number }) {
  return useQuery({
    queryKey: ['admin', 'users', args],
    placeholderData: keepPreviousData,
    queryFn: () => invokeFn<ListPage<'users'>>('admin-list-users', args),
  });
}

export function useAdminCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { orderId: string; reason?: string }) =>
      invokeFn<{ ok: true }>('admin-cancel-order', args),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });
}

export function useAdminBanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { userId: string; banned: boolean; reason?: string }) =>
      invokeFn<{ ok: true }>('admin-ban-user', args),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}
