import { useGameStore } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { UserMenu } from './UserMenu';
import styles from './Header.module.css';

interface HeaderProps {
  onImportCSV: () => void;
  onExportCSV: () => void;
  onImportBgg: () => void;
}

export function Header({ onImportCSV, onExportCSV, onImportBgg }: HeaderProps) {
  const count   = useGameStore(s => s.games.length);
  const user    = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);
  const signIn  = useAuthStore(s => s.signIn);

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>
        Shelf<span>geek</span>
      </h1>
      <span className={styles.build}>{__COMMIT_HASH__}</span>
      <span className={styles.count}>
        {count === 1 ? '1 game' : `${count} games`}
      </span>

      <div className={styles.auth}>
        {!loading && (
          user ? (
            <UserMenu onImportCSV={onImportCSV} onExportCSV={onExportCSV} onImportBgg={onImportBgg} />
          ) : (
            <button className={styles.signInBtn} onClick={signIn}>
              Sign in
            </button>
          )
        )}
      </div>
    </header>
  );
}
