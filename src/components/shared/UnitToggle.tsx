import styles from './UnitToggle.module.css';

interface UnitToggleProps {
  value: 'cm' | 'in';
  onChange: (unit: 'cm' | 'in') => void;
  className?: string;
}

export function UnitToggle({ value, onChange, className }: UnitToggleProps) {
  return (
    <div className={`${styles.toggle}${className ? ` ${className}` : ''}`}>
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
