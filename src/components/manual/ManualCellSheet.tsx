import { useState, useRef } from 'react';
import { Sheet } from '../shared/Sheet';
import { useGameStore } from '../../store/useGameStore';
import { gameColor } from '../../lib/colors';
import { fmtDims } from '../../lib/helpers';
import type { StorageMode } from '../../lib/types';
import styles from './ManualCellSheet.module.css';

interface ManualCellSheetProps {
  open: boolean;
  onClose: () => void;
  unitId: string;
  cellIndex: number;
  cellLabel: string;
}

export function ManualCellSheet({ open, onClose, unitId, cellIndex, cellLabel }: ManualCellSheetProps) {
  const games               = useGameStore(s => s.games);
  const manualPlacements    = useGameStore(s => s.manualPlacements);
  const removeManualPlacement = useGameStore(s => s.removeManualPlacement);
  const updateManualCellMode  = useGameStore(s => s.updateManualCellMode);
  const reorderManualCell     = useGameStore(s => s.reorderManualCell);

  // Placements for this cell in order
  const cellPlacements = manualPlacements.filter(
    p => p.unitId === unitId && p.cellIndex === cellIndex
  );

  const currentMode: StorageMode = cellPlacements[0]?.storageMode ?? 'upright';

  // Drag-to-reorder state
  const dragIdRef  = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function handleDragStart(id: string) {
    dragIdRef.current = id;
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (dragIdRef.current !== id) setDragOverId(id);
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    const srcId = dragIdRef.current;
    if (!srcId || srcId === targetId) { setDragOverId(null); return; }

    const ids = cellPlacements.map(p => p.id);
    const srcIdx = ids.indexOf(srcId);
    const tgtIdx = ids.indexOf(targetId);
    if (srcIdx < 0 || tgtIdx < 0) { setDragOverId(null); return; }

    const reordered = [...ids];
    reordered.splice(srcIdx, 1);
    reordered.splice(tgtIdx, 0, srcId);
    reorderManualCell(unitId, cellIndex, reordered);
    dragIdRef.current = null;
    setDragOverId(null);
  }

  function handleDragEnd() {
    dragIdRef.current = null;
    setDragOverId(null);
  }

  function toggleMode() {
    const next: StorageMode = currentMode === 'upright' ? 'stacked' : 'upright';
    updateManualCellMode(unitId, cellIndex, next);
  }

  return (
    <Sheet open={open} onClose={onClose} title={cellLabel} modal>
      {/* Orientation toggle */}
      {cellPlacements.length > 0 && (
        <div className={styles.orientRow}>
          <span className={styles.orientLabel}>Orientation</span>
          <div className={styles.toggle}>
            <button
              className={`${styles.tbtn} ${currentMode === 'upright' ? styles.on : ''}`}
              onClick={() => currentMode !== 'upright' && toggleMode()}
            >
              Upright
            </button>
            <button
              className={`${styles.tbtn} ${currentMode === 'stacked' ? styles.on : ''}`}
              onClick={() => currentMode !== 'stacked' && toggleMode()}
            >
              Stacked
            </button>
          </div>
        </div>
      )}

      {/* Game list */}
      {cellPlacements.length === 0 ? (
        <div className={styles.emptyCell}>No games in this cell yet</div>
      ) : (
        <div className={styles.list}>
          {cellPlacements.map(p => {
            const game = games.find(g => g.id === p.gameId);
            if (!game) return null;
            return (
              <div
                key={p.id}
                className={`${styles.gameRow} ${dragOverId === p.id ? styles.dragOver : ''}`}
                style={{ borderLeftColor: gameColor(game.id).stroke, background: gameColor(game.id).fill.replace(/[\d.]+\)$/, '0.07)') }}
                draggable
                onDragStart={() => handleDragStart(p.id)}
                onDragOver={e => handleDragOver(e, p.id)}
                onDrop={e => handleDrop(e, p.id)}
                onDragEnd={handleDragEnd}
              >
                <span className={styles.dragHandle} aria-hidden="true">
                  <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
                    <circle cx="4" cy="3"  r="1.5" fill="currentColor"/>
                    <circle cx="8" cy="3"  r="1.5" fill="currentColor"/>
                    <circle cx="4" cy="8"  r="1.5" fill="currentColor"/>
                    <circle cx="8" cy="8"  r="1.5" fill="currentColor"/>
                    <circle cx="4" cy="13" r="1.5" fill="currentColor"/>
                    <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
                  </svg>
                </span>
                <span className={styles.gameName}>{game.name}</span>
                {game.width && game.height && game.depth && (
                  <span className={styles.gameDims}>{fmtDims(game)}</span>
                )}
                <button
                  className={styles.removeBtn}
                  onClick={() => removeManualPlacement(p.id)}
                  aria-label={`Remove ${game.name} from cell`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button className={styles.doneBtn} onClick={onClose}>Done</button>
    </Sheet>
  );
}
