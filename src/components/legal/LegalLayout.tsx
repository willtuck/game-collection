import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './LegalLayout.module.css';
import bggLogo from '../../assets/powered-by-bgg.svg';

export function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.wordmark}>
          Shelf<span className={styles.accent}>Geek</span>
        </Link>
      </nav>

      <main className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <div className={styles.wordmark}>
              Shelf<span className={styles.accent}>Geek</span>
            </div>
            <p className={styles.footerTagline}>Your board game collection, beautifully organised.</p>
          </div>
          <div className={styles.footerRight}>
            <div className={styles.footerLinks}>
              <Link to="/privacy" className={styles.footerLink}>Privacy Policy</Link>
              <Link to="/terms" className={styles.footerLink}>Terms of Service</Link>
            </div>
            <p className={styles.copyright}>© 2026 ShelfGeek</p>
          </div>
        </div>
        <div className={styles.footerBgg}>
          <img src={bggLogo} alt="Powered by BoardGameGeek" className={styles.bggLogo} />
        </div>
      </footer>
    </div>
  );
}
