import { useAuthStore } from '../../store/useAuthStore';
import { UserMenu } from './UserMenu';
import { SyncIndicator } from './SyncIndicator';
import styles from './Header.module.css';

interface HeaderProps {
  onImportCSV: () => void;
  onExportCSV: () => void;
  onImportBgg: () => void;
}

export function Header({ onImportCSV, onExportCSV, onImportBgg }: HeaderProps) {
  const user    = useAuthStore(s => s.user);
  const loading       = useAuthStore(s => s.loading);
  const openAuthModal = useAuthStore(s => s.openAuthModal);

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>
        Shelf<span>geek</span>
      </h1>

      <div className={styles.auth}>
        <SyncIndicator />
        {!loading && (
          user ? (
            <UserMenu onImportCSV={onImportCSV} onExportCSV={onExportCSV} onImportBgg={onImportBgg} />
          ) : (
            <button className={styles.signInBtn} onClick={openAuthModal}>
              Sign in
            </button>
          )
        )}
      </div>
    </header>
  );
}
