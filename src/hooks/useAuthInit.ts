import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useGameStore } from '../store/useGameStore';
import { fetchUserData, pushAllToDb } from '../lib/supabaseSync';

/**
 * Called once at the app root. Restores any existing session and subscribes
 * to auth state changes so the rest of the app stays in sync.
 *
 * Sign-in merge strategy:
 *   • If the DB already has data → DB wins (replace local state).
 *   • If the DB is empty but local has data → push local data up to DB.
 */
export function useAuthInit() {
  const setSession = useAuthStore(s => s.setSession);

  useEffect(() => {
    // Restore session on mount (handles page refresh and OAuth redirect)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) syncOnSignIn(session.user.id);
    });

    // Listen for future sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) syncOnSignIn(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);
}

async function syncOnSignIn(userId: string) {
  const { games: dbGames, kallaxes: dbKallaxes } = await fetchUserData(userId);

  if (dbGames.length > 0 || dbKallaxes.length > 0) {
    // Cloud has data — it's the source of truth, but preserve local-only
    // fields (bggId, thumbnail) that the DB schema may not yet store.
    const localById = new Map(useGameStore.getState().games.map(g => [g.id, g]));
    const mergedGames = dbGames.map(g => {
      const local = localById.get(g.id);
      return local
        ? { ...g, bggId: local.bggId ?? g.bggId, thumbnail: local.thumbnail ?? g.thumbnail }
        : g;
    });
    useGameStore.setState({ games: mergedGames, kallaxes: dbKallaxes });
  } else {
    // Cloud is empty — push whatever is stored locally
    const { games: localGames, kallaxes: localKallaxes } = useGameStore.getState();
    await pushAllToDb(localGames, localKallaxes, userId);
  }
}
