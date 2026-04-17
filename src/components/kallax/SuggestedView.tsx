import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { getSortedForKallax } from '../../lib/sorting';
import { packCellsGroupAware } from '../../lib/packing';
import { kuGrid } from '../../lib/helpers';
import { KallaxCanvas } from './KallaxCanvas';
import { SuggestedSettings } from './SuggestedSettings';
import { KallaxManagerSheet } from './KallaxManagerSheet';
import styles from './SuggestedView.module.css';

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

  const activeKu = kallaxes.find(k => k.id === activeKuId) ?? kallaxes[0];
  const [cols, rows] = kuGrid(activeKu?.model ?? '2x4');
  const numCells = cols * rows;

  const sortedGames = useMemo(
    () => getSortedForKallax(games, kallaxSort),
    [games, kallaxSort],
  );

  const { cellPacked, remaining } = useMemo(
    () => packCellsGroupAware(sortedGames, numCells, kallaxMode === 'stacked'),
    [sortedGames, numCells, kallaxMode],
  );

  const totalFitted = cellPacked.flat().length;

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
        />
        <button className={styles.settingsBtn} onClick={() => setManageOpen(true)}>
          Units
        </button>
        <button className={styles.settingsBtn} onClick={() => setSettingsOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.54 11.54l1.41 1.41M3.05 12.95l1.42-1.42M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Settings
        </button>
      </div>

      {/* Unit tabs (only shown when multiple units) */}
      {kallaxes.length > 1 && (
        <div className={styles.units}>
          {kallaxes.map(ku => (
            <button
              key={ku.id}
              className={`${styles.unitTab} ${ku.id === activeKu?.id ? styles.activeTab : ''}`}
              onClick={() => setActiveKu(ku.id)}
            >
              {ku.label}
            </button>
          ))}
        </div>
      )}

      <div className={styles.scroll}>
        {sortedGames.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No games with dimensions</div>
            <div className={styles.emptyBody}>
              Add box dimensions to your games in the Collection tab to see them arranged here.
            </div>
          </div>
        ) : (
          <>
            <KallaxCanvas
              cellPacked={cellPacked}
              cols={cols}
              rows={rows}
              searchTerm={search.toLowerCase()}
            />

            <div className={styles.stats}>
              {activeKu?.label} · {totalFitted} of {sortedGames.length}{' '}
              {sortedGames.length === 1 ? 'game' : 'games'} fit
              {' · '}{kallaxMode} · {kallaxSort.replace(/-/g, ' ')}
            </div>

            {remaining.length > 0 && (
              <div className={styles.remaining}>
                <div className={styles.remainingTitle}>
                  {remaining.length} {remaining.length === 1 ? 'game' : 'games'} don't fit
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
        )}
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
