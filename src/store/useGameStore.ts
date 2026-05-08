import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Game, ShelfUnit, Layout, ManualPlacement, StorageMode, ShelfSort } from '../lib/types';
import { shelfLabel } from '../lib/helpers';
import { useAuthStore } from './useAuthStore';
import {
  upsertGame, deleteGameDb, deleteAllGamesDb,
  upsertShelf, deleteShelfDb,
} from '../lib/supabaseSync';

const uid = () => useAuthStore.getState().user?.id ?? null;

// ── One-time localStorage key migration ──────────────────────────────────────
// Moves persisted data from the old 'game-collection-v1' key to 'shelfgeek-v1'
// before Zustand initialises, so no data is lost on the first load after deploy.
// Safe to run every boot: the guard prevents overwriting already-migrated data.
(function migrateStorageKey() {
  const OLD = 'game-collection-v1';
  const NEW = 'shelfgeek-v1';
  const oldData = localStorage.getItem(OLD);
  if (oldData && !localStorage.getItem(NEW)) {
    localStorage.setItem(NEW, oldData);
  }
  localStorage.removeItem(OLD);
})();

interface GameStore {
  // ── State ──
  games: Game[];
  shelves: ShelfUnit[];
  layouts: Layout[];
  shelfSort: ShelfSort;
  shelfMode: StorageMode;
  activeShelfId: string | null;

  // ── Game actions ──
  addGame: (game: Game) => void;
  updateGame: (id: string, updates: Partial<Game>) => void;
  deleteGame: (id: string) => void;
  clearAllGames: () => void;

  // ── Shelf unit actions ──
  addShelf: (model: string, label: string) => void;
  removeShelf: (id: string) => void;
  updateShelfLabel: (id: string, label: string) => void;
  setActiveShelf: (id: string) => void;

  // ── Layout actions ──
  addLayout: (layout: Layout) => void;
  updateLayout: (id: string, updates: Partial<Layout>) => void;
  deleteLayout: (id: string) => void;

  // ── Manual layout state ──
  manualShelves: ShelfUnit[];
  activeManualShelfId: string | null;
  manualPlacements: ManualPlacement[];
  pendingManualNav: { unitId: string; gameId: string } | null;
  pendingManualView: { unitId: string; cellIndex: number } | null;

  // ── Manual unit actions ──
  addManualShelf: (model: string, label: string) => void;
  removeManualShelf: (id: string) => void;
  updateManualShelfLabel: (id: string, label: string) => void;
  setActiveManualShelf: (id: string) => void;

  // ── Manual placement actions ──
  addManualPlacement: (p: ManualPlacement) => void;
  removeManualPlacement: (id: string) => void;
  updateManualCellMode: (unitId: string, cellIndex: number, mode: StorageMode) => void;
  reorderManualCell: (unitId: string, cellIndex: number, orderedIds: string[]) => void;
  setPendingManualNav: (nav: { unitId: string; gameId: string } | null) => void;
  setPendingManualView: (nav: { unitId: string; cellIndex: number } | null) => void;

  // ── Settings ──
  setShelfSort: (sort: ShelfSort) => void;
  setShelfMode: (mode: StorageMode) => void;

  // ── BGG ──
  bggUsername: string;
  setBggUsername: (username: string) => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      games: [],
      shelves: [],
      layouts: [],
      shelfSort: 'alpha',
      shelfMode: 'upright',
      activeShelfId: null,
      manualShelves: [],
      activeManualShelfId: null,
      manualPlacements: [],
      pendingManualNav: null,
      pendingManualView: null,

      addGame: (game) => {
        set(s => ({ games: [game, ...s.games] }));
        const userId = uid();
        if (userId) upsertGame(game, userId);
      },

      updateGame: (id, updates) => {
        set(s => ({ games: s.games.map(g => g.id === id ? { ...g, ...updates } : g) }));
        const userId = uid();
        if (userId) {
          const updated = get().games.find(g => g.id === id);
          if (updated) upsertGame(updated, userId);
        }
      },

      deleteGame: (id) => {
        set(s => ({ games: s.games.filter(g => g.id !== id) }));
        const userId = uid();
        if (userId) deleteGameDb(id);
      },

      clearAllGames: () => {
        const userId = uid();
        set({ games: [], manualPlacements: [] });
        if (userId) deleteAllGamesDb(userId);
      },

      addShelf: (model, label) => {
        const id = 'ku' + Date.now().toString(36);
        const resolvedLabel = label.trim() || shelfLabel(model);
        const shelf: ShelfUnit = { id, model, label: resolvedLabel };
        set(s => ({
          shelves: [...s.shelves, shelf],
          activeShelfId: id,
        }));
        const userId = uid();
        if (userId) upsertShelf(shelf, userId);
      },

