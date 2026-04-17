import { useState } from 'react';
import { Sheet } from '../shared/Sheet';
import { useGameStore } from '../../store/useGameStore';
import { kuLabel } from '../../lib/helpers';
import styles from './KallaxManagerSheet.module.css';

const MODELS = ['1x1','1x2','2x1','1x4','4x1','2x2','2x4','4x2','4x4','5x5'];

interface KallaxManagerSheetProps {
  open: boolean;
  onClose: () => void;
}

export function KallaxManagerSheet({ open, onClose }: KallaxManagerSheetProps) {
  const kallaxes          = useGameStore(s => s.kallaxes);
  const addKallax         = useGameStore(s => s.addKallax);
  const removeKallax      = useGameStore(s => s.removeKallax);
  const updateKallaxLabel = useGameStore(s => s.updateKallaxLabel);

  const [newModel, setNewModel] = useState('2x4');
  const [newLabel, setNewLabel] = useState('');

  function handleAdd() {
    addKallax(newModel, newLabel.trim());
    setNewLabel('');
  }

  return (
    <Sheet open={open} onClose={onClose} title="Kallax units">
      <div className={styles.list}>
        {kallaxes.map(ku => (
          <div key={ku.id} className={styles.row}>
            <span className={styles.modelBadge}>{kuLabel(ku.model)}</span>
            <input
              className={styles.labelInput}
              value={ku.label}
              onChange={e => updateKallaxLabel(ku.id, e.target.value)}
              placeholder={kuLabel(ku.model)}
            />
            <button
              className={styles.deleteBtn}
              onClick={() => removeKallax(ku.id)}
              disabled={kallaxes.length === 1}
              title={kallaxes.length === 1 ? "Can't remove the last unit" : 'Remove'}
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
          >
            {MODELS.map(m => (
              <option key={m} value={m}>{kuLabel(m)}</option>
            ))}
          </select>
          <input
            className={styles.newLabelInput}
            placeholder="Label (optional)"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
        </div>
        <button className={styles.addBtn} onClick={handleAdd}>
          Add unit
        </button>
      </div>
    </Sheet>
  );
}
