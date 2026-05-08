import { supabase } from './supabase';
import { useAuthStore } from '../store/useAuthStore';
import type { Game, ShelfUnit } from './types';

// ── Pending-op tracker ───────────────────────────────────────────────────────
let _pending = 0;
let _hasError = false;

function onSyncStart() {
  if (_pending === 0) _hasError = false; // reset error state at the start of each new batch
  _pending++;
  useAuthStore.getState().setSyncStatus('syncing');
}

function onSyncDone(error = false) {
  if (error) _hasError = true;
  _pending = Math.max(0, _pending - 1);
  if (_pending === 0) {
    useAuthStore.getState().setSyncStatus(_hasError ? 'error' : 'synced');
  }
}

// ── Mapping helpers ──────────────────────────────────────────────────────────

function gameToRow(game: Game, userId: string) {
  return {
    id:            game.id,
    user_id:       userId,
    bgg_id:        game.bggId         ?? null,
    thumbnail:     game.thumbnail     ?? null,
    name:          game.name,
    type:          game.type          ?? null,
    base_game_id:  game.baseGameId    ?? null,
    stored_inside: game.storedInside  ?? null,
    group_name:    game.groupName     ?? null,
    width:         game.width,
    height:        game.height,
    depth:         game.depth,
    unit:          game.unit,
    added:         game.added,
  };
}

function rowToGame(row: Record<string, unknown>): Game {
  return {
    id:           row.id           as string,
    bggId:        (row.bgg_id      as string | null) ?? undefined,
    thumbnail:    (row.thumbnail   as string | null) ?? undefined,
    name:         row.name         as string,
    type:         row.type         as 'expansion' | undefined,
    baseGameId:   row.base_game_id as string | undefined,
    storedInside: row.stored_inside as boolean | undefined,
    groupName:    row.group_name   as string | undefined,
    width:        row.width        as string | null,
    height:       row.height       as string | null,
    depth:        row.depth        as string | null,
    unit:         (row.unit as 'cm' | 'in') ?? 'cm',
    added:        row.added        as string,
  };
}

function shelfToRow(shelf: ShelfUnit, userId: string) {
  return { id: shelf.id, user_id: userId, model: shelf.model, label: shelf.label };
}

function rowToShelf(row: Record<string, unknown>): ShelfUnit {
  return {
    id:    row.id    as string,
    model: row.model as string,
    label: row.label as string,
  };
}

// ── Single-record mutations ──────────────────────────────────────────────────

export async function upsertGame(game: Game, userId: string) {
  onSyncStart();
  const { error } = await supabase.from('games').upsert(gameToRow(game, userId));
  if (error) console.error('[sync] upsertGame:', error.message);
  onSyncDone(!!error);
}

export async function deleteGameDb(id: string) {
  onSyncStart();
  const { error } = await supabase.from('games').delete().eq('id', id);
  if (error) console.error('[sync] deleteGameDb:', error.message);
  onSyncDone(!!error);
}

export async function deleteAllGamesDb(userId: string) {
  onSyncStart();
  const { error } = await supabase.from('games').delete().eq('user_id', userId);
  if (error) console.error('[sync] deleteAllGamesDb:', error.message);
  onSyncDone(!!error);
}

export async function upsertShelf(shelf: ShelfUnit, userId: string) {
  onSyncStart();
  const { error } = await supabase.from('shelves').upsert(shelfToRow(shelf, userId));
  if (error) console.error('[sync] upsertShelf:', error.message);
  onSyncDone(!!error);
}

export async function deleteShelfDb(id: string) {
  onSyncStart();
  const { error } = await supabase.from('shelves').delete().eq('id', id);
  if (error) console.error('[sync] deleteShelfDb:', error.message);
  onSyncDone(!!error);
}

// ── Bulk operations (used on sign-in) ────────────────────────────────────────

export async function fetchUserData(userId: string): Promise<{ games: Game[]; shelves: ShelfUnit[]; error?: string }> {
  const [gamesRes, shelvesRes] = await Promise.all([
    supabase.from('games').select('*').eq('user_id', userId),
    supabase.from('shelves').select('*').eq('user_id', userId),
  ]);
  if (gamesRes.error || shelvesRes.error) {
    const msg = gamesRes.error?.message ?? shelvesRes.error?.message;
    console.error('[sync] fetchUserData:', msg);
    return { games: [], shelves: [], error: msg };
  }
  return {
    games:   (gamesRes.data   ?? []).map(r => rowToGame(r  as Record<string, unknown>)),
    shelves: (shelvesRes.data ?? []).map(r => rowToShelf(r as Record<string, unknown>)),
  };
}

export async function pushAllToDb(games: Game[], shelves: ShelfUnit[], userId: string) {
  onSyncStart();
  let anyError = false;
  if (games.length) {
    const { error } = await supabase.from('games').upsert(games.map(g => gameToRow(g, userId)));
    if (error) { console.error('[sync] pushAllToDb games:', error.message); anyError = true; }
  }
  if (shelves.length) {
    const { error } = await supabase.from('shelves').upsert(shelves.map(s => shelfToRow(s, userId)));
    if (error) { console.error('[sync] pushAllToDb shelves:', error.message); anyError = true; }
  }
  onSyncDone(anyError);
}
