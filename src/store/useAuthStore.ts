import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface AuthStore {
  user:           User    | null;
  session:        Session | null;
  loading:        boolean;
  authModalOpen:  boolean;
  isPremium:      boolean;
  syncStatus:     SyncStatus;

  setSession:     (session: Session | null) => void;
  openAuthModal:  () => void;
  closeAuthModal: () => void;
  signOut:        () => Promise<void>;
  setIsPremium:   (v: boolean) => void;
  setSyncStatus:  (s: SyncStatus) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user:          null,
  session:       null,
  loading:       true,
  authModalOpen: false,
  isPremium:     false,
  syncStatus:    'idle',

  setSession: (session) =>
    set({ session, user: session?.user ?? null, loading: false }),

  openAuthModal:  () => set({ authModalOpen: true }),
  closeAuthModal: () => set({ authModalOpen: false }),

  setIsPremium:  (v) => set({ isPremium: v }),
  setSyncStatus: (s) => set({ syncStatus: s }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, isPremium: false, syncStatus: 'idle' });
  },
}));
