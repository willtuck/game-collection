import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import styles from './GroupInput.module.css';

interface GroupInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function GroupInput({ value, onChange, placeholder = 'e.g. Trilogy, Shelf A…' }: GroupInputProps) {
  const [open, setOpen] = useState(false);
  const games = useGameStore(s => s.games);
  const inputRef = useRef<HTMLInputElement>(null);

  const allGroups = [...new Set(games.map(g => g.groupName).filter(Boolean) as string[])].sort();
  const matches = allGroups.filter(n => {
    const nl = n.toLowerCase();
    const vl = value.toLowerCase();
    return nl !== vl && (!vl || nl.includes(vl));
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={styles.wrap}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <div className={styles.dropdown}>
          {matches.map(name => (
            <div
              key={name}
              className={styles.option}
              onMouseDown={e => {
                e.preventDefault(); // keep focus on input
                onChange(name);
                setOpen(false);
              }}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
