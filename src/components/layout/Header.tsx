import { useGameStore } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import styles from './Header.module.css';

export function Header() {
  const count   = useGameStore(s => s.games.length);
  const user    = useAuthStore(s => s.user);
  const loading = useAuthStore(s => s.loading);
  const signIn  = useAuthStore(s => s.signIn);
  const signOut = useAuthStore(s => s.signOut);

  const avatar   = user?.user_metadata?.avatar_url as string | undefined;
  const username = user?.user_metadata?.user_name  as string | undefined;

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>
        Shelf<em>geek</em>
      </h1>
      <span className={styles.build}>{__COMMIT_HASH__}</span>
      <span className={styles.count}>
        {count === 1 ? '1 game' : `${count} games`}
      </span>

      <div className={styles.auth}>
        {!loading && (
          user ? (
            <div className={styles.user}>
              {avatar
                ? <img src={avatar} alt={username || 'User avatar'} className={styles.avatar} />
                : <div className={styles.avatarFallback}>{username?.[0]?.toUpperCase() ?? '?'}</div>
              }
              <button className={styles.signOutBtn} onClick={signOut}>Sign out</button>
            </div>
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
