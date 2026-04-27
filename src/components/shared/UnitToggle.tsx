import styles from './UnitToggle.module.css';

interface UnitToggleProps {
  value: 'cm' | 'in';
  onChange: (unit: 'cm' | 'in') => void;
}

export function UnitToggle({ value, onChange }: UnitToggleProps) {
  return (
    <div className={styles.toggle}>
      <button
        className={`${styles.btn} ${value === 'cm' ? styles.on : ''}`}
        onClick={() => onChange('cm')}
      >cm</button>
      <button
        className={`${styles.btn} ${value === 'in' ? styles.on : ''}`}
        onClick={() => onChange('in')}
      >in</button>
    </div>
  );
}
