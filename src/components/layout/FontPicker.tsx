import { useState, useEffect } from 'react';
import { FONT_PAIRINGS, CATEGORIES } from '../../lib/fontPairings';
import styles from './FontPicker.module.css';

const CURRENT_ID = 'current';

function buildGoogleFontsUrl(serif: string, sans: string): string {
  const unique = [...new Set([serif, sans])];
  const families = unique
    .map(f => `family=${f.replace(/ /g, '+')}:wght@400;500`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

export function FontPicker() {
  const [selectedId, setSelectedId] = useState(CURRENT_ID);

  useEffect(() => {
    const existing = document.getElementById('font-pairing-link');
    if (existing) existing.remove();

    if (selectedId === CURRENT_ID) {
      document.documentElement.style.removeProperty('--serif');
      document.documentElement.style.removeProperty('--sans');
      return;
    }

    const pairing = FONT_PAIRINGS.find(p => p.id === selectedId);
    if (!pairing) return;

    // Load fonts on demand
    const link = document.createElement('link');
    link.id = 'font-pairing-link';
    link.rel = 'stylesheet';
    link.href = buildGoogleFontsUrl(pairing.serif, pairing.sans);
    document.head.appendChild(link);

    // Override CSS variables
    document.documentElement.style.setProperty('--serif', `'${pairing.serif}', Georgia, serif`);
    document.documentElement.style.setProperty('--sans', `'${pairing.sans}', system-ui, sans-serif`);
  }, [selectedId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      document.getElementById('font-pairing-link')?.remove();
      document.documentElement.style.removeProperty('--serif');
      document.documentElement.style.removeProperty('--sans');
    };
  }, []);

  return (
    <div className={styles.bar}>
      <span className={styles.label}>Font pairing</span>
      <select
        className={styles.select}
        value={selectedId}
        onChange={e => setSelectedId(e.target.value)}
        aria-label="Select font pairing"
      >
        <option value={CURRENT_ID}>Current — DM Sans + Fraunces</option>
        {CATEGORIES.map(cat => (
          <optgroup key={cat} label={cat}>
            {FONT_PAIRINGS.filter(p => p.category === cat).map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