      removeShelf: (id) => {
        set(s => {
          const next = s.shelves.filter(k => k.id !== id);
          return {
            shelves: next,
            activeShelfId: s.activeShelfId === id ? (next[0]?.id ?? null) : s.activeShelfId,
          };
        });
        const userId = uid();
        if (userId) deleteShelfDb(id);
      },

      updateShelfLabel: (id, label) => {
        set(s => ({
          shelves: s.shelves.map(k => k.id === id ? { ...k, label } : k),
        }));
        const userId = uid();
        if (userId) {
          const updated = get().shelves.find(k => k.id === id);
          if (updated) upsertShelf(updated, userId);
        }
      },

      setActiveShelf: (id) => set({ activeShelfId: id }),

      addLayout: (layout) =>
        set(s => ({ layouts: [...s.layouts, layout] })),

      updateLayout: (id, updates) =>
        set(s => ({
          layouts: s.layouts.map(l => l.id === id ? { ...l, ...updates } : l),
        })),

      deleteLayout: (id) =>
        set(s => ({ layouts: s.layouts.filter(l => l.id !== id) })),

      addManualShelf: (model, label) => {
        const id = 'mku' + Date.now().toString(36);
        const resolvedLabel = label.trim() || shelfLabel(model);
        const shelf: ShelfUnit = { id, model, label: resolvedLabel };
        set(s => ({
          manualShelves: [...s.manualShelves, shelf],
          activeManualShelfId: id,
        }));
      },

      removeManualShelf: (id) => {
        set(s => {
          const next = s.manualShelves.filter(k => k.id !== id);
          return {
            manualShelves: next,
            activeManualShelfId: s.activeManualShelfId === id ? (next[0]?.id ?? null) : s.activeManualShelfId,
            manualPlacements: s.manualPlacements.filter(p => p.unitId !== id),
          };
        });
      },

      updateManualShelfLabel: (id, label) => {
        set(s => ({
          manualShelves: s.manualShelves.map(k => k.id === id ? { ...k, label } : k),
        }));
      },

      setActiveManualShelf: (id) => set({ activeManualShelfId: id }),

      addManualPlacement: (p) => {
        set(s => {
          // If this game already has a placement in this unit, replace it
          const existing = s.manualPlacements.findIndex(mp => mp.gameId === p.gameId && mp.unitId === p.unitId);
          if (existing >= 0) {
            const next = [...s.manualPlacements];
            next[existing] = p;
            return { manualPlacements: next };
          }
          return { manualPlacements: [...s.manualPlacements, p] };
        });
      },

      removeManualPlacement: (id) => {
        set(s => ({ manualPlacements: s.manualPlacements.filter(p => p.id !== id) }));
      },

      updateManualCellMode: (unitId, cellIndex, mode) => {
        set(s => ({
          manualPlacements: s.manualPlacements.map(p =>
            p.unitId === unitId && p.cellIndex === cellIndex ? { ...p, storageMode: mode } : p
          ),
        }));
      },

      reorderManualCell: (unitId, cellIndex, orderedIds) => {
        set(s => {
          const cellPlacements = orderedIds
            .map(id => s.manualPlacements.find(p => p.id === id))
            .filter(Boolean) as ManualPlacement[];
          const otherPlacements = s.manualPlacements.filter(
            p => !(p.unitId === unitId && p.cellIndex === cellIndex)
          );
          return { manualPlacements: [...otherPlacements, ...cellPlacements] };
        });
      },

      setPendingManualNav: (nav: { unitId: string; gameId: string } | null) => set({ pendingManualNav: nav }),
      setPendingManualView: (nav: { unitId: string; cellIndex: number } | null) => set({ pendingManualView: nav }),

      setShelfSort: (sort) => set({ shelfSort: sort }),
      setShelfMode: (mode) => set({ shelfMode: mode }),

      bggUsername: '',
      setBggUsername: (username) => set({ bggUsername: username }),
    }),
    {
      name: 'shelfgeek-v1',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          return {
            ...persistedState,
            shelves:             persistedState.kallaxes          ?? [],
            manualShelves:       persistedState.manualKallaxes    ?? [],
            activeShelfId:       persistedState.activeKuId        ?? null,
            activeManualShelfId: persistedState.activeManualKuId  ?? null,
            shelfSort:           persistedState.kallaxSort        ?? 'alpha',
            shelfMode:           persistedState.kallaxMode        ?? 'upright',
          };
        }
        return persistedState as any;
      },
    }
  )
);
