import { useState, useRef } from 'react';
import { Sheet } from '../shared/Sheet';
import { useGameStore } from '../../store/useGameStore';
import { shelfLabel, unitBadgeLabel, buildCustomModel } from '../../lib/helpers';
import { KALLAX } from '../../lib/packing';
import type { ShelfUnit } from '../../lib/types';
import styles from './KallaxManagerSheet.module.css';

const PRESET_MODELS = ['1x1','1x2','2x1','1x4','4x1','2x2','2x4','4x2','4x4','5x5'];

interface ShelfManagerSheetProps {
  open: boolean;
  onClose: () => void;
  /** Optional: override the store's data/actions for a separate unit list (e.g. manual units) */
  units?: ShelfUnit[];
  onAdd?: (model: string, label: string) => void;
  onRemove?: (id: string) => void;
  onUpdateLabel?: (id: string, label: string) => void;
  title?: string;
}

/** Convert a cm value to the display unit */
function toDisplay(cmVal: number, unit: 'cm' | 'in'): string {
  return unit === 'in' ? (cmVal / 2.54).toFixed(1) : String(cmVal);
}

/** Parse a display-unit string to cm */
function toCm(val: string, unit: 'cm' | 'in'): number {
  const n = parseFloat(val) || 0;
  return unit === 'in' ? n * 2.54 : n;
}

