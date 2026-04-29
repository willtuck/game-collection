# ShelfGeek Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public marketing landing page at `/` using React Router, with the existing app moving to `/app`.

**Architecture:** React Router v6 is added to the existing Vite/React app. `App.tsx` becomes the router root with two routes: `/` renders `LandingPage`, `/app` renders `AppShell` wrapped in an `AuthGuard`. `useAuthInit` moves from `AppShell` to the router wrapper so auth state resolves before route decisions are made.

**Tech Stack:** React 19, TypeScript, React Router v6 (`react-router-dom`), CSS Modules, Vite, Supabase Auth (existing).

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/App.tsx` | Modify | Router root — BrowserRouter + Routes |
| `src/components/layout/AppShell.tsx` | Modify | Remove `useAuthInit()` call (moved to App.tsx) |
| `src/components/landing/LandingPage.tsx` | Create | Full landing page component |
| `src/components/landing/LandingPage.module.css` | Create | All landing page styles |
| `src/components/landing/AuthGuard.tsx` | Create | Redirects unauthenticated users from `/app` to `/` |

---

## Task 1: Install React Router

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install react-router-dom**

```bash
npm install react-router-dom
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Verify TypeScript types are available**

```bash
node -e "require('react-router-dom')" && echo "ok"
```

react-router-dom v6+ bundles its own types — no separate `@types/` package needed.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-router-dom"
```

---

## Task 2: Create AuthGuard

**Files:**
- Create: `src/components/landing/AuthGuard.tsx`

This component reads auth state from the existing `useAuthStore`. If auth is still loading (initial page load), it renders nothing briefly. If there is no session, it redirects to `/`. Otherwise it renders its children.

- [ ] **Step 1: Create the file**

```tsx
// src/components/landing/AuthGuard.tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

export function AuthGuard({ children }: { children: ReactNode }) {
  const session = useAuthStore(s => s.session);
  const loading = useAuthStore(s => s.loading);

  if (loading) return null;
  if (!session) return <Navigate to="/" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

## Task 3: Wire routing in App.tsx and update AppShell

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/AppShell.tsx`

**Important:** `useAuthInit` currently lives in `AppShell`. It must move to `AppRoutes` (above the `<Routes>`) so auth state is initialised regardless of which route renders. Without this, `AuthGuard` would wait forever for `loading` to become `false` when an unauthenticated user visits `/app`.

- [ ] **Step 1: Update `src/App.tsx`**

Replace the entire file with:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/landing/LandingPage';
import { AppShell } from './components/layout/AppShell';
import { AuthGuard } from './components/landing/AuthGuard';
import { useAuthInit } from './hooks/useAuthInit';

function AppRoutes() {
  useAuthInit();
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<AuthGuard><AppShell /></AuthGuard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Remove `useAuthInit` from `src/components/layout/AppShell.tsx`**

Remove the import line:
```tsx
import { useAuthInit } from '../../hooks/useAuthInit';
```

Remove the call inside the component body:
```tsx
useAuthInit();
```

The rest of AppShell is unchanged.

- [ ] **Step 3: Create a stub LandingPage so the build doesn't fail**

Create `src/components/landing/LandingPage.tsx` with minimal content:

```tsx
// src/components/landing/LandingPage.tsx
export function LandingPage() {
  return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>ShelfGeek — coming soon</div>;
}
```

Also create an empty CSS file so the real import in the next task doesn't error:

```bash
touch src/components/landing/LandingPage.module.css
```

- [ ] **Step 4: Verify the build compiles**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 5: Start dev server and verify routing**

```bash
npm run dev
```

- Open `http://localhost:5173/` — should show "ShelfGeek — coming soon"
- Open `http://localhost:5173/app` — if not signed in, should redirect to `/`; if signed in (GitHub session exists), should show the app
- Open `http://localhost:5173/nonexistent` — should redirect to `/`

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/layout/AppShell.tsx src/components/landing/LandingPage.tsx src/components/landing/LandingPage.module.css src/components/landing/AuthGuard.tsx
git commit -m "feat: add React Router with stub landing page and auth guard"
```

---

## Task 4: Build the LandingPage component

**Files:**
- Modify: `src/components/landing/LandingPage.tsx`
- Modify: `src/components/landing/LandingPage.module.css`

- [ ] **Step 1: Replace `src/components/landing/LandingPage.tsx` with the full component**

```tsx
import { useNavigate } from 'react-router-dom';
import styles from './LandingPage.module.css';

export function LandingPage() {
  const navigate = useNavigate();
  const goToApp = () => navigate('/app');

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.wordmark}>
          Shelf<span className={styles.accent}>Geek</span>
        </div>
        <button className={styles.signInBtn} onClick={goToApp}>
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
          <button className={styles.ctaBtn} onClick={goToApp}>
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
```

- [ ] **Step 2: Write `src/components/landing/LandingPage.module.css`**

```css
.page {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  font-family: var(--sans);
  color: var(--text);
}

/* ── Nav ── */
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  height: 64px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 50;
}

