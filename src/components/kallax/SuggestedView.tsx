import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { getSortedForKallax } from '../../lib/sorting';
import { packCellsGroupAware, packTop, fitsInCell } from '../../lib/packing';
import { kuGrid } from '../../lib/helpers';
import type { PackedGame } from '../../lib/types';
import { KallaxCanvas } from './KallaxCanvas';
import { SuggestedSettings } from './SuggestedSettings';
import { KallaxManagerSheet } from './KallaxManagerSheet';
import styles from './SuggestedView.module.css';

interface UnitPacking {
  id: string;
  label: string;
  cols: number;
  rows: number;
  cellPacked: PackedGame[][];
  topPacked: PackedGame[];
}

export function SuggestedView() {
  const games      = useGameStore(s => s.games);
  const kallaxes   = useGameStore(s => s.kallaxes);
  const kallaxSort = useGameStore(s => s.kallaxSort);
  const kallaxMode = useGameStore(s => s.kallaxMode);
  const activeKuId = useGameStore(s => s.activeKuId);
  const setActiveKu   = useGameStore(s => s.setActiveKu);
  const setKallaxSort = useGameStore(s => s.setKallaxSort);
  const setKallaxMode = useGameStore(s => s.setKallaxMode);

  const [search, setSearch] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const sortedGames = useMemo(
    () => getSortedForKallax(games, kallaxSort),
    [games, kallaxSort],
  );

  // Pack games sequentially across all units — overflow from unit N feeds unit N+1
  const { units, remaining } = useMemo(() => {
    const units: UnitPacking[] = [];
    let rem = sortedGames;
    for (const ku of kallaxes) {
      const [cols, rows] = kuGrid(ku.model);
      // Oversized games (physically can't fit in any cell) go on top immediately.
      // Normal-sized games try cells first; overflow passes to the next unit.
      const oversized = rem.filter(g => !fitsInCell(g));
      const cellable  = rem.filter(g =>  fitsInCell(g));
      const { cellPacked, remaining: afterCells } = packCellsGroupAware(cellable, cols * rows, kallaxMode === 'stacked');
      const { topPacked, remaining: afterTop }   = packTop(oversized, cols, rows);
      rem = [...afterTop, ...afterCells];
      units.push({ id: ku.id, label: ku.label, cols, rows, cellPacked, topPacked });
    }
    return { units, remaining: rem };
  }, [sortedGames, kallaxes, kallaxMode]);

  const activeUnit = units.find(u => u.id === activeKuId) ?? units[0];

  const noUnits    = kallaxes.length === 0;
  const noDims     = !noUnits && sortedGames.length === 0;

  return (
    <div className={styles.view}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.search}
          placeholder="Highlight a game…"
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
        <div className={styles.units}>
          {units.map(u => (
            <button
              key={u.id}
              className={`${styles.unitTab} ${u.id === activeUnit?.id ? styles.activeTab : ''}`}
              onClick={() => setActiveKu(u.id)}
            >
              {u.label}
            </button>
          ))}
        </div>
      )}

      <div className={styles.scroll}>
        {noUnits ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No Kallax units yet</div>
            <div className={styles.emptyBody}>
              Tap <strong>Units</strong> to add your first unit and see how your games fit.
            </div>
          </div>
        ) : noDims ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No games with dimensions</div>
            <div className={styles.emptyBody}>
              Add box dimensions to your games in the Collection tab to see them arranged here.
            </div>
          </div>
        ) : activeUnit ? (
          <>
            <KallaxCanvas
              key={activeUnit.id}
              cellPacked={activeUnit.cellPacked}
              cols={activeUnit.cols}
              rows={activeUnit.rows}
              searchTerm={search.toLowerCase()}
              topPacked={activeUnit.topPacked}
            />

            <div className={styles.stats}>
              {activeUnit.label}
              {' · '}{activeUnit.cellPacked.flat().length}{' '}
              {activeUnit.cellPacked.flat().length === 1 ? 'game' : 'games'} inside
              {activeUnit.topPacked.length > 0 && (
                <>{' · '}{activeUnit.topPacked.length}{' '}
                  {activeUnit.topPacked.length === 1 ? 'game' : 'games'} on top</>
              )}
              {' · '}{kallaxMode}
            </div>

            {remaining.length > 0 && (
              <div className={styles.remaining}>
                <div className={styles.remainingTitle}>
                  {remaining.length} {remaining.length === 1 ? 'game' : 'games'} don't fit
                  {kallaxes.length > 1 ? ' in any unit' : ''}
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

      <KallaxManagerSheet open={manageOpen} onClose={() => setManageOpen(false)} />

      <SuggestedSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        sort={kallaxSort}
        mode={kallaxMode}
        onSortChange={setKallaxSort}
        onModeChange={setKallaxMode}
      />
    </div>
  );
}
