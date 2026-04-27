import { useState, useId } from 'react';
import { BoxPreview } from './BoxPreview';
import { GroupInput } from './GroupInput';
import { useGameStore } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchDimSuggestions, contributeDims, type DimSuggestion } from '../../lib/supabaseSync';
import { hasDims, toCm, fmtDims, fmtDate } from '../../lib/helpers';
import { gameColor } from '../../lib/colors';
import { ConfirmSheet } from '../shared/ConfirmSheet';
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
  const userId = useAuthStore(s => s.user?.id);
  const manualKallaxes       = useGameStore(s => s.manualKallaxes);
  const manualPlacements     = useGameStore(s => s.manualPlacements);
  const setPendingManualNav  = useGameStore(s => s.setPendingManualNav);
  const setPendingManualView  = useGameStore(s => s.setPendingManualView);
  const removeManualPlacement = useGameStore(s => s.removeManualPlacement);
  const col = gameColor(game.id);
  const [dimSuggestions, setDimSuggestions] = useState<DimSuggestion[]>([]);
  const [activeSugIdx, setActiveSugIdx] = useState<number | null>(null);
  const [savedDims, setSavedDims] = useState<{ width: string; height: string; depth: string } | null>(null);
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
    minPlayers: game.minPlayers ?? '',
    maxPlayers: game.maxPlayers ?? '',
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
      minPlayers: game.minPlayers ?? '',
      maxPlayers: game.maxPlayers ?? '',
    });
    setDimSuggestions([]);
    setActiveSugIdx(null);
    setSavedDims(null);
    setPendingFitWarning(null);
    fetchDimSuggestions(game.name).then(setDimSuggestions);
    setEditing(true);
  }

  function cancelEdit() { setEditing(false); setDimSuggestions([]); setActiveSugIdx(null); setSavedDims(null); setPendingFitWarning(null); }

  function toggleUnit() {
    const newUnit = form.unit === 'cm' ? 'in' : 'cm';
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
      minPlayers: form.minPlayers.trim() || undefined,
      maxPlayers: form.maxPlayers.trim() || undefined,
    });
    if (!storedInside && wCm && hCm && dCm && userId) {
      contributeDims(name, wCm, hCm, dCm, userId);
    }
    toast(`Updated "${name}"`);
    setEditing(false);
    setDimSuggestions([]);
    setActiveSugIdx(null);
    setSavedDims(null);
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

  function applySuggestion(s: DimSuggestion, i: number) {
    if (activeSugIdx === i) {
      // Deselect — revert to saved dims
      if (savedDims) setForm(f => ({ ...f, ...savedDims }));
      setActiveSugIdx(null);
      setSavedDims(null);
    } else {
      // Select — save current dims on first pick, then apply
      if (activeSugIdx === null) {
        setSavedDims({ width: form.width, height: form.height, depth: form.depth });
      }
      setForm(f => ({
        ...f,
        width:  f.unit === 'cm' ? s.width  : (parseFloat(s.width)  / 2.54).toFixed(2),
        height: f.unit === 'cm' ? s.height : (parseFloat(s.height) / 2.54).toFixed(2),
        depth:  f.unit === 'cm' ? s.depth  : (parseFloat(s.depth)  / 2.54).toFixed(2),
      }));
      setActiveSugIdx(i);
    }
  }

  function fmtSug(v: string) {
    if (form.unit === 'cm') return v;
    return (parseFloat(v) / 2.54).toFixed(1);
  }

  const isExpansion = game.type === 'expansion';
  const isStoredInside = isExpansion && game.storedInside;
  const baseGame = isExpansion && game.baseGameId ? games.find(g => g.id === game.baseGameId) : null;
  const hasExpansions = !isExpansion && games.some(e => e.type === 'expansion' && e.baseGameId === game.id);
  const baseGames = games.filter(g => g.type !== 'expansion' && g.id !== game.id).sort((a,b) => a.name.localeCompare(b.name));

  // Preview dims for edit form
  const tc = (v: string) => form.unit === 'in' ? (parseFloat(v) || 0) * 2.54 : parseFloat(v) || 0;
  const pw = tc(form.width), ph = tc(form.height), pd = tc(form.depth);
  const storedInsideEdit = form.type === 'expansion' && !!form.baseGameId && form.storageMode === 'inside';

  // ── View mode ──
  if (!editing) {
    return (
      <div className={styles.card} style={{ borderTopColor: col.stroke }}>
        {/* Canvas strip */}
        <div
          className={styles.strip}
          style={{ background: hasDims(game) ? col.fill.replace(/[\d.]+\)$/, '0.04)') : '#DED8D0' }}
        >
          {hasDims(game) && (
            <BoxPreview
              w={parseFloat(game.width!)} h={parseFloat(game.height!)} d={parseFloat(game.depth!)}
              gameId={game.id}
            />
          )}
        </div>

        {/* Body */}
        <div className={styles.body}>
          <div className={styles.top}>
            <div className={styles.name}>{game.name}</div>
            <div className={styles.actions}>
              <button className={styles.ico} onClick={openEdit} aria-label="Edit game">✎</button>
              <button className={`${styles.ico} ${styles.del}`} onClick={() => onDeleteRequest(game.id)} aria-label="Delete game">✕</button>
            </div>
          </div>

          {/* Status pills: type + placement only */}
          {(isExpansion || (!isExpansion && hasExpansions) || manualPlacements.some(p => p.gameId === game.id)) && (
            <div className={styles.statusRow}>
              {isExpansion && <span className={styles.expPill}>Expansion</span>}
              {!isExpansion && hasExpansions && <span className={styles.basePill}>Base Game</span>}
              {manualPlacements.some(p => p.gameId === game.id) && (
                <span className={styles.storedPill}>Manually stored</span>
              )}
            </div>
          )}

          {/* Flat metadata line: dims · players · group */}
          <div className={styles.metaLine}>
            {isStoredInside
              ? <span className={styles.metaMuted}>stored within{baseGame ? ` ${baseGame.name}` : ' base game'}</span>
              : hasDims(game)
              ? fmtDims(game)
              : <span className={styles.metaWarn}>no dimensions</span>
            }
            {(game.minPlayers || game.maxPlayers) && (
              <span className={styles.metaSep}> · </span>
            )}
            {(game.minPlayers || game.maxPlayers) && (
              game.minPlayers === game.maxPlayers || !game.maxPlayers
                ? `${game.minPlayers}p`
                : `${game.minPlayers}–${game.maxPlayers}p`
            )}
            {game.groupName && <><span className={styles.metaSep}> · </span>{game.groupName}</>}
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
            if (hasDims(game) && manualKallaxes.length > 0) {
              return (
                <button
                  className={styles.actionLink}
                  onClick={() => setPendingManualNav({ unitId: manualKallaxes[0].id, gameId: game.id })}
                >
                  Store manually →
                </button>
              );
            }
            return null;
          })()}
        </div>
      </div>
    );
  }

  // ── Edit mode ──
  return (
    <div className={styles.card} style={{ borderTopColor: col.stroke }}>
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

        {/* Group */}
        <div className={styles.field}>
          <label className={styles.flabel}>
            Group <span className={styles.optional}>(optional)</span>
          </label>
          <GroupInput value={form.groupName} onChange={v => setF('groupName', v)} />
        </div>

        {/* Players */}
        <div className={styles.field}>
          <label className={styles.flabel}>
            Players <span className={styles.optional}>(optional)</span>
          </label>
          <div className={styles.playersRow}>
            <div className={styles.dimField}>
              <label className={styles.dimLabel} htmlFor={`${formId}-minPlayers`}>Min</label>
              <input
                id={`${formId}-minPlayers`}
                type="number"
                name="minPlayers"
                className={styles.dimInput}
                value={form.minPlayers}
                onChange={e => setF('minPlayers', e.target.value)}
                placeholder="1"
                min="1"
                max="99"
              />
            </div>
            <div className={styles.dimField}>
              <label className={styles.dimLabel} htmlFor={`${formId}-maxPlayers`}>Max</label>
              <input
                id={`${formId}-maxPlayers`}
                type="number"
                name="maxPlayers"
                className={styles.dimInput}
                value={form.maxPlayers}
                onChange={e => setF('maxPlayers', e.target.value)}
                placeholder="4"
                min="1"
                max="99"
              />
            </div>
          </div>
        </div>

        {/* Dimensions */}
        {!storedInsideEdit && (
          <div className={styles.field}>
            <div className={styles.dimHeader}>
              <span className={styles.flabel}>Dimensions</span>
              <button className={styles.unitBtn} onClick={toggleUnit}>{form.unit}</button>
            </div>
            <div className={styles.dimRow}>
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
                    onChange={e => setF(k, e.target.value)}
                    placeholder={form.unit === 'cm' ? ['29.5','29.5','7.5'][i] : ['11.6','11.6','3.0'][i]}
                    step="0.1"
                    min="0"
                  />
                </div>
              ))}
            </div>
            {(pw > 0 || ph > 0 || pd > 0) && (
              <div className={styles.preview}>
                <BoxPreview w={pw||1} h={ph||1} d={pd||1} gameId={game.id} />
              </div>
            )}
            {dimSuggestions.length > 0 && (
              <div className={styles.suggestions}>
                <span className={styles.sugLabel}>Suggested</span>
                {dimSuggestions.map((s, i) => (
                  <button
                    key={i}
                    className={`${styles.sugChip} ${activeSugIdx === i ? styles.sugChipActive : ''}`}
                    onClick={() => applySuggestion(s, i)}
                  >
                    {fmtSug(s.width)} × {fmtSug(s.height)} × {fmtSug(s.depth)} {form.unit}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className={styles.editActions}>
          <button className={styles.saveBtn} onClick={saveEdit}>Save</button>
          <button className={styles.cancelBtn} onClick={cancelEdit}>Cancel</button>
        </div>
      </div>

      <ConfirmSheet
        open={!!pendingFitWarning}
        title="Game no longer fits"
        message={<>
          The new dimensions for <strong>{game.name}</strong> are too large to fit in a Kallax cell.
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
    </div>
  );
}
