import { useState, useId, useRef, useEffect } from 'react';
import { BoxPreview } from './BoxPreview';
import { GroupInput } from './GroupInput';
import { useGameStore } from '../../store/useGameStore';
import { fetchBggVersions, fetchBggKnownVersionId, type BggVersion } from '../../lib/bggApi';
import { extractDominantColor } from '../../lib/colorExtractor';
import { hasDims, toCm, fmtDims } from '../../lib/helpers';
import { gameColor } from '../../lib/colors';
import { Sheet } from '../shared/Sheet';
import { ConfirmSheet } from '../shared/ConfirmSheet';
import { UnitToggle } from '../shared/UnitToggle';
import { fitsInCell } from '../../lib/packing';
import { toast } from '../shared/Toast';
import type { Game } from '../../lib/types';
import styles from './GameCard.module.css';

interface GameCardProps {
  game: Game;
  onDeleteRequest: (id: string) => void;
}

export function GameCard({ game, onDeleteRequest }: GameCardProps) {
  const formId = useId();
  const [editing, setEditing] = useState(false);
  const games = useGameStore(s => s.games);
  const updateGame = useGameStore(s => s.updateGame);
  const bggUsername = useGameStore(s => s.bggUsername);
  const manualShelves        = useGameStore(s => s.manualShelves);
  const manualPlacements     = useGameStore(s => s.manualPlacements);
  const setPendingManualNav  = useGameStore(s => s.setPendingManualNav);
  const setPendingManualView  = useGameStore(s => s.setPendingManualView);
  const removeManualPlacement = useGameStore(s => s.removeManualPlacement);
  const col = gameColor(game.id, game.accentColor);
  const [bggVersions, setBggVersions] = useState<BggVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  // track whether the current dims came from a version pick (so manual edits can reset it)
  const versionDimsRef = useRef<{ w: string; h: string; d: string } | null>(null);
  const [pendingFitWarning, setPendingFitWarning] = useState<{
    name: string;
    storedInside: boolean;
    wCm: string | null;
    hCm: string | null;
    dCm: string | null;
  } | null>(null);

  // ── Edit form state ──
  const eu = game.unit || 'cm';
  const disp = (v: string | null) => {
    if (!v) return '';
    return eu === 'in' ? (parseFloat(v) / 2.54).toFixed(2) : v;
  };
  const [form, setForm] = useState({
    name: game.name,
    unit: eu as 'cm' | 'in',
    type: (game.type === 'expansion' ? 'expansion' : 'base') as 'base' | 'expansion',
    baseGameId: game.baseGameId ?? '',
    storageMode: (game.storedInside ? 'inside' : 'box') as 'box' | 'inside',
    groupName: game.groupName ?? '',
    width: disp(game.width),
    height: disp(game.height),
    depth: disp(game.depth),
  });

  function setF<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function openEdit() {
    setForm({
      name: game.name,
      unit: eu,
      type: game.type === 'expansion' ? 'expansion' : 'base',
      baseGameId: game.baseGameId ?? '',
      storageMode: game.storedInside ? 'inside' : 'box',
      groupName: game.groupName ?? '',
      width: disp(game.width),
      height: disp(game.height),
      depth: disp(game.depth),
    });
    setPendingFitWarning(null);
    setBggVersions([]);
    setSelectedVersionId('');
    versionDimsRef.current = null;
    if (game.bggId) {
      const versionsPromise = fetchBggVersions(game.bggId);
      if (game.versionId) {
        versionsPromise.then(versions => {
          setBggVersions(versions);
          setSelectedVersionId(game.versionId!);
        });
      } else if (bggUsername) {
        Promise.all([versionsPromise, fetchBggKnownVersionId(bggUsername, game.bggId)])
          .then(([versions, knownId]) => {
            setBggVersions(versions);
            if (knownId) {
              setSelectedVersionId(knownId);
              updateGame(game.id, { versionId: knownId });
            }
          });
      } else {
        versionsPromise.then(setBggVersions);
      }
    }
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setPendingFitWarning(null);
    setBggVersions([]);
    setSelectedVersionId('');
    versionDimsRef.current = null;
  }

  function setUnit(newUnit: 'cm' | 'in') {
    if (newUnit === form.unit) return;
    function convert(v: string) {
      const n = parseFloat(v);
      if (isNaN(n) || n <= 0) return v;
      return newUnit === 'in' ? (n / 2.54).toFixed(2) : (n * 2.54).toFixed(1);
    }
    setForm(f => ({
      ...f, unit: newUnit,
      width: convert(f.width), height: convert(f.height), depth: convert(f.depth),
    }));
  }

  function commitUpdate(name: string, storedInside: boolean, wCm: string | null, hCm: string | null, dCm: string | null) {
    updateGame(game.id, {
      name,
      type: form.type === 'expansion' ? 'expansion' : undefined,
      baseGameId: (form.type === 'expansion' && form.baseGameId) ? form.baseGameId : undefined,
      storedInside: storedInside || undefined,
      groupName: form.groupName.trim() || undefined,
      width: wCm, height: hCm, depth: dCm,
      unit: form.unit,
    });
    toast(`Updated "${name}"`);
    setEditing(false);
  }

  function saveEdit() {
    const name = form.name.trim();
    if (!name) return;
    const storedInside = form.type === 'expansion' && !!form.baseGameId && form.storageMode === 'inside';
    const wCm = storedInside ? null : toCm(form.width, form.unit);
    const hCm = storedInside ? null : toCm(form.height, form.unit);
    const dCm = storedInside ? null : toCm(form.depth, form.unit);

    const placement = manualPlacements.find(p => p.gameId === game.id);
    if (placement && wCm && hCm && dCm) {
      const testGame = { ...game, width: wCm, height: hCm, depth: dCm };
      if (!fitsInCell(testGame)) {
        setPendingFitWarning({ name, storedInside, wCm, hCm, dCm });
        return;
      }
    }

    commitUpdate(name, storedInside, wCm, hCm, dCm);
  }

  function selectVersion(id: string) {
    setSelectedVersionId(id);
    if (!id) { versionDimsRef.current = null; return; }
    const v = bggVersions.find(v => v.id === id);
    if (!v || !v.widthCm || !v.heightCm || !v.depthCm) return;
    const w = form.unit === 'cm' ? v.widthCm  : (parseFloat(v.widthCm)  / 2.54).toFixed(2);
    const h = form.unit === 'cm' ? v.heightCm : (parseFloat(v.heightCm) / 2.54).toFixed(2);
    const d = form.unit === 'cm' ? v.depthCm  : (parseFloat(v.depthCm)  / 2.54).toFixed(2);
    versionDimsRef.current = { w, h, d };
    setForm(f => ({ ...f, width: w, height: h, depth: d }));
  }

  function setDimField(key: 'width' | 'height' | 'depth', val: string) {
    // If user types something different from what the version populated, clear the selection
    if (versionDimsRef.current) {
      const vd = versionDimsRef.current;
      const expected = key === 'width' ? vd.w : key === 'height' ? vd.h : vd.d;
      if (val !== expected) {
        setSelectedVersionId('');
        versionDimsRef.current = null;
      }
    }
    setF(key, val);
  }

  // Lazily extract accent color from thumbnail if not already stored
  useEffect(() => {
    if (game.thumbnail && !game.accentColor) {
      extractDominantColor(game.thumbnail).then(color => {
        if (color) updateGame(game.id, { accentColor: color });
      });
    }
  }, [game.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isExpansion = game.type === 'expansion';
  const isStoredInside = isExpansion && game.storedInside;
  const baseGame = isExpansion && game.baseGameId ? games.find(g => g.id === game.baseGameId) : null;
  const baseGames = games.filter(g => g.type !== 'expansion' && g.id !== game.id).sort((a,b) => a.name.localeCompare(b.name));

  // Preview dims for edit form
  const tc = (v: string) => form.unit === 'in' ? (parseFloat(v) || 0) * 2.54 : parseFloat(v) || 0;
  const pw = tc(form.width), ph = tc(form.height), pd = tc(form.depth);
  const storedInsideEdit = form.type === 'expansion' && !!form.baseGameId && form.storageMode === 'inside';

  return (
    <>
      {/* ── View mode card (always rendered) ── */}
      <div className={styles.card}>
        {/* Canvas strip */}
        <div
          className={styles.strip}
          style={{ background: hasDims(game) ? col.light : '#DED8D0' }}
        >
          {hasDims(game) && (
            <BoxPreview
              w={parseFloat(game.width!)} h={parseFloat(game.height!)} d={parseFloat(game.depth!)}
              color={col}
            />
          )}
        </div>

        <div className={styles.body}>
          <div className={styles.top}>
            <div className={styles.name}>{game.name}</div>
            <div className={styles.actionBtns}>
              <button className={styles.ico} onClick={openEdit} aria-label="Edit game">✎</button>
              <button className={`${styles.ico} ${styles.del}`} onClick={() => onDeleteRequest(game.id)} aria-label="Delete game">✕</button>
            </div>
          </div>

          {/* Thumbnail + meta side by side */}
          <div className={styles.contentRow}>
            {game.thumbnail && (
              <img src={game.thumbnail} alt="" className={styles.thumbImg} aria-hidden="true" />
            )}

            {/* Meta group: dims · players · pills */}
            <div className={styles.metaGroup}>
              {/* Dimensions line */}
              <div className={styles.metaLine}>
                {isStoredInside
                  ? <span className={styles.metaMuted}>stored within{baseGame ? ` ${baseGame.name}` : ' base game'}</span>
                  : hasDims(game)
                  ? fmtDims(game)
                  : <span className={styles.metaWarn}>no dimensions</span>
                }
              </div>

              {/* Group line */}
              {game.groupName && (
                <div className={styles.metaLine}>{game.groupName}</div>
              )}

              {/* Status pills: Base Game · Expansion · Manually Stored */}
              <div className={styles.statusRow}>
                {!isExpansion && <span className={styles.basePill}>Base Game</span>}
                {isExpansion && <span className={styles.expPill}>Expansion</span>}
                {manualPlacements.some(p => p.gameId === game.id) && (
                  <span className={styles.storedPill}>Manually stored</span>
                )}
              </div>
            </div>
          </div>

          {/* Shelf action link */}
          {(() => {
            const placement = manualPlacements.find(p => p.gameId === game.id);
            if (placement) {
              return (
                <button
                  className={styles.actionLink}
                  onClick={() => setPendingManualView({ unitId: placement.unitId, cellIndex: placement.cellIndex })}
                >
                  View on shelf →
                </button>
              );
            }
            if (hasDims(game) && manualShelves.length > 0) {
              return (
                <button
                  className={styles.actionLink}
                  onClick={() => setPendingManualNav({ unitId: manualShelves[0].id, gameId: game.id })}
                >
                  Store manually →
                </button>
              );
            }
            return null;
          })()}
        </div>
      </div>

      {/* ── Edit modal ── */}
      <Sheet open={editing} onClose={cancelEdit} title={`Edit — ${game.name}`}>
        <div className={styles.editBody}>
          {/* Name */}
          <div className={styles.field}>
            <label className={styles.flabel} htmlFor={`${formId}-name`}>Game name</label>
            <input
              id={`${formId}-name`}
              className={styles.finput}
              type="text"
              name="name"
              autoComplete="off"
              value={form.name}
              onChange={e => setF('name', e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); }}
              autoFocus
            />
          </div>

          {/* Type */}
          <div className={styles.field}>
            <label className={styles.flabel}>Type</label>
            <div className={styles.toggle}>
              <button
                className={`${styles.tbtn} ${form.type === 'base' ? styles.on : ''}`}
                onClick={() => setF('type', 'base')}
              >Base Game</button>
              <button
                className={`${styles.tbtn} ${form.type === 'expansion' ? styles.on : ''}`}
                onClick={() => setF('type', 'expansion')}
              >Expansion</button>
            </div>
          </div>

          {/* Expansion fields */}
          {form.type === 'expansion' && (
            <>
              <div className={styles.field}>
                <label className={styles.flabel}>Base Game</label>
                <select
                  className={styles.fselect}
                  value={form.baseGameId}
                  onChange={e => { setF('baseGameId', e.target.value); setF('storageMode', 'box'); }}
                >
                  <option value="">Select base game…</option>
                  {baseGames.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              {form.baseGameId && (
                <div className={styles.field}>
                  <label className={styles.flabel}>Storage</label>
                  <div className={styles.toggle}>
                    <button
                      className={`${styles.tbtn} ${form.storageMode === 'box' ? styles.on : ''}`}
                      onClick={() => setF('storageMode', 'box')}
                    >In Expansion Box</button>
                    <button
                      className={`${styles.tbtn} ${form.storageMode === 'inside' ? styles.on : ''}`}
                      onClick={() => setF('storageMode', 'inside')}
                    >Within Base Game</button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* BGG Version */}
          {game.bggId && bggVersions.length > 0 && (
            <div className={styles.field}>
              <label className={styles.flabel}>Version</label>
              <select
                className={styles.fselect}
                value={selectedVersionId}
                onChange={e => selectVersion(e.target.value)}
              >
                <option value="">Select edition to fill dimensions…</option>
                {bggVersions.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name}{v.year ? ` (${v.year})` : ''}{v.publisher ? ` — ${v.publisher}` : ''}
                    {v.widthCm && v.heightCm && v.depthCm
                      ? ` · ${v.widthCm}×${v.heightCm}×${v.depthCm}cm`
                      : ' · no dimensions available'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Group */}
          <div className={styles.field}>
            <label className={styles.flabel}>
              Group <span className={styles.optional}>(optional)</span>
            </label>
            <GroupInput value={form.groupName} onChange={v => setF('groupName', v)} />
          </div>

          {/* Dimensions */}
          {!storedInsideEdit && (
            <div className={styles.field}>
              <span className={styles.flabel}>Dimensions</span>
              <div className={styles.dimRow}>
                <div className={styles.dimToggleField}>
                  <UnitToggle value={form.unit} onChange={setUnit} className={styles.dimToggle} />
                </div>
                {(['width','height','depth'] as const).map((k, i) => (
                  <div key={k} className={styles.dimField}>
                    <label className={styles.dimLabel} htmlFor={`${formId}-${k}`}>{['W','H','D'][i]}</label>
                    <input
                      id={`${formId}-${k}`}
                      type="number"
                      name={k}
                      inputMode="decimal"
                      className={styles.dimInput}
                      value={form[k]}
                      onChange={e => setDimField(k, e.target.value)}
                      placeholder={form.unit === 'cm' ? ['29.5','29.5','7.5'][i] : ['11.6','11.6','3.0'][i]}
                      step="0.1"
                      min="0"
                    />
                  </div>
                ))}
              </div>
              {(pw > 0 || ph > 0 || pd > 0) && (
                <div className={styles.preview}>
                  <BoxPreview w={pw||1} h={ph||1} d={pd||1} color={col} />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className={styles.editActions}>
            <button className={styles.cancelBtn} onClick={cancelEdit}>Cancel</button>
            <button className={styles.saveBtn} onClick={saveEdit}>Save</button>
          </div>
        </div>
      </Sheet>

      <ConfirmSheet
        open={!!pendingFitWarning}
        title="Game no longer fits"
        message={<>
          The new dimensions for <strong>{game.name}</strong> are too large to fit in a shelf cell.
          Saving will remove it from your manual shelf — you can reassign it later.
        </>}
        confirmLabel="Save & remove from shelf"
        cancelLabel="Keep old dimensions"
        onConfirm={() => {
          if (!pendingFitWarning) return;
          const { name, storedInside, wCm, hCm, dCm } = pendingFitWarning;
          const placement = manualPlacements.find(p => p.gameId === game.id);
          if (placement) removeManualPlacement(placement.id);
          commitUpdate(name, storedInside, wCm, hCm, dCm);
          setPendingFitWarning(null);
        }}
        onClose={() => setPendingFitWarning(null)}
      />
    </>
  );
}
