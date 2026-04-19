import { useState, useRef, useEffect, useId } from 'react';
import { useGameStore } from '../../store/useGameStore';
import styles from './GroupInput.module.css';

interface GroupInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function GroupInput({ value, onChange, placeholder = 'e.g. Trilogy, Shelf A…' }: GroupInputProps) {
  const [open,      setOpen]      = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const games    = useGameStore(s => s.games);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId   = useId();

  const allGroups = [...new Set(games.map(g => g.groupName).filter(Boolean) as string[])].sort();
  const matches = allGroups.filter(n => {
    const nl = n.toLowerCase();
    const vl = value.toLowerCase();
    return nl !== vl && (!vl || nl.includes(vl));
  });

  const isOpen = open && matches.length > 0;

  // Reset active index when suggestion list changes
  useEffect(() => { setActiveIdx(-1); }, [matches.length, open]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      onChange(matches[activeIdx]);
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  return (
    <div className={styles.wrap}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); setActiveIdx(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-activedescendant={activeIdx >= 0 ? `${listId}-option-${activeIdx}` : undefined}
        aria-autocomplete="list"
        aria-haspopup="listbox"
      />
      {isOpen && (
        <div id={listId} role="listbox" className={styles.dropdown} aria-label="Group suggestions">
          {matches.map((name, i) => (
            <div
              key={name}
              id={`${listId}-option-${i}`}
              role="option"
              aria-selected={activeIdx === i}
              className={`${styles.option} ${activeIdx === i ? styles.optionActive : ''}`}
              onMouseDown={e => {
                e.preventDefault(); // keep focus on input
                onChange(name);
                setOpen(false);
                setActiveIdx(-1);
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
