import { useState } from 'react';
import { BoxPreview } from './BoxPreview';
import { GroupInput } from './GroupInput';
import { useGameStore } from '../../store/useGameStore';
import { hasDims, toCm, fmtDims, fmtDate } from '../../lib/helpers';
import { gameColor } from '../../lib/colors';
import { toast } from '../shared/Toast';
import type { Game } from '../../lib/types';
import styles from './GameCard.module.css';

interface GameCardProps {
  game: Game;
  onDeleteRequest: (id: string) => void;
}

export function GameCard({ game, onDeleteRequest }: GameCardProps) {
  const [editing, setEditing] = useState(false);
  const games = useGameStore(s => s.games);
  const updateGame = useGameStore(s => s.updateGame);
  const col = gameColor(game.id);

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
    setEditing(true);
  }

  function cancelEdit() { setEditing(false); }

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

  function saveEdit() {
    const name = form.name.trim();
    if (!name) return;
    const storedInside = form.type === 'expansion' && !!form.baseGameId && form.storageMode === 'inside';
    updateGame(game.id, {
      name,
      type: form.type === 'expansion' ? 'expansion' : undefined,
      baseGameId: (form.type === 'expansion' && form.baseGameId) ? form.baseGameId : undefined,
      storedInside: storedInside || undefined,
      groupName: form.groupName.trim() || undefined,
      width:  storedInside ? null : toCm(form.width, form.unit),
      height: storedInside ? null : toCm(form.height, form.unit),
      depth:  storedInside ? null : toCm(form.depth, form.unit),
      unit: form.unit,
      minPlayers: form.minPlayers.trim() || undefined,
      maxPlayers: form.maxPlayers.trim() || undefined,
    });
    toast(`Updated "${name}"`);
    setEditing(false);
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
        <div className={styles.strip} style={{ background: col.fill.replace(/[\d.]+\)$/, '0.04)') }}>
          {hasDims(game) ? (
            <BoxPreview
              w={parseFloat(game.width!)} h={parseFloat(game.height!)} d={parseFloat(game.depth!)}
              gameId={game.id}
            />
          ) : isStoredInside ? (
            <div className={styles.nodims}>
              <span>📦</span><span>stored within base game</span>
            </div>
          ) : (
            <div className={styles.nodims}>
              <span style={{ opacity: 0.3 }}>⬜</span><span>needs dimensions</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className={styles.body}>
          <div className={styles.top}>
            <div className={styles.name}>{game.name}</div>
            <div className={styles.actions}>
              <button className={styles.ico} onClick={openEdit} title="Edit">✎</button>
              <button className={`${styles.ico} ${styles.del}`} onClick={() => onDeleteRequest(game.id)} title="Delete">✕</button>
            </div>
          </div>

          {isExpansion && (
            <div className={styles.expBadge}>
              {baseGame ? `expansion · ${baseGame.name}` : 'expansion'}
            </div>
          )}
          {!isExpansion && hasExpansions && (
            <div className={styles.baseBadge}>base game</div>
          )}
          {game.groupName && (
            <div className={styles.groupBadge}>group · {game.groupName}</div>
          )}

          <div className={styles.meta}>
            {isStoredInside ? (
              <span className={styles.storedBadge}>
                stored within{baseGame ? ` ${baseGame.name}` : ' base game'}
              </span>
            ) : hasDims(game) ? (
              <span className={styles.dims}>{fmtDims(game)}</span>
            ) : (
              <span className={styles.dimsMissing}>dims missing</span>
            )}
            {(game.minPlayers || game.maxPlayers) && (
              <span className={styles.players}>
                {game.minPlayers === game.maxPlayers || !game.maxPlayers
                  ? `${game.minPlayers} ${parseInt(game.minPlayers!) === 1 ? 'player' : 'players'}`
                  : `${game.minPlayers}–${game.maxPlayers} players`}
              </span>
            )}
          </div>

          <div className={styles.date}>Added {fmtDate(game.added)}</div>
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
          <label className={styles.flabel}>Game name</label>
          <input
            className={styles.finput}
            type="text"
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
              <label className={styles.dimLabel}>Min</label>
              <input
                type="number"
                className={styles.dimInput}
                value={form.minPlayers}
                onChange={e => setF('minPlayers', e.target.value)}
                placeholder="1"
                min="1"
                max="99"
              />
            </div>
            <div className={styles.dimField}>
              <label className={styles.dimLabel}>Max</label>
              <input
                type="number"
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
                  <label className={styles.dimLabel}>{['W','H','D'][i]}</label>
                  <input
                    type="number"
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
          </div>
        )}

        {/* Actions */}
        <div className={styles.editActions}>
          <button className={styles.saveBtn} onClick={saveEdit}>Save</button>
          <button className={styles.cancelBtn} onClick={cancelEdit}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
