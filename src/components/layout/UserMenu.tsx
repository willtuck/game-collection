import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useGameStore } from '../../store/useGameStore';
import { UpgradeSheet } from '../shared/UpgradeSheet';
import { toast } from '../shared/Toast';
import styles from './UserMenu.module.css';

interface UserMenuProps {
  onImportCSV: () => void;
  onExportCSV: () => void;
  onImportBgg: () => void;
}

export function UserMenu({ onImportCSV, onExportCSV, onImportBgg }: UserMenuProps) {
  const user          = useAuthStore(s => s.user);
  const signOut       = useAuthStore(s => s.signOut);
  const isPremium     = useAuthStore(s => s.isPremium);
  const clearAllGames = useGameStore(s => s.clearAllGames);
  const gameCount     = useGameStore(s => s.games.length);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const avatar   = user?.user_metadata?.avatar_url as string | undefined;
  const username = user?.user_metadata?.user_name  as string | undefined;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function close() { setOpen(false); setConfirming(false); }

  function handleClearAll() {
    clearAllGames();
    toast('All games removed');
    close();
  }

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
            {!isPremium && (
              <>
                <button role="menuitem" className={`${styles.item} ${styles.upgradeItem}`} onClick={() => { setUpgradeOpen(true); close(); }}>
                  Upgrade to Premium
                </button>
                <div className={styles.menuDivider} aria-hidden="true" />
              </>
            )}
            <button role="menuitem" className={styles.item} onClick={() => { onImportBgg(); close(); }}>
              Import from BGG
            </button>
            <button role="menuitem" className={styles.item} onClick={() => { onImportCSV(); close(); }}>
              Import CSV
            </button>
            <button role="menuitem" className={styles.item} onClick={() => { onExportCSV(); close(); }}>
              Export CSV
            </button>

            {gameCount > 0 && (
              <>
                <div className={styles.menuDivider} aria-hidden="true" />
                {confirming ? (
                  <div className={styles.confirmWrap}>
                    <div className={styles.confirmLabel}>Remove all {gameCount} games?</div>
                    <div className={styles.confirmActions}>
                      <button className={styles.confirmYes} onClick={handleClearAll}>Remove all</button>
                      <button className={styles.confirmNo} onClick={() => setConfirming(false)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    role="menuitem"
                    className={`${styles.item} ${styles.danger}`}
                    onClick={() => setConfirming(true)}
                  >
                    Remove all games
                  </button>
                )}
              </>
            )}

            <div className={styles.menuDivider} aria-hidden="true" />
            <button role="menuitem" className={`${styles.item} ${styles.signOut}`} onClick={() => { signOut(); close(); }}>
              Sign out
            </button>
          </div>
        </>
      )}
      <UpgradeSheet open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}