export function ShelfManagerSheet({ open, onClose, units: unitsProp, onAdd: onAddProp, onRemove: onRemoveProp, onUpdateLabel: onUpdateLabelProp, title = 'Shelving units' }: ShelfManagerSheetProps) {
  const storeShelves            = useGameStore(s => s.shelves);
  const storeAddShelf           = useGameStore(s => s.addShelf);
  const storeRemoveShelf        = useGameStore(s => s.removeShelf);
  const storeUpdateShelfLabel   = useGameStore(s => s.updateShelfLabel);

  const shelves           = unitsProp          ?? storeShelves;
  const addShelf          = onAddProp          ?? storeAddShelf;
  const removeShelf       = onRemoveProp       ?? storeRemoveShelf;
  const updateShelfLabel  = onUpdateLabelProp  ?? storeUpdateShelfLabel;

  const [newModel,    setNewModel]    = useState('2x4');
  const [newLabel,    setNewLabel]    = useState('');

  // Custom unit fields (values stored in the currently selected display unit)
  const [dimUnit,     setDimUnit]     = useState<'cm' | 'in'>('cm');
  const [customCols,  setCustomCols]  = useState('4');
  const [customRows,  setCustomRows]  = useState('2');
  const [customCellW, setCustomCellW] = useState(toDisplay(KALLAX.w, 'cm'));
  const [customCellH, setCustomCellH] = useState(toDisplay(KALLAX.h, 'cm'));
  const [customCellD, setCustomCellD] = useState(toDisplay(KALLAX.d, 'cm'));

  const isCustom = newModel === 'custom';

  // Refs for each label input so we can focus on pencil-click
  const labelRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  function handleDimUnitChange(next: 'cm' | 'in') {
    if (next === dimUnit) return;
    // Convert current values to the new unit
    const convert = (v: string) => {
      const cm = toCm(v, dimUnit);
      return next === 'in' ? (cm / 2.54).toFixed(1) : cm.toFixed(1);
    };
    setCustomCellW(convert(customCellW));
    setCustomCellH(convert(customCellH));
    setCustomCellD(convert(customCellD));
    setDimUnit(next);
  }

  function handleAdd() {
    let model = newModel;
    let label = newLabel.trim();

    if (isCustom) {
      const cols  = Math.max(1, parseInt(customCols)  || 2);
      const rows  = Math.max(1, parseInt(customRows)  || 4);
      const cellW = Math.max(1, toCm(customCellW, dimUnit) || KALLAX.w);
      const cellH = Math.max(1, toCm(customCellH, dimUnit) || KALLAX.h);
      const cellD = Math.max(1, toCm(customCellD, dimUnit) || KALLAX.d);
      model = buildCustomModel({ cols, rows, cellW, cellH, cellD });

      // Auto-name if blank: "Custom 1", "Custom 2", …
      if (!label) {
        const existingCustom = shelves.filter(k => k.model.startsWith('custom:')).length;
        label = `Custom ${existingCustom + 1}`;
      }
    }

    addShelf(model, label);
    setNewLabel('');
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {/* ── Existing units ── */}
      <div className={styles.list}>
        {shelves.map(shelf => (
          <div key={shelf.id} className={styles.row}>
            <span className={styles.modelBadge}>{unitBadgeLabel(shelf)}</span>
            <div className={styles.labelWrap}>
              <input
                ref={el => { if (el) labelRefs.current.set(shelf.id, el); else labelRefs.current.delete(shelf.id); }}
                className={styles.labelInput}
                value={shelf.label}
                onChange={e => updateShelfLabel(shelf.id, e.target.value)}
                placeholder="Rename…"
                aria-label={`Name for ${unitBadgeLabel(shelf)} unit`}
              />
              <button
                className={styles.pencilBtn}
                onClick={() => labelRefs.current.get(shelf.id)?.focus()}
                tabIndex={-1}
                aria-hidden="true"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M9.5 1.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  <path d="M8 3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <button
              className={styles.deleteBtn}
              onClick={() => removeShelf(shelf.id)}
              disabled={shelves.length === 1}
              aria-label={shelves.length === 1 ? "Can't remove the last unit" : `Remove ${shelf.label}`}
            >✕</button>
          </div>
        ))}
      </div>

      <div className={styles.divider} />

      {/* ── Add a unit ── */}
      <div className={styles.addSection}>
        <div className={styles.sectionLabel}>Add a unit</div>
        <div className={styles.addRow}>
          <select
            className={styles.modelSelect}
            value={newModel}
            onChange={e => setNewModel(e.target.value)}
            aria-label="Unit type"
          >
            <optgroup label="Ikea Kallax">
              {PRESET_MODELS.map(m => (
                <option key={m} value={m}>{shelfLabel(m)}</option>
              ))}
            </optgroup>
            <option disabled>──────────</option>
            <option value="custom">Custom…</option>
          </select>
          <input
            className={styles.newLabelInput}
            placeholder={isCustom ? 'Name (e.g. Custom 1)' : 'Label (optional)'}
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
        </div>

        {isCustom && (
          <div className={styles.customFields}>
            <div className={styles.customRow}>
              {/* Grid */}
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

              {/* Cell dimensions */}
              <div className={styles.customGroup}>
                <div className={styles.customGroupLabelRow}>
                  <span className={styles.customGroupLabel}>Cell interior</span>
                  <div className={styles.unitToggle} role="group" aria-label="Dimension unit">
                    <button
                      className={`${styles.unitToggleBtn} ${dimUnit === 'cm' ? styles.unitToggleActive : ''}`}
                      onClick={() => handleDimUnitChange('cm')}
                      type="button"
                    >cm</button>
                    <button
                      className={`${styles.unitToggleBtn} ${dimUnit === 'in' ? styles.unitToggleActive : ''}`}
                      onClick={() => handleDimUnitChange('in')}
                      type="button"
                    >in</button>
                  </div>
                </div>
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
                        min="0.1" step={dimUnit === 'in' ? '0.1' : '0.5'}
                        placeholder={
                          lbl === 'W' ? toDisplay(KALLAX.w, dimUnit) :
                          lbl === 'H' ? toDisplay(KALLAX.h, dimUnit) :
                                        toDisplay(KALLAX.d, dimUnit)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.addActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.addBtn} onClick={handleAdd}>Add unit</button>
        </div>
      </div>
    </Sheet>
  );
}
