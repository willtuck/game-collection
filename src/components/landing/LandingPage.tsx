import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './LandingPage.module.css';
import { useAuthStore } from '../../store/useAuthStore';
import bggLogo from '../../assets/powered-by-bgg.svg';

export function LandingPage() {
  const openAuthModal = useAuthStore(s => s.openAuthModal);
  const session       = useAuthStore(s => s.session);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate('/app', { replace: true });
  }, [session, navigate]);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.wordmark}>
          Shelf<span className={styles.accent}>Geek</span>
        </div>
        <button className={styles.signInBtn} onClick={openAuthModal}>
          Sign in
        </button>
      </nav>

      <section className={styles.hero}>
        <HeroPattern />
        <div className={styles.heroContent}>
          <h1 className={styles.headline}>
            Your board game collection,<br />beautifully organized.
          </h1>
          <p className={styles.subhead}>
            Track every game. Plan your shelves.<br />Always know what fits where.
          </p>
          <button className={styles.ctaBtn} onClick={openAuthModal}>
            Get started free
          </button>
        </div>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <h3 className={styles.featureTitle}>Track your collection</h3>
            <p className={styles.featureDesc}>
              Add every game you own. Search, filter, and manage your full library in one place.
            </p>
          </div>
          <div className={styles.featureCard}>
            <h3 className={styles.featureTitle}>Know what fits</h3>
            <p className={styles.featureDesc}>
              Log box dimensions and see at a glance which games fit on which shelves — no more guessing.
            </p>
          </div>
          <div className={styles.featureCard}>
            <h3 className={styles.featureTitle}>Visualize any shelving unit</h3>
            <p className={styles.featureDesc}>
              See your shelves come to life in an isometric view — IKEA Kallax, custom units, whatever you use.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.pricing}>
        <div className={styles.pricingInner}>
          <h2 className={styles.pricingHeading}>Simple, honest pricing</h2>
          <p className={styles.pricingSubhead}>Start free. Upgrade once if you need more.</p>
          <div className={styles.pricingCards}>
            <div className={styles.pricingCard}>
              <div className={styles.planName}>Free</div>
              <div className={styles.planPrice}><span className={styles.planAmount}>$0</span></div>
              <ul className={styles.planPerks}>
                <li>Up to 20 games</li>
                <li>1 shelving unit</li>
                <li>BGG import</li>
                <li>Isometric shelf view</li>
              </ul>
              <button className={styles.planCta} onClick={openAuthModal}>
                Get started free
              </button>
            </div>
            <div className={`${styles.pricingCard} ${styles.pricingCardPremium}`}>
              <div className={styles.planBadge}>Premium</div>
              <div className={styles.planPrice}>
                <span className={styles.planAmount}>$7</span>
                <span className={styles.planOnce}>one-time</span>
              </div>
              <ul className={styles.planPerks}>
                <li>Unlimited games</li>
                <li>Unlimited shelving units</li>
                <li>BGG import</li>
                <li>Isometric shelf view</li>
                <li>No subscription, ever</li>
              </ul>
              <button className={styles.planCtaPremium} onClick={openAuthModal}>
                Get started
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <div className={styles.wordmark}>
              Shelf<span className={styles.accent}>Geek</span>
            </div>
            <p className={styles.footerTagline}>Your board game collection, beautifully organized.</p>
          </div>
          <img src={bggLogo} alt="Powered by BoardGameGeek" className={styles.bggLogo} />
          <div className={styles.footerRight}>
            <div className={styles.footerLinks}>
              <Link to="/privacy" className={styles.footerLink}>Privacy Policy</Link>
              <Link to="/terms" className={styles.footerLink}>Terms of Service</Link>
            </div>
            <p className={styles.copyright}>© 2026 ShelfGeek</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HeroPattern() {
  return (
    <svg
      className={styles.heroPattern}
      viewBox="0 0 1200 1400"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="shelf-tile"
          patternUnits="userSpaceOnUse"
          x="0"
          y="-80"
          width="1200"
          height="228"
        >
          {/* Row A — books bottom-aligned to shelf at y=111 */}
          <rect x="0"    y="27" width="68" height="84" rx="3" fill="#EDE0D0"/>
          <rect x="72"   y="35" width="44" height="76" rx="3" fill="#E0D0BF"/>
          <rect x="120"  y="21" width="88" height="90" rx="3" fill="#E8D8C5"/>
          <rect x="212"  y="31" width="56" height="80" rx="3" fill="#D8CABB"/>
          <rect x="272"  y="25" width="74" height="86" rx="3" fill="#EAD8C4"/>
          <rect x="350"  y="33" width="44" height="78" rx="3" fill="#DDD0BF"/>
          <rect x="398"  y="23" width="92" height="88" rx="3" fill="#E5D5C0"/>
          <rect x="494"  y="29" width="58" height="82" rx="3" fill="#D4C5B2"/>
          <rect x="556"  y="35" width="72" height="76" rx="3" fill="#DFCFBC"/>
          <rect x="632"  y="23" width="50" height="88" rx="3" fill="#EAE0D0"/>
          <rect x="686"  y="27" width="84" height="84" rx="3" fill="#D8C8B4"/>
          <rect x="774"  y="31" width="62" height="80" rx="3" fill="#E2D2BE"/>
          <rect x="840"  y="21" width="44" height="90" rx="3" fill="#DAC8B6"/>
          <rect x="888"  y="29" width="96" height="82" rx="3" fill="#E8D6C2"/>
          <rect x="988"  y="33" width="54" height="78" rx="3" fill="#D0C0AC"/>
          <rect x="1046" y="25" width="78" height="86" rx="3" fill="#DECEBE"/>
          <rect x="1128" y="27" width="72" height="84" rx="3" fill="#EBD9C5"/>
          {/* Shelf A */}
          <rect x="0" y="111" width="1200" height="3" fill="#C8B8A8"/>
          {/* Row B — books bottom-aligned to shelf at y=225 */}
          <rect x="0"    y="139" width="58"  height="86"  rx="3" fill="#E2D0BC"/>
          <rect x="62"   y="125" width="84"  height="100" rx="3" fill="#ECDAC6"/>
          <rect x="150"  y="147" width="46"  height="78"  rx="3" fill="#D6C4B0"/>
          <rect x="200"  y="123" width="94"  height="102" rx="3" fill="#E8D5C0"/>
          <rect x="298"  y="143" width="60"  height="82"  rx="3" fill="#DCCCB8"/>
          <rect x="362"  y="129" width="70"  height="96"  rx="3" fill="#E4D2BC"/>
          <rect x="436"  y="151" width="50"  height="74"  rx="3" fill="#D2C2AE"/>
          <rect x="490"  y="121" width="86"  height="104" rx="3" fill="#EAD8C2"/>
          <rect x="580"  y="145" width="54"  height="80"  rx="3" fill="#DECEBE"/>
          <rect x="638"  y="131" width="76"  height="94"  rx="3" fill="#E6D4C0"/>
          <rect x="718"  y="147" width="46"  height="78"  rx="3" fill="#D4C4B0"/>
          <rect x="768"  y="125" width="90"  height="100" rx="3" fill="#ECDCC8"/>
          <rect x="862"  y="141" width="58"  height="84"  rx="3" fill="#E0D0BC"/>
          <rect x="924"  y="127" width="66"  height="98"  rx="3" fill="#D8C8B2"/>
          <rect x="994"  y="149" width="50"  height="76"  rx="3" fill="#E4D2BC"/>
          <rect x="1048" y="123" width="80"  height="102" rx="3" fill="#ECDAC6"/>
          <rect x="1132" y="137" width="68"  height="88"  rx="3" fill="#DAC8B4"/>
          {/* Shelf B */}
          <rect x="0" y="225" width="1200" height="3" fill="#C8B8A8"/>
        </pattern>
      </defs>
      <rect width="1200" height="1400" fill="url(#shelf-tile)"/>
    </svg>
  );
}
