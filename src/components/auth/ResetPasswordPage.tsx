import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import styles from './ResetPasswordPage.module.css';

type State = 'waiting' | 'ready' | 'expired' | 'done';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<State>('waiting');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setPageState('ready');
    });

    // If no recovery event within 4s, the link is invalid or expired
    const timeout = setTimeout(() => {
      setPageState(s => s === 'waiting' ? 'expired' : s);
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) setError(error.message);
    else {
      setPageState('done');
      setTimeout(() => navigate('/app', { replace: true }), 2000);
    }
  }

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.wordmark}>
          Shelf<span className={styles.accent}>Geek</span>
        </Link>
      </nav>

      <main className={styles.main}>
        <div className={styles.card}>
          {pageState === 'waiting' && (
            <p className={styles.hint}>Verifying your reset link…</p>
          )}

          {pageState === 'expired' && (
            <>
              <h1 className={styles.title}>Link expired</h1>
              <p className={styles.hint}>
                This password reset link is invalid or has already been used.
              </p>
              <Link to="/" className={styles.backLink}>Back to ShelfGeek</Link>
            </>
          )}

          {pageState === 'ready' && (
            <>
              <h1 className={styles.title}>Set new password</h1>
              <form className={styles.form} onSubmit={handleSubmit} noValidate>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="rp-password">New password</label>
                  <input
                    id="rp-password"
                    type="password"
                    className={styles.input}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    autoFocus
                    autoComplete="new-password"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="rp-confirm">Confirm password</label>
                  <input
                    id="rp-confirm"
                    type="password"
                    className={styles.input}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your new password"
                    required
                    autoComplete="new-password"
                  />
                </div>
                {error && <div className={styles.error}>{error}</div>}
                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? 'Saving…' : 'Set new password'}
                </button>
              </form>
            </>
          )}

          {pageState === 'done' && (
            <>
              <h1 className={styles.title}>Password updated</h1>
              <p className={styles.hint}>Taking you to the app…</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
