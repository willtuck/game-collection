import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import styles from './UserMenu.module.css';

interface UserMenuProps {
  onImportCSV: () => void;
  onExportCSV: () => void;
}

export function UserMenu({ onImportCSV, onExportCSV }: UserMenuProps) {
  const user    = useAuthStore(s => s.user);
  const signOut = useAuthStore(s => s.signOut);
  const [open, setOpen] = useState(false);

  const avatar   = user?.user_metadata?.avatar_url as string | undefined;
  const username = user?.user_metadata?.user_name  as string | undefined;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function close() { setOpen(false); }

  return (
    <div className={styles.wrap}>
      <button
        className={styles.avatarBtn}
        onClick={() => setOpen(o => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {avatar
          ? <img src={avatar} alt={username ?? 'User avatar'} className={styles.avatar} />
          : <div className={styles.avatarFallback} aria-hidden="true">{username?.[0]?.toUpperCase() ?? '?'}</div>
        }
      </button>

      {open && (
        <>
          <div className={styles.backdrop} onClick={close} aria-hidden="true" />
          <div className={styles.menu} role="menu">
            <button role="menuitem" className={styles.item} onClick={() => { onImportCSV(); close(); }}>
              Import CSV
            </button>
            <button role="menuitem" className={styles.item} onClick={() => { onExportCSV(); close(); }}>
              Export CSV
            </button>
            <div className={styles.menuDivider} aria-hidden="true" />
            <button role="menuitem" className={`${styles.item} ${styles.signOut}`} onClick={() => { signOut(); close(); }}>
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