.wordmark {
  font-family: var(--display);
  font-weight: 800;
  font-size: 20px;
  letter-spacing: -0.03em;
  color: var(--text);
}

.accent {
  color: var(--accent);
}

.signInBtn {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border-mid);
  border-radius: 20px;
  padding: 7px 20px;
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}

.signInBtn:hover {
  background: var(--surface2);
  border-color: var(--accent);
}

/* ── Hero ── */
.hero {
  position: relative;
  text-align: center;
  padding: 80px 40px 72px;
  background: #FDFAF7;
  overflow: hidden;
}

.heroPattern {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.38;
}

.heroContent {
  position: relative;
  z-index: 1;
}

.headline {
  font-family: var(--display);
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--text);
  margin-bottom: 16px;
  max-width: 540px;
  margin-left: auto;
  margin-right: auto;
}

.subhead {
  font-size: 17px;
  color: var(--text-mid);
  line-height: 1.55;
  margin-bottom: 32px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.ctaBtn {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 24px;
  padding: 14px 36px;
  font-family: var(--sans);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(248, 90, 5, 0.3);
  transition: background 0.12s, box-shadow 0.12s;
  touch-action: manipulation;
}

.ctaBtn:hover {
  background: var(--accent-mid);
  box-shadow: 0 6px 20px rgba(248, 90, 5, 0.4);
}

/* ── Features ── */
.features {
  padding: 56px 40px 64px;
  background: var(--bg);
}

.featureGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  max-width: 860px;
  margin: 0 auto;
}

.featureCard {
  background: var(--accent-light);
  border: 1px solid #F0D8C4;
  border-radius: 14px;
  padding: 28px 24px;
}

.featureTitle {
  font-family: var(--sans);
  font-weight: 700;
  font-size: 15px;
  color: var(--text);
  margin-bottom: 8px;
}

.featureDesc {
  font-size: 13px;
  color: var(--text-mid);
  line-height: 1.6;
}

/* ── Footer ── */
.footer {
  background: var(--surface);
  border-top: 1px solid var(--border);
  padding: 32px 40px;
  margin-top: auto;
}

.footerInner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 900px;
  margin: 0 auto;
}

.footerTagline {
  font-size: 12px;
  color: var(--text-mid);
  margin-top: 4px;
}

.footerRight {
  text-align: right;
}

.footerLinks {
  display: flex;
  gap: 20px;
  margin-bottom: 6px;
  justify-content: flex-end;
}

.footerLink {
  font-size: 12px;
  color: var(--text);
  text-decoration: none;
  transition: color 0.12s;
}

.footerLink:hover {
  color: var(--accent);
}

.copyright {
  font-size: 12px;
  color: var(--text-mid);
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .featureGrid {
    grid-template-columns: 1fr;
  }
  .footerInner {
    flex-direction: column;
    gap: 20px;
    align-items: flex-start;
  }
  .footerRight {
    text-align: left;
  }
  .footerLinks {
    justify-content: flex-start;
  }
}

@media (max-width: 480px) {
  .nav {
    padding: 0 16px;
    height: 56px;
  }
  .hero {
    padding: 56px 20px 48px;
  }
  .headline {
    font-size: 28px;
  }
  .subhead {
    font-size: 15px;
  }
  .features {
    padding: 40px 16px 48px;
  }
  .footer {
    padding: 24px 16px;
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Verify the page visually in the browser**

```bash
npm run dev
```

Check `http://localhost:5173/`:
- Sticky nav with ShelfGeek wordmark and secondary-style "Sign in" button
- Hero section with warm rectangle pattern bleeding to all edges, headline in display font, orange CTA button
- 3 orange-tinted feature cards below on a beige background
- White footer with logo + tagline left, links + copyright right

Check `http://localhost:5173/app`:
- If no session: redirects to `/`
- If signed in: renders the app as before

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/LandingPage.tsx src/components/landing/LandingPage.module.css
git commit -m "feat: build landing page with hero, feature grid, and footer"
```

---

## Task 5: Production build + push

**Files:** none — verification and deploy only.

- [ ] **Step 1: Run production build**

```bash
npm run build
```

Expected: build succeeds, no warnings about missing modules.

- [ ] **Step 2: Preview the production build locally**

```bash
npm run preview
```

Open `http://localhost:4173/` — verify both `/` and `/app` routes work in the production bundle.

- [ ] **Step 3: Push to deploy**

```bash
git push origin main
```

Vercel picks up the push automatically. Monitor the Vercel dashboard for the deployment to go live.
