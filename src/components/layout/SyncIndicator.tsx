import { useAuthStore } from '../../store/useAuthStore';
import styles from './SyncIndicator.module.css';

export function SyncIndicator() {
  const user       = useAuthStore(s => s.user);
  const syncStatus = useAuthStore(s => s.syncStatus);

  if (!user || syncStatus === 'idle') return null;

  return (
    <div className={`${styles.wrap} ${styles[syncStatus]}`}>
      {syncStatus === 'syncing' && <div className={styles.spinner} />}
      {syncStatus === 'synced'  && <span className={styles.icon}>✓</span>}
      {syncStatus === 'error'   && <span className={styles.icon}>!</span>}
      <span className={styles.label}>
        {syncStatus === 'syncing' ? 'Saving…' : syncStatus === 'synced' ? 'Saved' : 'Sync error'}
      </span>
    </div>
  );
}
