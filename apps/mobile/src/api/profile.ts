import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/domain';

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertProfile() {
  return useMutation({
    mutationFn: async (p: Profile) => {
      const { error } = await supabase.from('profiles').upsert(p as never, { onConflict: 'id' });
      if (error) throw error;
      return p;
    },
  });
}
