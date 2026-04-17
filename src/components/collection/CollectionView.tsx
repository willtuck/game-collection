import { useState, useMemo } from 'react';
import { CollectionToolbar } from './CollectionToolbar';
import { GameGrid } from './GameGrid';
import { FAB } from '../shared/FAB';
import { AddGameSheet } from '../sheets/AddGameSheet';
import { FilterSheet, type FilterState } from '../sheets/FilterSheet';
import { ImportSheet } from '../sheets/ImportSheet';
import { ConfirmSheet } from '../shared/ConfirmSheet';
import { useGameStore } from '../../store/useGameStore';
import { hasDims } from '../../lib/helpers';
import { toast } from '../shared/Toast';
import styles from './CollectionView.module.css';

const DEFAULT_FILTERS: FilterState = {
  typeFilter: 'all',
  dimsFilter: 'all',
  playersFilter: 'all',
  sort: 'name-asc',
};

export function CollectionView() {
  const games = useGameStore(s => s.games);
  const deleteGame = useGameStore(s => s.deleteGame);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [addOpen, setAddOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const activeFilterCount = [
    filters.typeFilter !== 'all',
    filters.dimsFilter !== 'all',
    filters.playersFilter !== 'all',
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
    if (filters.playersFilter !== 'all') {
      const n = parseInt(filters.playersFilter);
      list = list.filter(g => {
        if (!g.minPlayers && !g.maxPlayers) return false;
        const mn = parseInt(g.minPlayers ?? '') || 1;
        const mx = parseInt(g.maxPlayers ?? '') || mn;
        return n === 6 ? mx >= 6 : mn <= n && mx >= n;
      });
    }
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

  function handleExportCSV() {
    if (!games.length) { toast('Nothing to export yet.'); return; }
    const cols = ['id','name','minPlayers','maxPlayers','width','height','depth','unit','type','baseGameId','storedInside','groupName','added'];
    const rows = games.map(g => cols.map(k => {
      const v = g[k as keyof typeof g];
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','));
    const blob = new Blob([[cols.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'game-collection.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const pendingGame = pendingDeleteId ? games.find(g => g.id === pendingDeleteId) : null;

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

      <FAB onClick={() => setAddOpen(true)} />

      <AddGameSheet open={addOpen} onClose={() => setAddOpen(false)} />

      <FilterSheet
        open={filterOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setFilterOpen(false)}
        onExportCSV={handleExportCSV}
        onImportCSV={() => setImportOpen(true)}
      />

      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} />

      <ConfirmSheet
        open={!!pendingDeleteId}
        title="Remove game"
        message={<>Remove <strong>{pendingGame?.name}</strong> from your collection? This can't be undone.</>}
        confirmLabel="Remove"
        danger
        onConfirm={() => {
          if (!pendingDeleteId) return;
          const name = pendingGame?.name;
          deleteGame(pendingDeleteId);
          setPendingDeleteId(null);
          if (name) toast(`Removed "${name}"`);
        }}
        onClose={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
