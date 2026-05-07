import { useState, useMemo } from 'react';
import { CollectionToolbar } from './CollectionToolbar';
import { GameGrid } from './GameGrid';
import { FAB } from '../shared/FAB';
import { AddGameSheet } from '../sheets/AddGameSheet';
import { FilterSheet, type FilterState } from '../sheets/FilterSheet';
import { ConfirmSheet } from '../shared/ConfirmSheet';
import { UpgradeSheet } from '../shared/UpgradeSheet';
import { useGameStore } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { hasDims } from '../../lib/helpers';
import { toast } from '../shared/Toast';
import styles from './CollectionView.module.css';

const FREE_GAME_LIMIT = 20;

const DEFAULT_FILTERS: FilterState = {
  typeFilter: 'all',
  dimsFilter: 'all',
  sort: 'name-asc',
};

export function CollectionView() {
  const games = useGameStore(s => s.games);
  const deleteGame            = useGameStore(s => s.deleteGame);
  const manualPlacements      = useGameStore(s => s.manualPlacements);
  const removeManualPlacement = useGameStore(s => s.removeManualPlacement);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const isPremium = useAuthStore(s => s.isPremium);
  const [addOpen, setAddOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function handleFabClick() {
    if (!isPremium && games.length >= FREE_GAME_LIMIT) {
      setUpgradeOpen(true);
    } else {
      setAddOpen(true);
    }
  }

  const activeFilterCount = [
    filters.typeFilter !== 'all',
    filters.dimsFilter !== 'all',
    filters.sort !== 'name-asc',
  ].filter(Boolean).length;

  const filtered = useMemo(() => {
    let list = [...games];
    const q = search.toLowerCase();
    if (q) list = list.filter(g => g.name.toLowerCase().includes(q));
    if (filters.typeFilter === 'base')      list = list.filter(g => g.type !== 'expansion');
    if (filters.typeFilter === 'expansion') list = list.filter(g => g.type === 'expansion');
    if (filters.dimsFilter === 'has')     list = list.filter(g => hasDims(g));
    if (filters.dimsFilter === 'missing') list = list.filter(g => !hasDims(g));
    list.sort((a, b) => {
      switch (filters.sort) {
        case 'name-asc':      return a.name.localeCompare(b.name);
        case 'name-desc':     return b.name.localeCompare(a.name);
        case 'date-desc':     return new Date(b.added).getTime() - new Date(a.added).getTime();
        case 'date-asc':      return new Date(a.added).getTime() - new Date(b.added).getTime();
        case 'missing-first': return (hasDims(a) ? 1 : 0) - (hasDims(b) ? 1 : 0);
        default: return 0;
      }
    });
    return list;
  }, [games, search, filters]);

  const pendingGame = pendingDeleteId ? games.find(g => g.id === pendingDeleteId) : null;
  const pendingGamePlacements = pendingDeleteId
    ? manualPlacements.filter(p => p.gameId === pendingDeleteId)
    : [];

  return (
    <div className={styles.view}>
      <CollectionToolbar
        search={search}
        onSearchChange={setSearch}
        onFilterOpen={() => setFilterOpen(true)}
        resultCount={filtered.length}
        totalCount={games.length}
        activeFilterCount={activeFilterCount}
      />
      <div className={styles.scroll}>
        <GameGrid
          games={filtered}
          allGamesCount={games.length}
          onDeleteRequest={id => setPendingDeleteId(id)}
        />
      </div>

      <FAB onClick={handleFabClick} />

      <AddGameSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <UpgradeSheet open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />

      <FilterSheet
        open={filterOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setFilterOpen(false)}
      />

      <ConfirmSheet
        open={!!pendingDeleteId}
        title="Remove game"
        message={<>
          Remove <strong>{pendingGame?.name}</strong> from your collection? This can't be undone.
          {pendingGamePlacements.length > 0 && (
            <div className={styles.placementCallout}>
              This game is placed on your manual shelf. Removing it will also clear that placement.
            </div>
          )}
        </>}
        confirmLabel="Remove"
        danger
        onConfirm={() => {
          if (!pendingDeleteId) return;
          const name = pendingGame?.name;
          pendingGamePlacements.forEach(p => removeManualPlacement(p.id));
          deleteGame(pendingDeleteId);
          setPendingDeleteId(null);
          if (name) toast(`Removed "${name}"`);
        }}
        onClose={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
