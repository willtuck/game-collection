import { useState, useEffect, useMemo, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { KallaxCanvas } from '../kallax/KallaxCanvas';
import { KallaxManagerSheet } from '../kallax/KallaxManagerSheet';
import { ManualCellSheet } from './ManualCellSheet';
import { Sheet } from '../shared/Sheet';
import { unitGrid, unitDims, fmtDims, hasDims } from '../../lib/helpers';
import { KALLAX } from '../../lib/packing';
import { gameColor } from '../../lib/colors';
import type { Game, ManualPlacement, PackedGame, StorageMode } from '../../lib/types';
import styles from './ManualView.module.css';

/** Pack games from manual placements into a PackedGame array for canvas rendering */
function packManualCell(
  placements: ManualPlacement[],
  games: Game[],
  dims = KALLAX,
): PackedGame[] {
  if (placements.length === 0) return [];
  const storageMode = placements[0].storageMode;
  const result: PackedGame[] = [];

  if (storageMode !== 'stacked') {
    // UPRIGHT: list[0] → visual leftmost.
    // cosAz ≈ -0.924 so increasing 3D-x moves LEFT on screen. To pack from the
    // visual-left wall, start xOff at dims.w and count down; list[0] ends up at
    // the highest xOffset (= screen-leftmost position against the left wall).
    const items: { game: Game; gd: number }[] = [];
    for (const p of placements) {
      const game = games.find(g => g.id === p.gameId);
      if (!game?.width || !game.height || !game.depth) continue;
      items.push({ game, gd: parseFloat(game.depth) });
    }
    let xOff = dims.w;
    for (const { game, gd } of items) {
      xOff -= gd;
      result.push({ ...game, xOffset: xOff, yOffset: 0, mode: 'upright' });
    }
  } else {
    // STACKED: list[0] → topmost. Collect items, compute total height, assign
    // yOffsets counting down so list[0] gets the highest yOffset (= top of stack).
    const stackItems: { game: Game; thickness: number; footW: number; footD: number }[] = [];
    for (const p of placements) {
      const game = games.find(g => g.id === p.gameId);
      if (!game?.width || !game.height || !game.depth) continue;
      const [gw, gh, gd] = [parseFloat(game.width), parseFloat(game.height), parseFloat(game.depth)];
      const sorted = [gw, gh, gd].sort((a, b) => a - b);
      const thickness = sorted[0];
      const footW = sorted[1] <= dims.w ? sorted[1] : sorted[2];
      const footD = sorted[1] <= dims.w ? sorted[2] : sorted[1];
      stackItems.push({ game, thickness, footW, footD });
    }
    const totalH = stackItems.reduce((s, it) => s + it.thickness, 0);
    let yOff = totalH;
    for (const { game, thickness, footW, footD } of stackItems) {
      yOff -= thickness;
      result.push({
        ...game, xOffset: 0, yOffset: yOff, mode: 'stacked',
        _thickness: thickness, _footW: footW, _footD: footD,
      });
    }
  }

  return result;
}

interface PickState {
  cellIndex: number;
  orientation: StorageMode;
  newPlacementId: string;
  /** Placement IDs in display order; newPlacementId is the last entry initially */
  draftOrder: string[];
}

export function ManualView() {
  const manualKallaxes          = useGameStore(s => s.manualKallaxes);
  const activeManualKuId        = useGameStore(s => s.activeManualKuId);
  const manualPlacements        = useGameStore(s => s.manualPlacements);
  const pendingManualNav        = useGameStore(s => s.pendingManualNav);
  const games                   = useGameStore(s => s.games);
  const setActiveManualKu       = useGameStore(s => s.setActiveManualKu);
  const addManualKallax         = useGameStore(s => s.addManualKallax);
  const removeManualKallax      = useGameStore(s => s.removeManualKallax);
  const updateManualKallaxLabel = useGameStore(s => s.updateManualKallaxLabel);
  const setPendingManualNav     = useGameStore(s => s.setPendingManualNav);
  const addManualPlacement      = useGameStore(s => s.addManualPlacement);
  const updateManualCellMode    = useGameStore(s => s.updateManualCellMode);
  const reorderManualCell       = useGameStore(s => s.reorderManualCell);
  const pendingManualView       = useGameStore(s => s.pendingManualView);
  const setPendingManualView    = useGameStore(s => s.setPendingManualView);

  const [manageOpen, setManageOpen]     = useState(false);
  const [cellSheetIdx, setCellSheetIdx] = useState<number | null>(null);

  // Game waiting to be placed
  const [pendingGame, setPendingGame] = useState<{ gameId: string; unitId: string } | null>(null);
  // Orientation + order picker state
  const [pickState, setPickState] = useState<PickState | null>(null);

  // Drag state for the picker list
  const dragIdRef   = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const activeUnit = manualKallaxes.find(k => k.id === activeManualKuId) ?? manualKallaxes[0];

  // Consume pending navigation from GameCard (placement mode)
  useEffect(() => {
    if (pendingManualNav) {
      setActiveManualKu(pendingManualNav.unitId);
      setPendingGame({ gameId: pendingManualNav.gameId, unitId: pendingManualNav.unitId });
      setPendingManualNav(null);
    }
  }, [pendingManualNav, setActiveManualKu, setPendingManualNav]);

  // Consume view navigation from GameCard "Manually stored." pill
  useEffect(() => {
    if (pendingManualView) {
      setActiveManualKu(pendingManualView.unitId);
      setCellSheetIdx(pendingManualView.cellIndex);
      setPendingManualView(null);
    }
  }, [pendingManualView, setActiveManualKu, setPendingManualView]);

  const cellPacked = useMemo(() => {
    if (!activeUnit) return [];
    const [cols, rows] = unitGrid(activeUnit);
    const dims = unitDims(activeUnit);
    const numCells = cols * rows;
    const result: PackedGame[][] = Array.from({ length: numCells }, () => []);
    const unitPlacements = manualPlacements.filter(p => p.unitId === activeUnit.id);
    for (let i = 0; i < numCells; i++) {
      result[i] = packManualCell(unitPlacements.filter(p => p.cellIndex === i), games, dims);
    }
    return result;
  }, [activeUnit, manualPlacements, games]);

  // Live preview: override the target cell with draft placements while picker is open
  const previewCellPacked = useMemo(() => {
    if (!pickState || !pendingGame || !activeUnit) return cellPacked;
    const cellDims = unitDims(activeUnit);
    const draftPlacements: ManualPlacement[] = pickState.draftOrder.flatMap(id => {
      if (id === pickState.newPlacementId) {
        return [{ id, gameId: pendingGame.gameId, unitId: activeUnit.id, cellIndex: pickState.cellIndex, storageMode: pickState.orientation }];
      }
      const existing = manualPlacements.find(p => p.id === id);
      return existing ? [{ ...existing, storageMode: pickState.orientation }] : [];
    });
    const preview = [...cellPacked];
    preview[pickState.cellIndex] = packManualCell(draftPlacements, games, cellDims);
    return preview;
  }, [cellPacked, pickState, pendingGame, activeUnit, manualPlacements, games]);

  const [cols, rows] = activeUnit ? unitGrid(activeUnit) : [0, 0];
  const dims = activeUnit ? unitDims(activeUnit) : KALLAX;
  const noUnits = manualKallaxes.length === 0;
  const placedCount = activeUnit
    ? manualPlacements.filter(p => p.unitId === activeUnit.id).length
    : 0;
  const pendingGameName = pendingGame
    ? games.find(g => g.id === pendingGame.gameId)?.name ?? 'game'
    : null;

  function handleCellClick(cellIndex: number) {
    if (pendingGame && activeUnit) {
      const existingInCell = manualPlacements.filter(
        p => p.unitId === activeUnit.id && p.cellIndex === cellIndex
      );
      const newId = 'mp' + Date.now().toString(36);
      const inheritedOrientation: StorageMode = existingInCell[0]?.storageMode ?? 'upright';
      setPickState({
        cellIndex,
        orientation: inheritedOrientation,
        newPlacementId: newId,
        draftOrder: [...existingInCell.map(p => p.id), newId],
      });
    } else {
      setCellSheetIdx(cellIndex);
    }
  }

  function confirmPlacement() {
    if (!pickState || !pendingGame || !activeUnit) return;
    // 1. Add the new placement
    addManualPlacement({
      id: pickState.newPlacementId,
      gameId: pendingGame.gameId,
      unitId: activeUnit.id,
      cellIndex: pickState.cellIndex,
      storageMode: pickState.orientation,
    });
    // 2. Set orientation on existing placements in this cell
    updateManualCellMode(activeUnit.id, pickState.cellIndex, pickState.orientation);
    // 3. Apply the user's order (Zustand set is synchronous, new placement is in store already)
    reorderManualCell(activeUnit.id, pickState.cellIndex, pickState.draftOrder);
    setPendingGame(null);
    setPickState(null);
  }

  function cancelPlacement() {
    setPickState(null);
  }

  // Drag handlers for the picker list
  function handlePickDragStart(id: string) {
    dragIdRef.current = id;
  }

  function handlePickDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (dragIdRef.current !== id) setDragOverId(id);
  }

  function handlePickDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    const srcId = dragIdRef.current;
    if (!srcId || srcId === targetId || !pickState) { setDragOverId(null); return; }
    const order = [...pickState.draftOrder];
    const srcIdx = order.indexOf(srcId);
    const tgtIdx = order.indexOf(targetId);
    if (srcIdx < 0 || tgtIdx < 0) { setDragOverId(null); return; }
    order.splice(srcIdx, 1);
    order.splice(tgtIdx, 0, srcId);
    setPickState(s => s ? { ...s, draftOrder: order } : s);
    dragIdRef.current = null;
    setDragOverId(null);
  }

  function handlePickDragEnd() {
    dragIdRef.current = null;
    setDragOverId(null);
  }

  // Resolve a placement ID to a game (the new placement ID maps to pendingGame)
  function gameForId(placementId: string): Game | undefined {
    if (!pickState || !pendingGame) return undefined;
    if (placementId === pickState.newPlacementId) {
      return games.find(g => g.id === pendingGame.gameId);
    }
    const p = manualPlacements.find(mp => mp.id === placementId);
    return p ? games.find(g => g.id === p.gameId) : undefined;
  }

  return (
    <div className={styles.view}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button className={styles.toolbarBtn} onClick={() => setManageOpen(true)}>
          Units
        </button>
        {pendingGame && (
          <div className={styles.placeBanner}>
            Placing <strong>{pendingGameName}</strong> — tap a cell
            <button
              className={styles.cancelPendingBtn}
              onClick={() => setPendingGame(null)}
              aria-label="Cancel placement"
            >✕</button>
          </div>
        )}
      </div>

      {/* Unit tabs */}
      {manualKallaxes.length > 1 && (
        <div className={styles.units} role="tablist">
          {manualKallaxes.map(ku => (
            <button
              key={ku.id}
              role="tab"
              aria-selected={ku.id === activeUnit?.id}
              className={`${styles.unitTab} ${ku.id === activeUnit?.id ? styles.activeTab : ''}`}
              onClick={() => setActiveManualKu(ku.id)}
            >
              {ku.label}
            </button>
          ))}
        </div>
      )}

      <div className={styles.main}>
        {noUnits ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No manual units yet</div>
            <div className={styles.emptyBody}>
              Tap <strong>Units</strong> to add your first unit, then assign games to it from the Collection tab.
            </div>
          </div>
        ) : activeUnit ? (
          <>
            <div className={styles.canvasArea}>
              <KallaxCanvas
                key={activeUnit.id}
                cellPacked={previewCellPacked}
                cols={cols}
                rows={rows}
                searchTerm=""
                cellDims={dims}
                onCellClick={handleCellClick}
                highlightCellIdx={pickState?.cellIndex ?? cellSheetIdx ?? undefined}
              />
            </div>
            <div className={styles.stats}>
              {activeUnit.label}
              {' · '}{placedCount}{' '}
              {placedCount === 1 ? 'game' : 'games'} placed
              {!pendingGame && ' · tap a cell to edit'}
            </div>
          </>
        ) : null}
      </div>

      {/* Units manager */}
      <KallaxManagerSheet
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        title="Manual units"
        units={manualKallaxes}
        onAdd={addManualKallax}
        onRemove={removeManualKallax}
        onUpdateLabel={updateManualKallaxLabel}
      />

      {/* Cell editor (existing games, no pending placement) */}
      {activeUnit && cellSheetIdx !== null && (
        <ManualCellSheet
          open
          onClose={() => setCellSheetIdx(null)}
          unitId={activeUnit.id}
          cellIndex={cellSheetIdx}
          cellLabel={`Cell ${cellSheetIdx + 1}`}
        />
      )}

      {/* Placement picker: orientation + order (including existing cell games) */}
      {pickState && (
        <Sheet
          open
          onClose={cancelPlacement}
          title={`Place "${pendingGameName}"`}
          modal
        >
          {/* Orientation toggle */}
          <div className={styles.orientRow}>
            <span className={styles.orientLabel}>Orientation</span>
            <div className={styles.toggle}>
              <button
                className={`${styles.tbtn} ${pickState.orientation === 'upright' ? styles.on : ''}`}
                onClick={() => setPickState(s => s ? { ...s, orientation: 'upright' } : s)}
              >Upright</button>
              <button
                className={`${styles.tbtn} ${pickState.orientation === 'stacked' ? styles.on : ''}`}
                onClick={() => setPickState(s => s ? { ...s, orientation: 'stacked' } : s)}
              >Stacked</button>
            </div>
          </div>

          {/* Game order list */}
          <div className={styles.pickList}>
            {pickState.draftOrder.map(placementId => {
              const game = gameForId(placementId);
              const isNew = placementId === pickState.newPlacementId;
              if (!game) return null;
              const col = gameColor(game.id);
              return (
                <div
                  key={placementId}
                  className={`${styles.pickRow} ${dragOverId === placementId ? styles.dragOver : ''}`}
                  style={{ borderLeftColor: col.stroke, background: col.fill.replace(/[\d.]+\)$/, '0.07)') }}
                  draggable
                  onDragStart={() => handlePickDragStart(placementId)}
                  onDragOver={e => handlePickDragOver(e, placementId)}
                  onDrop={e => handlePickDrop(e, placementId)}
                  onDragEnd={handlePickDragEnd}
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
                  <span className={styles.pickGameName}>{game.name}</span>
                  {hasDims(game) && (
                    <span className={styles.pickGameDims}>{fmtDims(game)}</span>
                  )}
                  {isNew && <span className={styles.newBadge}>New</span>}
                </div>
              );
            })}
          </div>

          <div className={styles.pickActions}>
            <button className={styles.saveBtn} onClick={confirmPlacement}>Save</button>
            <button className={styles.cancelBtn} onClick={cancelPlacement}>Cancel</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
