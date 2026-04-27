import { useState, useId } from 'react';
import { Sheet } from '../shared/Sheet';
import { GroupInput } from '../collection/GroupInput';
import { BoxPreview } from '../collection/BoxPreview';
import { useGameStore } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { contributeDims } from '../../lib/supabaseSync';
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
  minPlayers: string;
  maxPlayers: string;
}

const EMPTY: AddFormState = {
  name: '', unit: 'cm', type: 'base', baseGameId: '',
  storageMode: 'box', groupName: '', width: '', height: '', depth: '',
  minPlayers: '', maxPlayers: '',
};

export function AddGameSheet({ open, onClose }: AddGameSheetProps) {
  const formId = useId();
  const [form, setForm] = useState<AddFormState>(EMPTY);
  const [nameErr, setNameErr] = useState('');
  const games = useGameStore(s => s.games);
  const addGame = useGameStore(s => s.addGame);

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
      minPlayers: form.minPlayers.trim() || undefined,
      maxPlayers: form.maxPlayers.trim() || undefined,
      added: new Date().toISOString(),
    };

    addGame(game);
    if (!storedInside && game.width && game.height && game.depth) {
      const uid = useAuthStore.getState().user?.id;
      if (uid) contributeDims(game.name, game.width, game.height, game.depth, uid);
    }
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
    <Sheet open={open} onClose={handleClose} title="Add a game" modal>
      <div className={styles.form}>
        {/* Name */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${formId}-name`}>Game name</label>
          <input
            id={`${formId}-name`}
            type="text"
            name="name"
            autoComplete="off"
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

        {/* Players */}
        <div className={styles.field}>
          <label className={styles.label}>
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
                onChange={e => set('minPlayers', e.target.value)}
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
                onChange={e => set('maxPlayers', e.target.value)}
                placeholder="4"
                min="1"
                max="99"
              />
            </div>
          </div>
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

        <button className={styles.submit} onClick={handleSubmit}>
          Add to collection
        </button>
      </div>
    </Sheet>
  );
}
