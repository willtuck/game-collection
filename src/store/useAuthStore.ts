import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthStore {
  user:           User    | null;
  session:        Session | null;
  loading:        boolean;
  authModalOpen:  boolean;
  isPremium:      boolean;

  setSession:     (session: Session | null) => void;
  openAuthModal:  () => void;
  closeAuthModal: () => void;
  signOut:        () => Promise<void>;
  setIsPremium:   (v: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user:          null,
  session:       null,
  loading:       true,
  authModalOpen: false,
  isPremium:     false,

  setSession: (session) =>
    set({ session, user: session?.user ?? null, loading: false }),

  openAuthModal:  () => set({ authModalOpen: true }),
  closeAuthModal: () => set({ authModalOpen: false }),

  setIsPremium: (v) => set({ isPremium: v }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, isPremium: false });
  },
}));
