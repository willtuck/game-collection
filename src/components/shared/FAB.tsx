import styles from './FAB.module.css';

interface FABProps {
  onClick: () => void;
  label?: string;
}

export function FAB({ onClick, label = 'Add game' }: FABProps) {
  return (
    <button className={styles.fab} onClick={onClick} aria-label={label}>
      <span className={styles.icon}>+</span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
