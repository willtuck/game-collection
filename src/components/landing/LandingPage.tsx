import styles from './LandingPage.module.css';
import { useAuthStore } from '../../store/useAuthStore';

export function LandingPage() {
  const signIn = useAuthStore(s => s.signIn);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.wordmark}>
          Shelf<span className={styles.accent}>Geek</span>
        </div>
        <button className={styles.signInBtn} onClick={signIn}>
          Sign in
        </button>
      </nav>

      <section className={styles.hero}>
        <HeroPattern />
        <div className={styles.heroContent}>
          <h1 className={styles.headline}>
            Your board game collection,<br />beautifully organised.
          </h1>
          <p className={styles.subhead}>
            Track every game. Plan your shelves.<br />Always know what fits where.
          </p>
          <button className={styles.ctaBtn} onClick={signIn}>
            Get started free
          </button>
        </div>
      </section>

      <section className={styles.features}>
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
            <h3 className={styles.featureTitle}>Visualise any shelving unit</h3>
            <p className={styles.featureDesc}>
              See your shelves come to life in an isometric view — IKEA Kallax, custom units, whatever you use.
            </p>
          </div>
        </div>
      </section>

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
              <a href="/privacy" className={styles.footerLink}>Privacy Policy</a>
              <a href="/terms" className={styles.footerLink}>Terms of Service</a>
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
      viewBox="0 0 1200 340"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Row 0 — bleeds off top */}
      <rect x="-20" y="-70" width="72" height="88" rx="3" fill="#E8D8C4"/><rect x="56" y="-60" width="50" height="78" rx="3" fill="#DDD0BC"/><rect x="110" y="-75" width="88" height="93" rx="3" fill="#ECE0CC"/><rect x="202" y="-65" width="44" height="83" rx="3" fill="#D6C8B4"/><rect x="250" y="-70" width="82" height="88" rx="3" fill="#E4D4C0"/><rect x="336" y="-60" width="58" height="78" rx="3" fill="#DAC8B6"/><rect x="398" y="-72" width="96" height="90" rx="3" fill="#EAD8C4"/><rect x="498" y="-65" width="44" height="83" rx="3" fill="#E0D0BC"/><rect x="546" y="-68" width="80" height="86" rx="3" fill="#D4C4B0"/><rect x="630" y="-73" width="52" height="91" rx="3" fill="#ECDCC8"/><rect x="686" y="-62" width="74" height="80" rx="3" fill="#E6D6C2"/><rect x="764" y="-70" width="46" height="88" rx="3" fill="#DDD0BA"/><rect x="814" y="-65" width="92" height="83" rx="3" fill="#ECE0CC"/><rect x="910" y="-72" width="56" height="90" rx="3" fill="#D8C8B4"/><rect x="970" y="-60" width="78" height="78" rx="3" fill="#E4D4C0"/><rect x="1052" y="-68" width="48" height="86" rx="3" fill="#DACCB8"/><rect x="1104" y="-73" width="116" height="91" rx="3" fill="#EAD8C6"/>
      {/* Shelf line 1 */}
      <rect x="-20" y="18" width="1240" height="3" fill="#C8B8A8" rx="1"/>
      {/* Row 1 */}
      <rect x="-20" y="24" width="68" height="80" rx="3" fill="#EDE0D0"/><rect x="52" y="30" width="44" height="74" rx="3" fill="#E0D0BF"/><rect x="100" y="22" width="88" height="84" rx="3" fill="#E8D8C5"/><rect x="192" y="26" width="56" height="78" rx="3" fill="#D8CABB"/><rect x="252" y="22" width="74" height="82" rx="3" fill="#EAD8C4"/><rect x="330" y="30" width="44" height="74" rx="3" fill="#DDD0BF"/><rect x="378" y="20" width="92" height="84" rx="3" fill="#E5D5C0"/><rect x="474" y="24" width="58" height="80" rx="3" fill="#D4C5B2"/><rect x="536" y="28" width="72" height="76" rx="3" fill="#DFCFBC"/><rect x="612" y="22" width="50" height="82" rx="3" fill="#EAE0D0"/><rect x="666" y="25" width="84" height="79" rx="3" fill="#D8C8B4"/><rect x="754" y="22" width="62" height="82" rx="3" fill="#E2D2BE"/><rect x="820" y="28" width="44" height="76" rx="3" fill="#DAC8B6"/><rect x="868" y="20" width="96" height="84" rx="3" fill="#E8D6C2"/><rect x="968" y="24" width="54" height="80" rx="3" fill="#D0C0AC"/><rect x="1026" y="26" width="78" height="78" rx="3" fill="#DECEBE"/><rect x="1108" y="22" width="112" height="82" rx="3" fill="#EBD9C5"/>
      {/* Shelf line 2 */}
      <rect x="-20" y="108" width="1240" height="3" fill="#C8B8A8" rx="1"/>
      {/* Row 2 */}
      <rect x="-20" y="114" width="58" height="106" rx="3" fill="#E2D0BC"/><rect x="42" y="118" width="84" height="100" rx="3" fill="#ECDAC6"/><rect x="130" y="114" width="46" height="106" rx="3" fill="#D6C4B0"/><rect x="180" y="116" width="94" height="104" rx="3" fill="#E8D5C0"/><rect x="278" y="114" width="60" height="106" rx="3" fill="#DCCCB8"/><rect x="342" y="116" width="70" height="104" rx="3" fill="#E4D2BC"/><rect x="416" y="118" width="50" height="100" rx="3" fill="#D2C2AE"/><rect x="470" y="114" width="86" height="106" rx="3" fill="#EAD8C2"/><rect x="560" y="116" width="54" height="104" rx="3" fill="#DECEBE"/><rect x="618" y="118" width="76" height="100" rx="3" fill="#E6D4C0"/><rect x="698" y="114" width="46" height="106" rx="3" fill="#D4C4B0"/><rect x="748" y="116" width="90" height="104" rx="3" fill="#ECDCC8"/><rect x="842" y="118" width="58" height="100" rx="3" fill="#E0D0BC"/><rect x="904" y="114" width="66" height="106" rx="3" fill="#D8C8B2"/><rect x="974" y="116" width="48" height="104" rx="3" fill="#E4D2BC"/><rect x="1026" y="118" width="88" height="100" rx="3" fill="#ECDAC6"/><rect x="1118" y="114" width="102" height="106" rx="3" fill="#DAC8B4"/>
      {/* Shelf line 3 */}
      <rect x="-20" y="224" width="1240" height="3" fill="#C8B8A8" rx="1"/>
      {/* Row 3 — bleeds off bottom */}
      <rect x="-20" y="230" width="74" height="160" rx="3" fill="#E8D8C4"/><rect x="58" y="234" width="50" height="160" rx="3" fill="#DDD0BC"/><rect x="112" y="228" width="92" height="160" rx="3" fill="#ECE0CC"/><rect x="208" y="232" width="42" height="160" rx="3" fill="#D6C8B4"/><rect x="254" y="228" width="80" height="160" rx="3" fill="#E4D4C0"/><rect x="338" y="232" width="62" height="160" rx="3" fill="#DAC8B6"/><rect x="404" y="228" width="46" height="160" rx="3" fill="#EAD8C4"/><rect x="454" y="230" width="96" height="160" rx="3" fill="#E0D0BC"/><rect x="554" y="228" width="56" height="160" rx="3" fill="#D4C4B0"/><rect x="614" y="230" width="80" height="160" rx="3" fill="#ECDCC8"/><rect x="698" y="228" width="50" height="160" rx="3" fill="#E6D6C2"/><rect x="752" y="232" width="70" height="160" rx="3" fill="#DDD0BA"/><rect x="826" y="228" width="90" height="160" rx="3" fill="#ECE0CC"/><rect x="920" y="230" width="48" height="160" rx="3" fill="#D8C8B4"/><rect x="972" y="228" width="78" height="160" rx="3" fill="#E4D4C0"/><rect x="1054" y="230" width="56" height="160" rx="3" fill="#DACCB8"/><rect x="1114" y="228" width="106" height="160" rx="3" fill="#EAD8C6"/>
    </svg>
  );
}
