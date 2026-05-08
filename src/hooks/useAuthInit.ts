import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useGameStore } from '../store/useGameStore';
import { fetchUserData, pushAllToDb } from '../lib/supabaseSync';

/**
 * Called once at the app root. Subscribes to auth state changes so the rest
 * of the app stays in sync. Data sync only runs on actual sign-in events —
 * not on token refreshes — to prevent periodic overwrites of local state.
 *
 * Sign-in merge strategy:
 *   • If the DB has data → DB wins, but locally-only games are preserved and pushed up.
 *   • If the DB is empty but local has data → push local data up to DB.
 */
export function useAuthInit() {
  const setSession = useAuthStore(s => s.setSession);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      // Only sync on real sign-in events; TOKEN_REFRESHED must not overwrite local state
      if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        syncOnSignIn(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession]);
}

export async function fetchPremiumStatus(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', userId)
    .single();
  useAuthStore.getState().setIsPremium(data?.is_premium ?? false);
}

async function syncOnSignIn(userId: string) {
  fetchPremiumStatus(userId);
  const { games: dbGames, shelves: dbShelves, error } = await fetchUserData(userId);
  if (error) return; // don't touch local state if Supabase is unreachable

  const localGames = useGameStore.getState().games;
  const localShelves = useGameStore.getState().shelves;

  if (dbGames.length > 0 || dbShelves.length > 0) {
    // Cloud has data — DB wins, but preserve local-only fields and locally-only games.
    const localById = new Map(localGames.map(g => [g.id, g]));
    const dbById    = new Map(dbGames.map(g => [g.id, g]));

    const mergedGames = dbGames.map(g => {
      const local = localById.get(g.id);
      return local
        ? { ...g, bggId: local.bggId ?? g.bggId, versionId: local.versionId ?? g.versionId, thumbnail: local.thumbnail ?? g.thumbnail, accentColor: local.accentColor ?? g.accentColor }
        : g;
    });

    // Preserve games that exist locally but not yet in DB (e.g. upsert hadn't completed)
    const localOnly = localGames.filter(g => !dbById.has(g.id));
    if (localOnly.length > 0) {
      await pushAllToDb(localOnly, [], userId);
    } else {
      // DB confirmed — no push needed, mark as synced directly
      useAuthStore.getState().setSyncStatus('synced');
    }
    mergedGames.push(...localOnly);

    useGameStore.setState({ games: mergedGames, shelves: dbShelves });
  } else {
    // Cloud is empty — push whatever is stored locally
    await pushAllToDb(localGames, localShelves, userId);
  }
}
