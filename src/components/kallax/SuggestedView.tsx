import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getSortedForShelf } from '../../lib/sorting';
import { packCellsGroupAware, packTop, fitsInCell, fitsUprightInCell } from '../../lib/packing';
import { unitGrid, unitDims } from '../../lib/helpers';
import type { PackedGame } from '../../lib/types';
import { ShelfCanvas } from './KallaxCanvas';
import { SuggestedSettings } from './SuggestedSettings';
import { ShelfManagerSheet } from './KallaxManagerSheet';
import { UpgradeSheet } from '../shared/UpgradeSheet';
import styles from './SuggestedView.module.css';

interface UnitPacking {
  id: string;
  label: string;
  cols: number;
  rows: number;
  cellPacked: PackedGame[][];
  topPacked: PackedGame[];
  dims: { w: number; h: number; d: number };
}

export function SuggestedView() {
  const games         = useGameStore(s => s.games);
  const shelves       = useGameStore(s => s.shelves);
  const addShelf      = useGameStore(s => s.addShelf);
  const shelfSort     = useGameStore(s => s.shelfSort);
  const shelfMode     = useGameStore(s => s.shelfMode);
  const activeShelfId = useGameStore(s => s.activeShelfId);
  const setActiveShelf  = useGameStore(s => s.setActiveShelf);
  const setShelfSort    = useGameStore(s => s.setShelfSort);
  const setShelfMode    = useGameStore(s => s.setShelfMode);
  const isPremium = useAuthStore(s => s.isPremium);

  const [search, setSearch] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  function handleAddShelf(model: string, label: string) {
    if (!isPremium && shelves.length >= 1) {
      setManageOpen(false);
      setUpgradeOpen(true);
    } else {
      addShelf(model, label);
    }
  }

  const sortedGames = useMemo(
    () => getSortedForShelf(games, shelfSort),
    [games, shelfSort],
  );

  // Pack games sequentially across all units — overflow from unit N feeds unit N+1
  const { units, remaining } = useMemo(() => {
    const units: UnitPacking[] = [];
    let rem = sortedGames;
    for (const shelf of shelves) {
      const [cols, rows] = unitGrid(shelf);
      const dims = unitDims(shelf);
      // In upright mode, only games that fit upright go into cells — games that
      // fit only when flat (e.g. tall boxes like Ark Nova) go to top-of-shelf.
      // In stacked mode, any game that fits in any orientation goes into cells.
      const fitsCurrentMode = (g: (typeof rem)[0]) =>
        shelfMode === 'stacked' ? fitsInCell(g, dims) : fitsUprightInCell(g, dims);
      const oversized = rem.filter(g => !fitsCurrentMode(g));
      const cellable  = rem.filter(g =>  fitsCurrentMode(g));
      const { cellPacked, remaining: afterCells } = packCellsGroupAware(cellable, cols * rows, shelfMode === 'stacked', dims);
      const { topPacked, remaining: afterTop }   = packTop(oversized, cols, rows, dims);
      rem = [...afterTop, ...afterCells];
      units.push({ id: shelf.id, label: shelf.label, cols, rows, cellPacked, topPacked, dims });
    }
    return { units, remaining: rem };
  }, [sortedGames, shelves, shelfMode]);

  const activeUnit = units.find(u => u.id === activeShelfId) ?? units[0];

  const noUnits = shelves.length === 0;

  return (
    <div className={styles.view}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.search}
          placeholder="Highlight a game…"
          aria-label="Highlight a game"
          value={search}
          onChange={e => setSearch(e.target.value)}
          disabled={noUnits}
        />
        <button className={styles.settingsBtn} onClick={() => setManageOpen(true)}>
          Units
        </button>
        <button className={styles.settingsBtn} onClick={() => setSettingsOpen(true)} disabled={noUnits}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.54 11.54l1.41 1.41M3.05 12.95l1.42-1.42M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className={styles.settingsBtnLabel}>Settings</span>
        </button>
      </div>

      {/* Unit tabs */}
      {units.length > 1 && (
        <div className={styles.units} role="tablist" aria-label="Shelving units">
          {units.map(u => (
            <button
              key={u.id}
              role="tab"
              aria-selected={u.id === activeUnit?.id}
              className={`${styles.unitTab} ${u.id === activeUnit?.id ? styles.activeTab : ''}`}
              onClick={() => setActiveShelf(u.id)}
            >
              {u.label}
            </button>
          ))}
        </div>
      )}

      <div className={styles.main}>
        {noUnits ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No shelving units yet</div>
            <div className={styles.emptyBody}>
              Tap <strong>Units</strong> to add your first unit and see how your games fit.
            </div>
          </div>
        ) : activeUnit ? (
          <>
            <div className={styles.canvasArea}>
              <ShelfCanvas
                key={activeUnit.id}
                cellPacked={activeUnit.cellPacked}
                cols={activeUnit.cols}
                rows={activeUnit.rows}
                searchTerm={search.toLowerCase()}
                topPacked={activeUnit.topPacked}
                cellDims={activeUnit.dims}
              />
            </div>

            <div className={styles.stats}>
              {activeUnit.label}
              {activeUnit.cellPacked.flat().length > 0 && (
                <>{' · '}{activeUnit.cellPacked.flat().length}{' '}
                  {activeUnit.cellPacked.flat().length === 1 ? 'game' : 'games'} inside</>
              )}
              {activeUnit.topPacked.length > 0 && (
                <>{' · '}{activeUnit.topPacked.length}{' '}
                  {activeUnit.topPacked.length === 1 ? 'game' : 'games'} on top</>
              )}
              {' · '}{shelfMode}
            </div>

            {remaining.length > 0 && (
              <div className={styles.remaining}>
                <div className={styles.remainingTitle}>
                  {remaining.length} {remaining.length === 1 ? 'game' : 'games'} don't fit
                  {shelves.length > 1 ? ' in any unit' : ''}
                </div>
                <div className={styles.remainingList}>
                  {remaining.map(g => (
                    <div key={g.id} className={styles.remainingItem}>
                      {g.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      <ShelfManagerSheet open={manageOpen} onClose={() => setManageOpen(false)} onAdd={handleAddShelf} />
      <UpgradeSheet open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />

      <SuggestedSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        sort={shelfSort}
        mode={shelfMode}
        onSortChange={setShelfSort}
        onModeChange={setShelfMode}
      />
    </div>
  );
}
