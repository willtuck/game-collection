import { useState } from 'react';
import { Sheet } from '../shared/Sheet';
import { useGameStore } from '../../store/useGameStore';
import { kuLabel, unitBadgeLabel, buildCustomModel } from '../../lib/helpers';
import { KALLAX } from '../../lib/packing';
import styles from './KallaxManagerSheet.module.css';

const PRESET_MODELS = ['1x1','1x2','2x1','1x4','4x1','2x2','2x4','4x2','4x4','5x5'];

interface KallaxManagerSheetProps {
  open: boolean;
  onClose: () => void;
}

export function KallaxManagerSheet({ open, onClose }: KallaxManagerSheetProps) {
  const kallaxes          = useGameStore(s => s.kallaxes);
  const addKallax         = useGameStore(s => s.addKallax);
  const removeKallax      = useGameStore(s => s.removeKallax);
  const updateKallaxLabel = useGameStore(s => s.updateKallaxLabel);

  const [newModel,    setNewModel]    = useState('2x4');
  const [newLabel,    setNewLabel]    = useState('');

  // Custom unit fields
  const [customCols,  setCustomCols]  = useState('4');
  const [customRows,  setCustomRows]  = useState('2');
  const [customCellW, setCustomCellW] = useState(String(KALLAX.w));
  const [customCellH, setCustomCellH] = useState(String(KALLAX.h));
  const [customCellD, setCustomCellD] = useState(String(KALLAX.d));

  const isCustom = newModel === 'custom';

  function handleAdd() {
    let model = newModel;
    if (isCustom) {
      const cols  = Math.max(1, parseInt(customCols)  || 2);
      const rows  = Math.max(1, parseInt(customRows)  || 4);
      const cellW = Math.max(1, parseFloat(customCellW) || KALLAX.w);
      const cellH = Math.max(1, parseFloat(customCellH) || KALLAX.h);
      const cellD = Math.max(1, parseFloat(customCellD) || KALLAX.d);
      model = buildCustomModel({ cols, rows, cellW, cellH, cellD });
    }
    addKallax(model, newLabel.trim());
    setNewLabel('');
  }

  return (
    <Sheet open={open} onClose={onClose} title="Shelving units">
      <div className={styles.list}>
        {kallaxes.map(ku => (
          <div key={ku.id} className={styles.row}>
            <span className={styles.modelBadge}>{unitBadgeLabel(ku)}</span>
            <input
              className={styles.labelInput}
              value={ku.label}
              onChange={e => updateKallaxLabel(ku.id, e.target.value)}
              placeholder={unitBadgeLabel(ku)}
              aria-label="Unit label"
            />
            <button
              className={styles.deleteBtn}
              onClick={() => removeKallax(ku.id)}
              disabled={kallaxes.length === 1}
              aria-label={kallaxes.length === 1 ? "Can't remove the last unit" : `Remove ${ku.label}`}
            >✕</button>
          </div>
        ))}
      </div>

      <div className={styles.divider} />

      <div className={styles.addSection}>
        <div className={styles.sectionLabel}>Add a unit</div>
        <div className={styles.addRow}>
          <select
            className={styles.modelSelect}
            value={newModel}
            onChange={e => setNewModel(e.target.value)}
            aria-label="Unit type"
          >
            {PRESET_MODELS.map(m => (
              <option key={m} value={m}>{kuLabel(m)}</option>
            ))}
            <option disabled>──────────</option>
            <option value="custom">Custom…</option>
          </select>
          <input
            className={styles.newLabelInput}
            placeholder="Label (optional)"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
        </div>

        {isCustom && (
          <div className={styles.customFields}>
            <div className={styles.customRow}>
              <div className={styles.customGroup}>
                <div className={styles.customGroupLabel}>Grid</div>
                <div className={styles.gridInputs}>
                  <div className={styles.customField}>
                    <label className={styles.customFieldLabel}>Cols</label>
                    <input
                      type="number"
                      className={styles.customInput}
                      value={customCols}
                      onChange={e => setCustomCols(e.target.value)}
                      min="1" max="20" step="1"
                    />
                  </div>
                  <span className={styles.gridX}>×</span>
                  <div className={styles.customField}>
                    <label className={styles.customFieldLabel}>Rows</label>
                    <input
                      type="number"
                      className={styles.customInput}
                      value={customRows}
                      onChange={e => setCustomRows(e.target.value)}
                      min="1" max="20" step="1"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.customGroup}>
                <div className={styles.customGroupLabel}>Cell interior (cm)</div>
                <div className={styles.dimsInputs}>
                  {([
                    ['W', customCellW, setCustomCellW],
                    ['H', customCellH, setCustomCellH],
                    ['D', customCellD, setCustomCellD],
                  ] as [string, string, (v: string) => void][]).map(([lbl, val, set]) => (
                    <div key={lbl} className={styles.customField}>
                      <label className={styles.customFieldLabel}>{lbl}</label>
                      <input
                        type="number"
                        className={styles.customInput}
                        value={val}
                        onChange={e => set(e.target.value)}
                        min="1" step="0.5"
                        placeholder={lbl === 'W' ? String(KALLAX.w) : lbl === 'H' ? String(KALLAX.h) : String(KALLAX.d)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <button className={styles.addBtn} onClick={handleAdd}>
          Add unit
        </button>
      </div>
    </Sheet>
  );
}
