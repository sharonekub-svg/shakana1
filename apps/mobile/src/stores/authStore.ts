import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/types/domain';

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  hydrated: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setHydrated: (hydrated: boolean) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  hydrated: false,
  setSession: (session) =>
    set((state) => (state.session === session && state.user === (session?.user ?? null) ? state : { session, user: session?.user ?? null })),
  setProfile: (profile) => set((state) => (state.profile === profile ? state : { profile })),
  setHydrated: (hydrated) => set((state) => (state.hydrated === hydrated ? state : { hydrated })),
  reset: () => set({ session: null, user: null, profile: null }),
}));
