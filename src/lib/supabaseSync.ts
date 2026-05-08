import { supabase } from './supabase';
import type { Game, KallaxUnit } from './types';

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

function kuToRow(ku: KallaxUnit, userId: string) {
  return { id: ku.id, user_id: userId, model: ku.model, label: ku.label };
}

function rowToKu(row: Record<string, unknown>): KallaxUnit {
  return {
    id:    row.id    as string,
    model: row.model as string,
    label: row.label as string,
  };
}

// ── Single-record mutations ──────────────────────────────────────────────────

export async function upsertGame(game: Game, userId: string) {
  const { error } = await supabase.from('games').upsert(gameToRow(game, userId));
  if (error) console.error('[sync] upsertGame:', error.message);
}

export async function deleteGameDb(id: string) {
  const { error } = await supabase.from('games').delete().eq('id', id);
  if (error) console.error('[sync] deleteGameDb:', error.message);
}

export async function deleteAllGamesDb(userId: string) {
  const { error } = await supabase.from('games').delete().eq('user_id', userId);
  if (error) console.error('[sync] deleteAllGamesDb:', error.message);
}

export async function upsertKallax(ku: KallaxUnit, userId: string) {
  const { error } = await supabase.from('kallax_units').upsert(kuToRow(ku, userId));
  if (error) console.error('[sync] upsertKallax:', error.message);
}

export async function deleteKallaxDb(id: string) {
  const { error } = await supabase.from('kallax_units').delete().eq('id', id);
  if (error) console.error('[sync] deleteKallaxDb:', error.message);
}

// ── Bulk operations (used on sign-in) ────────────────────────────────────────

export async function fetchUserData(userId: string): Promise<{ games: Game[]; kallaxes: KallaxUnit[]; error?: string }> {
  const [gamesRes, kallaxRes] = await Promise.all([
    supabase.from('games').select('*').eq('user_id', userId),
    supabase.from('kallax_units').select('*').eq('user_id', userId),
  ]);
  if (gamesRes.error || kallaxRes.error) {
    const msg = gamesRes.error?.message ?? kallaxRes.error?.message;
    console.error('[sync] fetchUserData:', msg);
    return { games: [], kallaxes: [], error: msg };
  }
  return {
    games:    (gamesRes.data  ?? []).map(r => rowToGame(r as Record<string, unknown>)),
    kallaxes: (kallaxRes.data ?? []).map(r => rowToKu(r  as Record<string, unknown>)),
  };
}

export async function pushAllToDb(games: Game[], kallaxes: KallaxUnit[], userId: string) {
  if (games.length) {
    const { error } = await supabase.from('games').upsert(games.map(g => gameToRow(g, userId)));
    if (error) console.error('[sync] pushAllToDb games:', error.message);
  }
  if (kallaxes.length) {
    const { error } = await supabase.from('kallax_units').upsert(kallaxes.map(k => kuToRow(k, userId)));
    if (error) console.error('[sync] pushAllToDb kallaxes:', error.message);
  }
}
