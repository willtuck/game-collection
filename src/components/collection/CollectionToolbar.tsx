import styles from './CollectionToolbar.module.css';

interface CollectionToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  onFilterOpen: () => void;
  resultCount: number;
  totalCount: number;
  activeFilterCount: number;
}

export function CollectionToolbar({
  search, onSearchChange, onFilterOpen,
  resultCount, totalCount, activeFilterCount,
}: CollectionToolbarProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <input
          type="text"
          className={styles.search}
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search your collection…"
        />
        <button className={styles.filterBtn} onClick={onFilterOpen}>
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className={styles.badge}>{activeFilterCount}</span>
          )}
        </button>
      </div>
      <div className={styles.count}>
        {resultCount === totalCount
          ? `${totalCount} game${totalCount !== 1 ? 's' : ''}`
          : `${resultCount} of ${totalCount} games`}
      </div>
    </div>
  );
}
