import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import styles from './AuthModal.module.css';

type Mode = 'signin' | 'signup' | 'forgot';

export function AuthModal() {
  const open  = useAuthStore(s => s.authModalOpen);
  const close = useAuthStore(s => s.closeAuthModal);

  const [mode, setMode]         = useState<Mode>('signin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setMode('signin');
    setEmail('');
    setPassword('');
    setError('');
    setSuccess('');
  }, [open]);

  useEffect(() => {
    if (!open || mode === 'forgot') return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !googleBtnRef.current) return;

    const render = () => {
      const g = (window as any).google;
      if (!g?.accounts?.id) return false;
      g.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          setLoading(true);
          setError('');
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: response.credential,
          });
          setLoading(false);
          if (error) setError(error.message);
          else close();
        },
      });
      if (googleBtnRef.current) {
        g.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: googleBtnRef.current.offsetWidth || 360,
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        });
      }
      return true;
    };

    if (!render()) {
      const id = setInterval(() => { if (render()) clearInterval(id); }, 100);
      return () => clearInterval(id);
    }
  }, [open, mode, close]);

  function handleClose() {
    if (!loading) close();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/app`,
      });
      setLoading(false);
      if (error) setError(error.message);
      else setSuccess('Check your email for a password reset link.');
      return;
    }

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setLoading(false);
      if (error) setError(error.message);
      else setSuccess('Check your email to confirm your account, then sign in.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else close();
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setSuccess('');
  }

  if (!open) return null;

  const title       = mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password';
  const submitLabel = mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link';

  return (
    <>
      <div className={styles.backdrop} onClick={handleClose} aria-hidden="true" />
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={title}>
        <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">✕</button>

        <h2 className={styles.title}>{title}</h2>

        {success ? (
          <p className={styles.success}>{success}</p>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                className={styles.input}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            {mode !== 'forgot' && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  className={styles.input}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : ''}
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
              </div>
            )}

            {error && <div className={styles.error}>{error}</div>}

            {mode === 'signin' && (
              <button type="button" className={styles.forgotLink} onClick={() => switchMode('forgot')}>
                Forgot password?
              </button>
            )}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Please wait…' : submitLabel}
            </button>

            {mode !== 'forgot' && (
              <>
                <div className={styles.divider}><span>or</span></div>
                <div ref={googleBtnRef} className={styles.googleBtn} />
              </>
            )}

            <div className={styles.footer}>
              {mode === 'signin' && (
                <>Don't have an account?{' '}
                  <button type="button" className={styles.switchLink} onClick={() => switchMode('signup')}>Sign up</button>
                </>
              )}
              {mode === 'signup' && (
                <>Already have an account?{' '}
                  <button type="button" className={styles.switchLink} onClick={() => switchMode('signin')}>Sign in</button>
                </>
              )}
              {mode === 'forgot' && (
                <button type="button" className={styles.switchLink} onClick={() => switchMode('signin')}>Back to sign in</button>
              )}
            </div>
          </form>
        )}
      </div>
    </>
  );
}
