import { useState } from 'react';
import styles from './ComingSoonPage.module.css';

interface ComingSoonPageProps {
  onUnlock: () => void;
}

const PASSWORD = 'giantsquid!';

export function ComingSoonPage({ onUnlock }: ComingSoonPageProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value === PASSWORD) {
      onUnlock();
    } else {
      setError(true);
      setValue('');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.wordmark}>
          Shelf<span className={styles.accent}>Geek</span>
        </div>
        <p className={styles.tagline}>Your board game collection, beautifully organized.</p>
        <h1 className={styles.heading}>Coming Soon!</h1>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="password"
            className={`${styles.input} ${error ? styles.inputError : ''}`}
            value={value}
            onChange={e => { setValue(e.target.value); setError(false); }}
            placeholder="Password"
            autoComplete="off"
          />
          {error && <p className={styles.error}>Incorrect password.</p>}
          <button type="submit" className={styles.btn}>Enter</button>
        </form>
      </div>
    </div>
  );
}
