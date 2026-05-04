import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Game, KallaxUnit, Layout, ManualPlacement, StorageMode, KallaxSort } from '../lib/types';
import { kuLabel } from '../lib/helpers';
import { useAuthStore } from './useAuthStore';
import {
  upsertGame, deleteGameDb, deleteAllGamesDb,
  upsertKallax, deleteKallaxDb,
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
  kallaxes: KallaxUnit[];
  layouts: Layout[];
  kallaxSort: KallaxSort;
  kallaxMode: StorageMode;
  activeKuId: string | null;

  // ── Game actions ──
  addGame: (game: Game) => void;
  updateGame: (id: string, updates: Partial<Game>) => void;
  deleteGame: (id: string) => void;
  clearAllGames: () => void;

  // ── Kallax unit actions ──
  addKallax: (model: string, label: string) => void;
  removeKallax: (id: string) => void;
  updateKallaxLabel: (id: string, label: string) => void;
  setActiveKu: (id: string) => void;

  // ── Layout actions ──
  addLayout: (layout: Layout) => void;
  updateLayout: (id: string, updates: Partial<Layout>) => void;
  deleteLayout: (id: string) => void;

  // ── Manual layout state ──
  manualKallaxes: KallaxUnit[];
  activeManualKuId: string | null;
  manualPlacements: ManualPlacement[];
  pendingManualNav: { unitId: string; gameId: string } | null;
  pendingManualView: { unitId: string; cellIndex: number } | null;

  // ── Manual unit actions ──
  addManualKallax: (model: string, label: string) => void;
  removeManualKallax: (id: string) => void;
  updateManualKallaxLabel: (id: string, label: string) => void;
  setActiveManualKu: (id: string) => void;

  // ── Manual placement actions ──
  addManualPlacement: (p: ManualPlacement) => void;
  removeManualPlacement: (id: string) => void;
  updateManualCellMode: (unitId: string, cellIndex: number, mode: StorageMode) => void;
  reorderManualCell: (unitId: string, cellIndex: number, orderedIds: string[]) => void;
  setPendingManualNav: (nav: { unitId: string; gameId: string } | null) => void;
  setPendingManualView: (nav: { unitId: string; cellIndex: number } | null) => void;

  // ── Settings ──
  setKallaxSort: (sort: KallaxSort) => void;
  setKallaxMode: (mode: StorageMode) => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      games: [],
      kallaxes: [],
      layouts: [],
      kallaxSort: 'alpha',
      kallaxMode: 'upright',
      activeKuId: null,
      manualKallaxes: [],
      activeManualKuId: null,
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

      addKallax: (model, label) => {
        const id = 'ku' + Date.now().toString(36);
        const resolvedLabel = label.trim() || kuLabel(model);
        const ku: KallaxUnit = { id, model, label: resolvedLabel };
        set(s => ({
          kallaxes: [...s.kallaxes, ku],
          activeKuId: id,
        }));
        const userId = uid();
        if (userId) upsertKallax(ku, userId);
      },

      removeKallax: (id) => {
        set(s => {
          const next = s.kallaxes.filter(k => k.id !== id);
          return {
            kallaxes: next,
            activeKuId: s.activeKuId === id ? (next[0]?.id ?? null) : s.activeKuId,
          };
        });
        const userId = uid();
        if (userId) deleteKallaxDb(id);
      },

      updateKallaxLabel: (id, label) => {
        set(s => ({
          kallaxes: s.kallaxes.map(k => k.id === id ? { ...k, label } : k),
        }));
        const userId = uid();
        if (userId) {
          const updated = get().kallaxes.find(k => k.id === id);
          if (updated) upsertKallax(updated, userId);
        }
      },

      setActiveKu: (id) => set({ activeKuId: id }),

      addLayout: (layout) =>
        set(s => ({ layouts: [...s.layouts, layout] })),

      updateLayout: (id, updates) =>
        set(s => ({
          layouts: s.layouts.map(l => l.id === id ? { ...l, ...updates } : l),
        })),

      deleteLayout: (id) =>
        set(s => ({ layouts: s.layouts.filter(l => l.id !== id) })),

      addManualKallax: (model, label) => {
        const id = 'mku' + Date.now().toString(36);
        const resolvedLabel = label.trim() || kuLabel(model);
        const ku: KallaxUnit = { id, model, label: resolvedLabel };
        set(s => ({
          manualKallaxes: [...s.manualKallaxes, ku],
          activeManualKuId: id,
        }));
      },

      removeManualKallax: (id) => {
        set(s => {
          const next = s.manualKallaxes.filter(k => k.id !== id);
          return {
            manualKallaxes: next,
            activeManualKuId: s.activeManualKuId === id ? (next[0]?.id ?? null) : s.activeManualKuId,
            manualPlacements: s.manualPlacements.filter(p => p.unitId !== id),
          };
        });
      },

      updateManualKallaxLabel: (id, label) => {
        set(s => ({
          manualKallaxes: s.manualKallaxes.map(k => k.id === id ? { ...k, label } : k),
        }));
      },

      setActiveManualKu: (id) => set({ activeManualKuId: id }),

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

      setKallaxSort: (sort) => set({ kallaxSort: sort }),
      setKallaxMode: (mode) => set({ kallaxMode: mode }),
    }),
    {
      name: 'shelfgeek-v1',
    }
  )
);
