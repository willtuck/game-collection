# ShelfGeek Landing Page Design Spec

> **For agentic workers:** Use superpowers:writing-plans to create the implementation plan from this spec.

**Goal:** A public marketing landing page at shelfgeek.com that explains what ShelfGeek is and drives sign-ups.

---

## Architecture

The landing page lives inside the existing Vite/React app. React Router is added, making `/` the landing page and `/app` the existing collection app. One repo, one Vercel deployment, one domain. Auth state is shared naturally between the landing page CTAs and the app.

**New routes:**
- `/` — `LandingPage` component (public, no auth required)
- `/app` — existing `AppShell` (requires auth, redirects to `/` if unauthenticated)

---

## Visual Design

### Tokens
All values pulled from existing `src/index.css` custom properties:
- Text: `#344866` (`--text`)
- Body/secondary text: `#786252` (`--text-mid`)
- Accent/CTA: `#F85A05` (`--accent`)
- Background: `#F2EFE9` (`--bg`)
- Surface: `#fff` (`--surface`)
- Border: `#D0C8BE` (`--border`)
- Feature card bg: `#FEF0E6` (`--accent-light`)
- Feature card border: `#F0D8C4`
- Fonts: DM Sans (`--sans`), Jost (`--display`) — already loaded via Google Fonts

### Button variants (to be formalised)
- **Primary**: `background: #F85A05; color: #fff; border: none; border-radius: 24px; padding: 14px 36px;`
- **Secondary**: `background: transparent; color: #344866; border: 1px solid #C3B6A7; border-radius: 20px; padding: 7px 20px;`

---

## Page Structure

### 1. Nav
- Left: ShelfGeek wordmark (`Shelf` in `--text`, `Geek` in `--accent`)
- Right: Secondary-style "Sign in" button → redirects to `/app` (which handles auth)
- Background: `#fff`, bottom border `--border`
- Sticky at top

### 2. Hero
- Background: `#FDFAF7` with full-bleed SVG rectangle pattern (warm cream/tan tones, rows of rectangles suggesting game boxes on shelves, bleeding off all four edges)
- Centered text overlay:
  - Headline: *"Your board game collection, beautifully organised."* — 40px, font-weight 800, Jost display font, `#344866`
  - Subhead: *"Track every game. Plan your shelves. Always know what fits where."* — 17px, `#786252`
  - Primary CTA button: "Get started free" → redirects to `/app`

### 3. Feature grid
- Background: `#F2EFE9`
- 3-column grid, max-width 860px, centred
- Each card: `background: #FEF0E6; border: 1px solid #F0D8C4; border-radius: 14px; padding: 28px 24px`
- No icons — title + description only
- Cards:
  1. **Track your collection** — "Add every game you own. Search, filter, and manage your full library in one place."
  2. **Know what fits** — "Log box dimensions and see at a glance which games fit on which shelves — no more guessing." *(copy will improve once BGG API access is granted)*
  3. **Visualise any shelving unit** — "See your shelves come to life in an isometric view — IKEA Kallax, custom units, whatever you use."

### 4. Footer
- Background: `#fff`, top border `--border`
- Left: ShelfGeek wordmark + tagline ("Your board game collection, beautifully organised.")
- Right: Privacy Policy · Terms of Service links + copyright ("© 2026 ShelfGeek")

---

## Routing & Auth Integration

- React Router v6 (`react-router-dom`) added as a dependency
- `App.tsx` becomes the router root
- Landing page is fully public (no Supabase session check)
- `/app` route wraps `AppShell` in an auth guard: if no session, redirect to `/`
- "Sign in" and "Get started free" both navigate to `/app`, where existing Supabase auth flow handles sign-in/sign-up

---

## Responsive behaviour

- Hero headline: wraps naturally on mobile, font-size scales down to ~28px at <480px
- Feature grid: collapses to single column at <640px
- Nav: logo + sign-in button remain on same line (no hamburger needed at this scale)
- Footer: stacks vertically on mobile

---

## Out of scope

- Screenshot/app preview section (deferred — no production screenshots yet)
- Pricing section (deferred — freemium model not yet implemented)
- Apple Sign In (deferred — requires custom domain + $99/yr Apple Developer account)
- Animations beyond the existing `fadeIn` pattern already in the app
