import { useGameStore } from '../../store/useGameStore';
import styles from './Header.module.css';

export function Header() {
  const count = useGameStore(s => s.games.length);
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>
        Game <em>Collection</em>
      </h1>
      <span className={styles.count}>
        {count === 1 ? '1 game' : `${count} games`}
      </span>
    </header>
  );
}
