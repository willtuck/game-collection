import { useId } from 'react';
import { Sheet } from '../shared/Sheet';
import styles from './FilterSheet.module.css';

export interface FilterState {
  typeFilter: 'all' | 'base' | 'expansion';
  dimsFilter: 'all' | 'has' | 'missing';
  playersFilter: 'all' | '1' | '2' | '3' | '4' | '5' | '6';
  sort: 'name-asc' | 'name-desc' | 'date-desc' | 'date-asc' | 'missing-first';
}

interface FilterSheetProps {
  open: boolean;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClose: () => void;
}

export function FilterSheet({ open, filters, onChange, onClose }: FilterSheetProps) {
  const sortId = useId();

  function set<K extends keyof FilterState>(key: K, val: FilterState[K]) {
    onChange({ ...filters, [key]: val });
  }

  return (
    <Sheet open={open} onClose={onClose} title="Filter & Sort">
      <div className={styles.section}>
        <div className={styles.label} id={`${sortId}-type`}>Type</div>
        <div className={styles.toggle} role="group" aria-labelledby={`${sortId}-type`}>
          {(['all', 'base', 'expansion'] as const).map(v => (
            <button
              key={v}
              className={`${styles.tbtn} ${filters.typeFilter === v ? styles.on : ''}`}
              onClick={() => set('typeFilter', v)}
              aria-pressed={filters.typeFilter === v}
            >
              {v === 'all' ? 'All' : v === 'base' ? 'Base games' : 'Expansions'}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.label} id={`${sortId}-dims`}>Dimensions</div>
        <div className={styles.toggle} role="group" aria-labelledby={`${sortId}-dims`}>
          {(['all', 'has', 'missing'] as const).map(v => (
            <button
              key={v}
              className={`${styles.tbtn} ${filters.dimsFilter === v ? styles.on : ''}`}
              onClick={() => set('dimsFilter', v)}
              aria-pressed={filters.dimsFilter === v}
            >
              {v === 'all' ? 'All' : v === 'has' ? 'Has dims' : 'Missing'}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.label} id={`${sortId}-players`}>Players</div>
        <div className={styles.toggle} role="group" aria-labelledby={`${sortId}-players`} style={{ flexWrap: 'wrap' }}>
          {(['all', '1', '2', '3', '4', '5', '6'] as const).map(v => (
            <button
              key={v}
              className={`${styles.tbtn} ${filters.playersFilter === v ? styles.on : ''}`}
              onClick={() => set('playersFilter', v)}
              aria-pressed={filters.playersFilter === v}
            >
              {v === 'all' ? 'Any' : v === '6' ? '6+' : v}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <label className={styles.label} htmlFor={sortId}>Sort</label>
        <select
          id={sortId}
          className={styles.select}
          value={filters.sort}
          onChange={e => set('sort', e.target.value as FilterState['sort'])}
        >
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="date-desc">Recently added</option>
          <option value="date-asc">Oldest first</option>
          <option value="missing-first">Missing dims first</option>
        </select>
      </div>

    </Sheet>
  );
}
