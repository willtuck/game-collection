import { useState, useId, useEffect } from 'react';
import { Sheet } from '../shared/Sheet';
import { GroupInput } from '../collection/GroupInput';
import { BoxPreview } from '../collection/BoxPreview';
import { UnitToggle } from '../shared/UnitToggle';
import { useGameStore } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { contributeDims } from '../../lib/supabaseSync';
import { toCm } from '../../lib/helpers';
import { toast } from '../shared/Toast';
import { searchBgg, fetchBggGameDetails } from '../../lib/bggApi';
import type { BggSearchResult, BggVersion } from '../../lib/bggApi';
import type { Game } from '../../lib/types';
import styles from './AddGameSheet.module.css';

interface AddGameSheetProps {
  open: boolean;
  onClose: () => void;
}

interface AddFormState {
  name: string;
  unit: 'cm' | 'in';
  type: 'base' | 'expansion';
  baseGameId: string;
  storageMode: 'box' | 'inside';
  groupName: string;
  width: string;
  height: string;
  depth: string;
}

const EMPTY: AddFormState = {
  name: '', unit: 'cm', type: 'base', baseGameId: '',
  storageMode: 'box', groupName: '', width: '', height: '', depth: '',
};

interface BggSelection {
  bggId: string;
  thumbnail: string;
  versions: BggVersion[];
  loadingDetails: boolean;
}

