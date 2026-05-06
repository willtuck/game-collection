import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthStore {
  user:    User    | null;
  session: Session | null;
  loading: boolean;

  setSession: (session: Session | null) => void;
  signIn:     () => Promise<void>;
  signOut:    () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user:    null,
  session: null,
  loading: true,

  setSession: (session) =>
    set({ session, user: session?.user ?? null, loading: false }),

  signIn: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));
