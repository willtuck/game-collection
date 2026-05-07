import { useState } from 'react';
import { Sheet } from './Sheet';
import { useAuthStore } from '../../store/useAuthStore';
import styles from './UpgradeSheet.module.css';

interface UpgradeSheetProps {
  open: boolean;
  onClose: () => void;
}

export function UpgradeSheet({ open, onClose }: UpgradeSheetProps) {
  const user      = useAuthStore(s => s.user);
  const session   = useAuthStore(s => s.session);
  const openAuth  = useAuthStore(s => s.openAuthModal);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleUpgrade() {
    if (!user) { onClose(); openAuth(); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? 'Something went wrong.');
        setLoading(false);
      }
    } catch {
      setError('Could not connect. Please try again.');
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Upgrade to Premium">
      <div className={styles.body}>
        <p className={styles.pitch}>
          You've hit the free tier limit. Upgrade once for unlimited access — no subscription, ever.
        </p>

        <ul className={styles.perks}>
          <li>Unlimited games in your collection</li>
          <li>Unlimited shelving units</li>
          <li>All features, forever</li>
        </ul>

        <div className={styles.price}>
          <span className={styles.amount}>$7</span>
          <span className={styles.once}>one-time</span>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button
          className={styles.upgradeBtn}
          onClick={handleUpgrade}
          disabled={loading}
        >
          {loading ? 'Redirecting…' : 'Upgrade for $7'}
        </button>

        <button className={styles.cancelBtn} onClick={onClose}>
          Not now
        </button>
      </div>
    </Sheet>
  );
}
