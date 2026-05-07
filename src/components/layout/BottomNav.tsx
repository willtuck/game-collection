import styles from './BottomNav.module.css';

export type TabName = 'collection' | 'suggested' | 'manual';

interface BottomNavProps {
  active: TabName;
  onChange: (tab: TabName) => void;
}

const TABS: { id: TabName; label: string }[] = [
  { id: 'collection', label: 'Collection' },
  { id: 'suggested',  label: 'Organizer' },
  { id: 'manual',     label: 'Manual Storage' },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className={styles.nav} role="tablist">
      {TABS.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          className={`${styles.tab} ${active === tab.id ? styles.active : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
