import { useMutation } from '@tanstack/react-query';
import { invokeFn } from '@/lib/supabase';
import { newIdempotencyKey } from '@/utils/idempotency';

export type IssuedCard = {
  number?: string;
  cvc?: string;
  exp_month: number;
  exp_year: number;
  last4: string | null;
  brand: string | null;
  spendingLimitAgorot: number;
};

export function useIssueCard(orderId: string) {
  return useMutation({
    mutationFn: async () => {
      return invokeFn<IssuedCard>('issue-card', {
        orderId,
        idempotency_key: newIdempotencyKey(),
      });
    },
  });
}
