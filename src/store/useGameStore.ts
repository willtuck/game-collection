import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Game, KallaxUnit, Layout, StorageMode, KallaxSort } from '../lib/types';
import { kuLabel } from '../lib/helpers';

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

  // ── Kallax unit actions ──
  addKallax: (model: string, label: string) => void;
  removeKallax: (id: string) => void;
  updateKallaxLabel: (id: string, label: string) => void;
  setActiveKu: (id: string) => void;

  // ── Layout actions ──
  addLayout: (layout: Layout) => void;
  updateLayout: (id: string, updates: Partial<Layout>) => void;
  deleteLayout: (id: string) => void;

  // ── Settings ──
  setKallaxSort: (sort: KallaxSort) => void;
  setKallaxMode: (mode: StorageMode) => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      games: [],
      kallaxes: [{ id: 'ku1', model: '2x4', label: 'My Kallax' }],
      layouts: [],
      kallaxSort: 'alpha',
      kallaxMode: 'upright',
      activeKuId: 'ku1',

      addGame: (game) =>
        set(s => ({ games: [game, ...s.games] })),

      updateGame: (id, updates) =>
        set(s => ({ games: s.games.map(g => g.id === id ? { ...g, ...updates } : g) })),

      deleteGame: (id) =>
        set(s => ({ games: s.games.filter(g => g.id !== id) })),

      addKallax: (model, label) => {
        const id = 'ku' + Date.now().toString(36);
        const resolvedLabel = label.trim() || kuLabel(model);
        set(s => ({
          kallaxes: [...s.kallaxes, { id, model, label: resolvedLabel }],
          activeKuId: id,
        }));
      },

      removeKallax: (id) =>
        set(s => {
          const next = s.kallaxes.filter(k => k.id !== id);
          return {
            kallaxes: next,
            activeKuId: s.activeKuId === id ? (next[0]?.id ?? null) : s.activeKuId,
          };
        }),

      updateKallaxLabel: (id, label) =>
        set(s => ({
          kallaxes: s.kallaxes.map(k => k.id === id ? { ...k, label } : k),
        })),

      setActiveKu: (id) => set({ activeKuId: id }),

      addLayout: (layout) =>
        set(s => ({ layouts: [...s.layouts, layout] })),

      updateLayout: (id, updates) =>
        set(s => ({
          layouts: s.layouts.map(l => l.id === id ? { ...l, ...updates } : l),
        })),

      deleteLayout: (id) =>
        set(s => ({ layouts: s.layouts.filter(l => l.id !== id) })),

      setKallaxSort: (sort) => set({ kallaxSort: sort }),
      setKallaxMode: (mode) => set({ kallaxMode: mode }),
    }),
    {
      name: 'game-collection-v1',
    }
  )
);
