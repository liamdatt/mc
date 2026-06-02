# About Us page redesign — design

**Date:** 2026-06-02
**Status:** Approved (design), pending implementation plan
**Scope:** Rebuild `app/about/page.tsx` into a multi-section, animation-rich page modeled on the client-provided mockup.

## Goal

Replace the current minimal About page (hero + reused `FounderStory`/`DualPlay`/`NumbersBar`/`TrustBar`) with a purpose-built, "show-stopping" About Us experience that tells MEC's family-succession story, presents company values, and introduces the leadership team and board.

The defining feature is **"Our Story"** — a scroll-driven vertical timeline animated with GSAP (`DrawSVGPlugin` line draw + node reveals) and `AnimatedNumber` count-ups.

## Decisions (from brainstorming)

- **Narrative:** Family-succession story. Founder = **Chester G. Minott** (already established sitewide). Successor = a clearly-marked **placeholder name** (`[Successor Name]`). The second chapter is framed objectively around **leadership and growth** — NOT illness, and no "my mother / my father" phrasing.
- **Team & board:** Placeholder names and titles for now.
- **Stats:** Use the mockup's numbers — **40+** years, **1000+** customers served, **5000+** products available, **Nationwide** coverage across Jamaica.
- **Legacy banner image:** No truck/skyline asset exists yet; use a dark gradient + `bg-grid` backdrop, designed to swap in a real image later.
- **Person placeholder image:** `assets/18.png` (repo root) — must be copied into `minott-web/public/images/person-placeholder.png` (Next.js can only serve from `public/`).

## Page structure

Replaces `app/about/page.tsx`. All new components live in `components/sections/` and use named exports, the `@/` alias, existing primitives (`Section`, `Container`, `Eyebrow`, `AnimatedNumber`), `RevealOnScroll`, `lib/tokens.ts` easings, and `lucide-react` icons.

Global `Nav` + `Footer` already wrap every page (via `PublicChrome`), so the mockup's footer is already handled.

### 1. `AboutHero` (tone: light, textured)
- Giant `font-display` headline **"ABOUT US"** with red "US"; SplitText reveal.
- Subhead: *"Our Legacy. Our Family. Our Commitment to You."*
- Two-paragraph intro (40+ years, hard work / family values; "a family business then, today, and for generations to come").
- Right side: 4-up stat row with lucide icons + `AnimatedNumber` count-ups:
  - **40+** "Years of Excellence"
  - **1000+** "Customers Served"
  - **5000+** "Products Available"
  - **Nationwide** "Coverage Across Jamaica" (text, no count-up)
- Backdrop uses existing `bg-grid` utility and/or a subtle diagonal swoosh; `pt-40` to clear the fixed nav.

### 2. `OurStory` (tone: light) — centerpiece animation
Vertical-spine timeline. On scroll-in:
- A central red connector line **draws top→bottom** via GSAP `DrawSVGPlugin` (already registered in project), scrubbed to scroll position.
- Milestone nodes reveal (`outBack` easing) as the line reaches them.
- Big numerals count up via `AnimatedNumber`.

Milestones:
- **40 / YEARS AGO — "1984 — A Vision Takes Root"**: Chester G. Minott founds Minott Equipment & Chemicals with a clear vision — quality products, exceptional service, honest relationships. Portrait (placeholder image).
- **15 / YEARS AGO — "A New Chapter of Strength"**: `[Successor Name]` steps in to lead the company through new challenges, continuing the legacy and growing MEC into the respected company it is today. Portrait (placeholder image).
- Glowing center node icon, then **"Today & Beyond"** — centered paragraph: the family remains hands-on; success is built on relationships and values.

### 3. `CompanyValues` (tone: light)
Five value pillars, each a circular red icon + title + one-line body, staggered reveal-on-scroll:
- **Family** — "We treat our customers and team like family."
- **Integrity** — "We do the right thing, always."
- **Quality** — "We deliver trusted products and solutions."
- **Resilience** — "We overcome challenges and keep moving forward."
- **Commitment** — "We are committed to our customers' success."

### 4. `LeadershipTeam` (tone: dark)
"Executive Leadership Team". 5 portrait cards: CEO, CFO, COO, GM, Director (all "Name Here"). Each: portrait (placeholder image), red role tag, name, one-line bio, "View Profile →" link (non-functional placeholder for now). Cards lift + red glow on hover, matching existing `ValuePillars` hover treatment.

### 5. `BoardOfDirectors` (tone: light)
"Board of Directors". Responsive grid of 6 portrait cards ("Name Here" / "Board Member"), staggered reveal-on-scroll.

### 6. `LegacyBanner` (tone: dark)
*"Building on our past. Investing in our future."* + supporting paragraph honoring the founder's legacy and the next chapter. Dark gradient + `bg-grid` backdrop; structured so a real truck/skyline image can be dropped in later.

## Component inventory

New files in `components/sections/`:
- `AboutHero.tsx` (client — SplitText)
- `OurStory.tsx` (client — GSAP DrawSVG + ScrollTrigger)
- `CompanyValues.tsx` (client — Framer reveal)
- `LeadershipTeam.tsx` (client — Framer reveal / hover)
- `BoardOfDirectors.tsx` (client — Framer reveal)
- `LegacyBanner.tsx` (server or client; reveal optional)

Rewritten:
- `app/about/page.tsx` — composes the six sections; keeps/updates `metadata`.

Asset:
- Copy `assets/18.png` → `minott-web/public/images/person-placeholder.png`.

The current About page's reused sections (`FounderStory`, `DualPlay`, `NumbersBar`, `TrustBar`) are **no longer referenced by About** but remain in the codebase for use on other pages — do not delete them.

## Motion conventions (hard requirements)

- Register GSAP plugins SSR-guarded at module top:
  `if (typeof window !== "undefined") gsap.registerPlugin(SplitText, DrawSVGPlugin, ScrollTrigger);`
- Every `useGSAP` block gates on reduced motion: `const reduced = useReducedMotion(); ... if (reduced) return;` with `dependencies: [reduced]`.
- Framer animations covered globally by `MotionRoot`; raw GSAP is not — gate it.
- SplitText-split nodes get explicit `role="text"` (they receive an `aria-label`).
- Use easings/durations from `lib/tokens.ts`; if any token changes, mirror in `globals.css` `@theme` (none expected here).

## Out of scope

- Real names/titles/bios/photos for team & board (placeholders only).
- Functional "View Profile" pages/links.
- Real truck/skyline banner image.
- Any DB/admin changes — this is a static marketing page.

## Verification

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Manual click-through at `/about`: timeline draws on scroll, count-ups fire, reveals stagger, and with OS "reduce motion" enabled the page renders fully with no animation.
