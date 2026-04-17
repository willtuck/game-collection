import { Sheet } from '../shared/Sheet';
import type { KallaxSort, StorageMode } from '../../lib/types';
import styles from './SuggestedSettings.module.css';

interface SuggestedSettingsProps {
  open: boolean;
  onClose: () => void;
  sort: KallaxSort;
  mode: StorageMode;
  onSortChange: (s: KallaxSort) => void;
  onModeChange: (m: StorageMode) => void;
}

export function SuggestedSettings({
  open, onClose, sort, mode, onSortChange, onModeChange,
}: SuggestedSettingsProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Display settings">
      <div className={styles.section}>
        <div className={styles.label}>Storage mode</div>
        <div className={styles.toggle}>
          <button
            className={`${styles.tbtn} ${mode === 'upright' ? styles.on : ''}`}
            onClick={() => onModeChange('upright')}
          >Upright</button>
          <button
            className={`${styles.tbtn} ${mode === 'stacked' ? styles.on : ''}`}
            onClick={() => onModeChange('stacked')}
          >Stacked</button>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.label}>Sort order</div>
        <select
          className={styles.select}
          value={sort}
          onChange={e => onSortChange(e.target.value as KallaxSort)}
        >
          <option value="alpha">Name A–Z</option>
          <option value="alpha-desc">Name Z–A</option>
          <option value="size-desc">Largest first</option>
          <option value="size-asc">Smallest first</option>
          <option value="date-new">Recently added</option>
          <option value="date-old">Oldest first</option>
          <option value="players">By player count</option>
        </select>
      </div>
    </Sheet>
  );
}
