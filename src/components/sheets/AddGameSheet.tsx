import { useState } from 'react';
import { Sheet } from '../shared/Sheet';
import { GroupInput } from '../collection/GroupInput';
import { BoxPreview } from '../collection/BoxPreview';
import { useGameStore } from '../../store/useGameStore';
import { toCm } from '../../lib/helpers';
import { toast } from '../shared/Toast';
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

export function AddGameSheet({ open, onClose }: AddGameSheetProps) {
  const [form, setForm] = useState<AddFormState>(EMPTY);
  const [nameErr, setNameErr] = useState('');
  const { games, addGame } = useGameStore(s => ({ games: s.games, addGame: s.addGame }));

  function set<K extends keyof AddFormState>(key: K, val: AddFormState[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

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
    toast(`Added "${name}"`);
    setForm(EMPTY);
    onClose();
  }

  function handleClose() {
    setForm(EMPTY);
    setNameErr('');
    onClose();
  }

  return (
    <Sheet open={open} onClose={handleClose} title="Add a game">
      <div className={styles.form}>
        {/* Name */}
        <div className={styles.field}>
          <label className={styles.label}>Game name</label>
          <input
            type="text"
            className={styles.input}
            value={form.name}
            onChange={e => { set('name', e.target.value); setNameErr(''); }}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="e.g. Wingspan"
            autoFocus
          />
          {nameErr && <div className={styles.err}>{nameErr}</div>}
        </div>

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

        <button className={styles.submit} onClick={handleSubmit}>
          Add to collection
        </button>
      </div>
    </Sheet>
  );
}
