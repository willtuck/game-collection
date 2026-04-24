import styles from './BottomNav.module.css';

export type TabName = 'collection' | 'suggested' | 'manual';

interface BottomNavProps {
  active: TabName;
  onChange: (tab: TabName) => void;
}

const TABS: { id: TabName; label: string }[] = [
  { id: 'collection', label: 'Collection' },
  { id: 'suggested',  label: 'Visualizer' },
  { id: 'manual',     label: 'Manual' },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className={styles.nav}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`${styles.tab} ${active === tab.id ? styles.active : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