export function AddGameSheet({ open, onClose }: AddGameSheetProps) {
  const formId = useId();
  const [form, setForm] = useState<AddFormState>(EMPTY);
  const [nameErr, setNameErr] = useState('');
  const [bggResults, setBggResults] = useState<BggSearchResult[]>([]);
  const [bggSearching, setBggSearching] = useState(false);
  const [showBggDropdown, setShowBggDropdown] = useState(false);
  const [bggSelected, setBggSelected] = useState<BggSelection | null>(null);
  const [bggVersionId, setBggVersionId] = useState('');
  const games = useGameStore(s => s.games);
  const addGame = useGameStore(s => s.addGame);

  function set<K extends keyof AddFormState>(key: K, val: AddFormState[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  useEffect(() => {
    const name = form.name.trim();
    if (name.length < 3 || bggSelected) {
      setBggResults([]);
      setShowBggDropdown(false);
      return;
    }
    setBggSearching(true);
    const tid = setTimeout(async () => {
      try {
        const results = await searchBgg(name);
        setBggResults(results);
        setShowBggDropdown(results.length > 0);
      } catch {
        setBggResults([]);
      } finally {
        setBggSearching(false);
      }
    }, 500);
    return () => clearTimeout(tid);
  }, [form.name, bggSelected]);

  async function handleBggSelect(result: BggSearchResult) {
    setShowBggDropdown(false);
    setBggResults([]);
    set('name', result.name);
    set('type', result.type === 'boardgameexpansion' ? 'expansion' : 'base');
    setBggSelected({ bggId: result.bggId, thumbnail: '', versions: [], loadingDetails: true });
    try {
      const details = await fetchBggGameDetails(result.bggId);
      setBggSelected({ bggId: result.bggId, thumbnail: details.thumbnail, versions: details.versions, loadingDetails: false });
    } catch {
      setBggSelected(s => s ? { ...s, loadingDetails: false } : null);
    }
  }

  function handleVersionChange(versionId: string) {
    setBggVersionId(versionId);
    if (!bggSelected || !versionId) return;
    const v = bggSelected.versions.find(v => v.id === versionId);
    if (!v) return;
    set('unit', 'cm');
    if (v.widthCm)  set('width',  v.widthCm);
    if (v.heightCm) set('height', v.heightCm);
    if (v.depthCm)  set('depth',  v.depthCm);
  }

  function resetBgg() {
    setBggSelected(null);
    setBggVersionId('');
    setBggResults([]);
    setShowBggDropdown(false);
    setBggSearching(false);
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

  const baseGames = games.filter(g => g.type !== 'expansion').sort((a,b) => a.name.localeCompare(b.name));

  // Dims in cm for preview
  const tc = (v: string) => form.unit === 'in' ? (parseFloat(v) || 0) * 2.54 : parseFloat(v) || 0;
  const pw = tc(form.width), ph = tc(form.height), pd = tc(form.depth);
  const showPreview = pw > 0 || ph > 0 || pd > 0;

  const storedInside = form.type === 'expansion' && form.baseGameId && form.storageMode === 'inside';

  function handleSubmit() {
    const name = form.name.trim();
    if (!name) { setNameErr('Game name is required.'); return; }
    setNameErr('');

    const game: Game = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      bggId: bggSelected?.bggId || undefined,
      thumbnail: bggSelected?.thumbnail || undefined,
      name,
      type: form.type === 'expansion' ? 'expansion' : undefined,
      baseGameId: (form.type === 'expansion' && form.baseGameId) ? form.baseGameId : undefined,
      storedInside: storedInside || undefined,
      groupName: form.groupName.trim() || undefined,
      width:  storedInside ? null : toCm(form.width, form.unit),
      height: storedInside ? null : toCm(form.height, form.unit),
      depth:  storedInside ? null : toCm(form.depth, form.unit),
      unit: form.unit,
      added: new Date().toISOString(),
    };

    addGame(game);
    if (!storedInside && game.width && game.height && game.depth) {
      const uid = useAuthStore.getState().user?.id;
      if (uid) contributeDims(game.name, game.width, game.height, game.depth, uid);
    }
    toast(`Added "${name}"`);
    setForm(EMPTY);
    resetBgg();
    onClose();
  }

  function handleClose() {
    setForm(EMPTY);
    setNameErr('');
    resetBgg();
    onClose();
  }

  return (
    <Sheet open={open} onClose={handleClose} title="Add a game">
      <div className={styles.form}>
        {/* Name */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${formId}-name`}>
            Game name
            {bggSearching && <span className={styles.searchingHint}> — searching BGG…</span>}
          </label>
          <div className={styles.nameWrap}>
            <input
              id={`${formId}-name`}
              type="text"
              name="name"
              autoComplete="off"
              className={styles.input}
              value={form.name}
              onChange={e => { set('name', e.target.value); setNameErr(''); setBggSelected(null); setBggVersionId(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') setShowBggDropdown(false); }}
              onBlur={() => setShowBggDropdown(false)}
              placeholder="e.g. Wingspan"
              autoFocus={window.matchMedia('(hover: hover)').matches}
            />
            {showBggDropdown && bggResults.length > 0 && (
              <div className={styles.suggestions} role="listbox">
                {bggResults.map(r => (
                  <button
                    key={r.bggId}
                    type="button"
                    className={styles.suggestion}
                    role="option"
                    onMouseDown={e => { e.preventDefault(); handleBggSelect(r); }}
                  >
                    <span className={styles.suggestionName}>{r.name}</span>
                    {r.yearPublished && <span className={styles.suggestionYear}>{r.yearPublished}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {nameErr && <div className={styles.err}>{nameErr}</div>}
        </div>

        {/* BGG selection: thumbnail + edition picker */}
        {bggSelected && (
          <div className={styles.bggRow}>
            {bggSelected.thumbnail && (
              <img src={bggSelected.thumbnail} alt="" className={styles.bggThumb} />
            )}
            <div className={styles.bggVersionWrap}>
              <label className={styles.label}>Edition <span className={styles.optional}>(fills dimensions)</span></label>
              {bggSelected.loadingDetails ? (
                <span className={styles.bggHint}>Loading editions…</span>
              ) : bggSelected.versions.length > 0 ? (
                <select
                  className={styles.select}
                  value={bggVersionId}
                  onChange={e => handleVersionChange(e.target.value)}
                >
                  <option value="">Select edition…</option>
                  {bggSelected.versions.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name}{v.year ? ` (${v.year})` : ''}{v.publisher ? ` — ${v.publisher}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={styles.bggHint}>No editions found on BGG</span>
              )}
            </div>
          </div>
        )}

        {/* Type */}
        <div className={styles.field}>
          <label className={styles.label}>Type</label>
          <div className={styles.toggle}>
            <button
              className={`${styles.tbtn} ${form.type === 'base' ? styles.on : ''}`}
              onClick={() => set('type', 'base')}
            >Base Game</button>
            <button
              className={`${styles.tbtn} ${form.type === 'expansion' ? styles.on : ''}`}
              onClick={() => set('type', 'expansion')}
            >Expansion</button>
          </div>
        </div>

        {/* Expansion fields */}
        {form.type === 'expansion' && (
          <>
            <div className={styles.field}>
              <label className={styles.label}>Base Game</label>
              <select
                className={styles.select}
                value={form.baseGameId}
                onChange={e => { set('baseGameId', e.target.value); set('storageMode', 'box'); }}
              >
                <option value="">Select base game…</option>
                {baseGames.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            {form.baseGameId && (
              <div className={styles.field}>
                <label className={styles.label}>Storage</label>
                <div className={styles.toggle}>
                  <button
                    className={`${styles.tbtn} ${form.storageMode === 'box' ? styles.on : ''}`}
                    onClick={() => set('storageMode', 'box')}
                  >In Expansion Box</button>
                  <button
                    className={`${styles.tbtn} ${form.storageMode === 'inside' ? styles.on : ''}`}
                    onClick={() => set('storageMode', 'inside')}
                  >Stored Within Base</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Group */}
        <div className={styles.field}>
          <label className={styles.label}>
            Group <span className={styles.optional}>(optional)</span>
          </label>
          <GroupInput value={form.groupName} onChange={v => set('groupName', v)} />
        </div>

        {/* Dimensions */}
        {!storedInside && (
          <div className={styles.field}>
            <div className={styles.dimHeader}>
              <span className={styles.label}>Box dimensions</span>
              <UnitToggle value={form.unit} onChange={setUnit} />
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
                    onChange={e => set(k, e.target.value)}
                    placeholder={form.unit === 'cm' ? ['29.5','29.5','7.5'][i] : ['11.6','11.6','3.0'][i]}
                    step="0.1"
                    min="0"
                  />
                </div>
              ))}
            </div>
            {showPreview && (
              <div className={styles.preview}>
                <BoxPreview w={pw || 1} h={ph || 1} d={pd || 1} />
              </div>
            )}
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.cancel} onClick={handleClose}>Cancel</button>
          <button className={styles.submit} onClick={handleSubmit}>Add to collection</button>
        </div>
      </div>
    </Sheet>
  );
}
