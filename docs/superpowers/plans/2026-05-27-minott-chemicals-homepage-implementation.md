# Minott Chemicals Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Minott Chemicals homepage demo (11 sections + 404 + nav + footer) end-to-end per the locked spec at `docs/superpowers/specs/2026-05-27-minott-chemicals-homepage-design.md`.

**Architecture:** Next.js 15 (App Router, TS) + Tailwind v4 (CSS-first tokens) + Framer Motion + GSAP 3.13 (ScrollTrigger, SplitText, DrawSVGPlugin — all free post-Webflow acquisition) + Lenis smooth scroll. Each section is a self-contained component owning its own motion via `useGSAP`. Tokens are CSS variables at `:root`, mirrored in `lib/tokens.ts` for JS-driven values. No CMS, no backend, no Mapbox — custom SVG map instead.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, Framer Motion (`motion/react`), GSAP `^3.13` with `@gsap/react`, Lenis, `lucide-react`, `clsx`. npm package manager. No test framework — verification is Lighthouse + manual audit per the spec's verification gate.

**Test pattern adaptation:** This is a visual demo build with no automated tests in scope. The per-task verification pattern is: **create files → smoke-check via `npm run dev` → commit**. The final task runs the full Section 14 verification gate (Lighthouse, mobile, keyboard, screen reader, reduced motion, cross-browser).

**Working directory:** `/home/liamd/Work/github/Minott/`. The Next.js app lives at `/home/liamd/Work/github/Minott/minott-web/` after Task 1.

---

## File structure (locked at Task 1)

```
minott-web/
├── app/
│   ├── layout.tsx                  // root: fonts, providers, skip link
│   ├── page.tsx                    // composes 11 sections
│   ├── globals.css                 // tokens, base, utilities
│   ├── not-found.tsx               // 404 "WRONG AISLE"
│   └── icon.tsx                    // favicon
├── components/
│   ├── primitives/
│   │   ├── Button.tsx
│   │   ├── Container.tsx
│   │   ├── Section.tsx
│   │   ├── Eyebrow.tsx
│   │   ├── Card.tsx
│   │   └── AnimatedNumber.tsx
│   ├── layout/
│   │   ├── Nav.tsx
│   │   ├── Footer.tsx
│   │   └── PageTransition.tsx
│   ├── motion/
│   │   ├── LenisProvider.tsx
│   │   ├── CustomCursor.tsx
│   │   ├── ScrollProgress.tsx
│   │   └── RevealOnScroll.tsx
│   └── sections/
│       ├── Hero.tsx
│       ├── TrustBar.tsx
│       ├── ValuePillars.tsx
│       ├── DualPlay.tsx
│       ├── ProductCategories.tsx
│       ├── IndustriesGrid.tsx
│       ├── NumbersBar.tsx
│       ├── FounderStory.tsx
│       ├── QuoteCTA.tsx
│       └── LocationContact.tsx
├── lib/
│   ├── tokens.ts
│   ├── motion.ts
│   ├── use-reduced-motion.ts
│   └── cn.ts
├── public/
│   ├── images/                     // renamed JPGs
│   ├── brand-logos/                // SVGs
│   └── svg/                        // diagonal sweeps, grid, custom icons
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## Task 1: Scaffold Next.js app and install dependencies

**Files:**
- Create: `minott-web/` (entire scaffold)

- [ ] **Step 1: Scaffold**

```bash
cd /home/liamd/Work/github/Minott
npx create-next-app@latest minott-web --typescript --tailwind --app --no-src-dir --import-alias "@/*" --turbopack --eslint --use-npm
```

Accept all defaults. Expected: directory `minott-web/` created with Next 15, Tailwind v4, TS, app router.

- [ ] **Step 2: Install motion + utility deps**

```bash
cd /home/liamd/Work/github/Minott/minott-web
npm install gsap@^3.13 @gsap/react framer-motion lenis lucide-react clsx
```

- [ ] **Step 3: Smoke-check the scaffold**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: default Next.js welcome page renders.
Stop the dev server.

- [ ] **Step 4: Initialize git repo at project root + first commit**

```bash
cd /home/liamd/Work/github/Minott
git init
git add minott-web/ docs/
git commit -m "chore: scaffold Next.js 15 app with motion + tooling deps"
```

---

## Task 2: Configure design tokens in globals.css

**Files:**
- Modify: `minott-web/app/globals.css`

- [ ] **Step 1: Replace globals.css**

Replace the entire contents of `minott-web/app/globals.css` with:

```css
@import "tailwindcss";

@theme {
  /* Brand colors */
  --color-mec-red: #E10600;
  --color-mec-red-hover: #c10500;
  --color-mec-ink: #0D0D0D;
  --color-mec-graphite: #2B2B2B;
  --color-mec-mist: #F2F2F2;
  --color-mec-pure: #FFFFFF;

  /* Brand fonts (wired in layout.tsx) */
  --font-display: var(--font-bebas);
  --font-body: var(--font-montserrat);
  --font-mono: var(--font-jetbrains);

  /* Type scale */
  --text-eyebrow: 0.75rem;
  --text-h1: clamp(3.5rem, 8vw, 7.5rem);
  --text-h2: clamp(2.5rem, 5vw, 4.5rem);
  --text-h3: clamp(1.5rem, 2.5vw, 2.25rem);
  --text-lede: clamp(1.125rem, 1.4vw, 1.375rem);
  --text-body: clamp(1rem, 1.1vw, 1.125rem);

  /* Spacing scale */
  --spacing-section-y: clamp(96px, 12vw, 192px);

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-pill: 999px;

  /* Shadows */
  --shadow-card: 0 1px 2px rgba(0, 0, 0, 0.04), 0 12px 24px -8px rgba(0, 0, 0, 0.08);
  --shadow-lift: 0 24px 48px -12px rgba(225, 6, 0, 0.18);

  /* Easing */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1);
  --ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Special tints */
  --color-mec-red-glow: rgba(225, 6, 0, 0.18);
  --color-mec-grid: rgba(225, 6, 0, 0.06);
}

:root {
  color-scheme: light;
}

* {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

html {
  scroll-behavior: auto; /* Lenis owns scroll */
  background: var(--color-mec-pure);
  color: var(--color-mec-ink);
}

body {
  font-family: var(--font-body), system-ui, -apple-system, sans-serif;
  font-weight: 400;
  line-height: 1.55;
  overflow-x: hidden;
}

::selection {
  background: var(--color-mec-red);
  color: var(--color-mec-pure);
}

/* Custom cursor — hide native on fine pointer when active */
html.has-custom-cursor,
html.has-custom-cursor * {
  cursor: none !important;
}

/* Utility: industrial grid backdrop (subtle dot grid on light bg) */
.bg-grid {
  background-image:
    radial-gradient(circle, var(--color-mec-grid) 1px, transparent 1px);
  background-size: 32px 32px;
}

/* Utility: diagonal cut wedge (used on hero) */
.clip-diagonal-down {
  clip-path: polygon(0 0, 100% 0, 100% 92%, 0 100%);
}

/* Skip-to-content link */
.skip-to-content {
  position: absolute;
  top: -64px;
  left: 16px;
  z-index: 100;
  padding: 8px 16px;
  background: var(--color-mec-ink);
  color: var(--color-mec-pure);
  font-weight: 700;
  transition: top 200ms var(--ease-out-expo);
}
.skip-to-content:focus {
  top: 16px;
}

/* Focus rings */
:focus-visible {
  outline: 2px solid var(--color-mec-red);
  outline-offset: 2px;
}

/* Reduced motion: kill all animations & transitions */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}

/* Typography helpers */
.font-display {
  font-family: var(--font-display), Impact, sans-serif;
  letter-spacing: 0.02em;
  line-height: 1;
}
.font-display-tight {
  font-family: var(--font-display), Impact, sans-serif;
  letter-spacing: -0.01em;
  line-height: 0.95;
}

/* Eyebrow utility */
.eyebrow {
  font-size: var(--text-eyebrow);
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-family: var(--font-body), system-ui, sans-serif;
}

/* Loader bar (initial page load) */
.page-loader {
  position: fixed;
  inset: 0;
  background: var(--color-mec-ink);
  z-index: 999;
  display: grid;
  place-items: center;
  pointer-events: none;
}
.page-loader__bar {
  width: min(60vw, 320px);
  height: 2px;
  background: var(--color-mec-red);
  transform-origin: left center;
  animation: loaderGrow 700ms var(--ease-out-expo) forwards;
}
@keyframes loaderGrow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
.page-loader.is-done {
  animation: loaderOut 400ms var(--ease-out-expo) forwards;
  animation-delay: 700ms;
}
@keyframes loaderOut {
  to { opacity: 0; visibility: hidden; }
}
```

- [ ] **Step 2: Commit**

```bash
git add minott-web/app/globals.css
git commit -m "feat(tokens): wire design tokens via Tailwind v4 @theme"
```

---

## Task 3: Wire fonts in root layout

**Files:**
- Modify: `minott-web/app/layout.tsx`

- [ ] **Step 1: Replace layout.tsx**

```tsx
import type { Metadata } from "next";
import { Bebas_Neue, Montserrat, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const bebas = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas",
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://minottchem.com"),
  title:
    "Minott Chemicals — Jamaica's Most Trusted Partner in Clean | Industrial & Janitorial Supplies",
  description:
    "Jamaica's largest supplier of chemicals, janitorial equipment, and PPE. Elite Distributor for 3M, NSS, San Jamar, Rubbermaid Commercial, and Purell. 35+ years serving Jamaican businesses. Request a quote in one business day.",
  openGraph: {
    title: "Minott Chemicals — Cleaner Spaces. Stronger Business.",
    description:
      "Jamaica's largest chemical & janitorial supplier. Elite Distributor for 3M, NSS, San Jamar, Rubbermaid, Purell.",
    type: "website",
    locale: "en_JM",
    siteName: "Minott Chemicals",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${bebas.variable} ${montserrat.variable} ${jetbrains.variable}`}
    >
      <body>
        <a href="#main" className="skip-to-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Smoke check**

```bash
npm run dev
```

Open `http://localhost:3000`. Default page should now render in Montserrat. Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add minott-web/app/layout.tsx
git commit -m "feat(fonts): wire Bebas Neue + Montserrat + JetBrains Mono via next/font"
```

---

## Task 4: Utility lib — cn, tokens, motion, reduced-motion

**Files:**
- Create: `minott-web/lib/cn.ts`
- Create: `minott-web/lib/tokens.ts`
- Create: `minott-web/lib/motion.ts`
- Create: `minott-web/lib/use-reduced-motion.ts`

- [ ] **Step 1: Create lib/cn.ts**

```ts
import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
```

- [ ] **Step 2: Create lib/tokens.ts**

```ts
export const colors = {
  red: "#E10600",
  redHover: "#c10500",
  redGlow: "rgba(225,6,0,0.18)",
  ink: "#0D0D0D",
  graphite: "#2B2B2B",
  mist: "#F2F2F2",
  pure: "#FFFFFF",
  grid: "rgba(225,6,0,0.06)",
} as const;

export const easing = {
  outExpo: [0.16, 1, 0.3, 1] as const,
  inOutQuart: [0.76, 0, 0.24, 1] as const,
  outBack: [0.34, 1.56, 0.64, 1] as const,
} as const;

export const durations = {
  xs: 0.2,
  sm: 0.4,
  md: 0.6,
  lg: 0.9,
  xl: 1.2,
} as const;
```

- [ ] **Step 3: Create lib/motion.ts**

```ts
import type { Variants } from "framer-motion";
import { easing, durations } from "./tokens";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.md, ease: easing.outExpo },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: durations.md, ease: easing.outExpo },
  },
};

export const stagger = (delayChildren = 0, stagger = 0.08): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren } },
});

export const clipReveal: Variants = {
  hidden: { clipPath: "inset(0 0 100% 0)" },
  visible: {
    clipPath: "inset(0 0 0% 0)",
    transition: { duration: durations.xl, ease: easing.outExpo },
  },
};
```

- [ ] **Step 4: Create lib/use-reduced-motion.ts**

```ts
"use client";
import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
```

- [ ] **Step 5: Commit**

```bash
git add minott-web/lib/
git commit -m "feat(lib): token mirror, motion variants, reduced-motion hook"
```

---

## Task 5: Copy & rename image assets to public/images

**Files:**
- Create: `minott-web/public/images/*.jpg` (18 files)

- [ ] **Step 1: Run the rename copy**

```bash
cd /home/liamd/Work/github/Minott
mkdir -p minott-web/public/images
declare -A names=(
  [1]=hero-main
  [2]=hero-trust-card
  [3]=dualplay-manufacturing
  [4]=dualplay-distribution
  [5]=product-chemicals
  [6]=product-janitorial
  [7]=product-ppe
  [8]=product-paper
  [9]=industry-hospitality
  [10]=industry-medical
  [11]=industry-manufacturing
  [12]=industry-financial
  [13]=industry-telecoms
  [14]=industry-entertainment
  [15]=industry-retail
  [16]=industry-janitorial
  [17]=industry-sanitation
  [18]=founder-portrait
)
for n in "${!names[@]}"; do
  cp "assets/${n}.png" "minott-web/public/images/${names[$n]}.jpg"
done
ls minott-web/public/images/ | wc -l
```

Expected: `18`. (We're copying `.png` data into `.jpg` filenames — Next.js Image will optimize on request and serve AVIF/WebP regardless of the source extension.)

- [ ] **Step 2: Commit**

```bash
git add minott-web/public/images/
git commit -m "chore(assets): copy + rename 18 image assets to public/images"
```

---

## Task 6: Brand logo SVGs + diagonal sweep + grid SVG

**Files:**
- Create: `minott-web/public/brand-logos/3m.svg`
- Create: `minott-web/public/brand-logos/nss.svg`
- Create: `minott-web/public/brand-logos/san-jamar.svg`
- Create: `minott-web/public/brand-logos/rubbermaid.svg`
- Create: `minott-web/public/brand-logos/purell.svg`
- Create: `minott-web/public/svg/diagonal-sweep.svg`

We render each brand as a styled Bebas wordmark in a 240×80 viewBox. Trademark-safe, swap-out-ready when real SVGs are sourced. This matches the spec's "fallback to a Bebas wordmark" plan.

- [ ] **Step 1: Create public/brand-logos/3m.svg**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" fill="currentColor">
  <text x="120" y="58" text-anchor="middle" font-family="Bebas Neue, Impact, sans-serif" font-size="56" letter-spacing="4">3M</text>
</svg>
```

- [ ] **Step 2: Create public/brand-logos/nss.svg**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" fill="currentColor">
  <text x="120" y="58" text-anchor="middle" font-family="Bebas Neue, Impact, sans-serif" font-size="56" letter-spacing="4">NSS</text>
</svg>
```

- [ ] **Step 3: Create public/brand-logos/san-jamar.svg**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" fill="currentColor">
  <text x="120" y="50" text-anchor="middle" font-family="Bebas Neue, Impact, sans-serif" font-size="36" letter-spacing="2">SAN JAMAR</text>
</svg>
```

- [ ] **Step 4: Create public/brand-logos/rubbermaid.svg**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" fill="currentColor">
  <text x="120" y="42" text-anchor="middle" font-family="Bebas Neue, Impact, sans-serif" font-size="32" letter-spacing="2">RUBBERMAID</text>
  <text x="120" y="64" text-anchor="middle" font-family="Montserrat, sans-serif" font-size="11" letter-spacing="3" font-weight="600">COMMERCIAL</text>
</svg>
```

- [ ] **Step 5: Create public/brand-logos/purell.svg**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" fill="currentColor">
  <text x="120" y="58" text-anchor="middle" font-family="Bebas Neue, Impact, sans-serif" font-size="56" letter-spacing="6">PURELL</text>
</svg>
```

- [ ] **Step 6: Create public/svg/diagonal-sweep.svg** (used in Hero)

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
  <path id="sweep-path" d="M 0 720 L 1440 240" stroke="#E10600" stroke-width="4" fill="none" stroke-linecap="square" />
</svg>
```

- [ ] **Step 7: Commit**

```bash
git add minott-web/public/brand-logos/ minott-web/public/svg/
git commit -m "feat(assets): brand-logo wordmark fallbacks + hero diagonal sweep SVG"
```

---

## Task 7: LenisProvider (smooth scroll, GSAP integration, reduced-motion gate)

**Files:**
- Create: `minott-web/components/motion/LenisProvider.tsx`

- [ ] **Step 1: Create LenisProvider.tsx**

```tsx
"use client";
import { ReactLenis, useLenis } from "lenis/react";
import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/lib/use-reduced-motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function LenisGsapSync() {
  const lenis = useLenis();
  useEffect(() => {
    if (!lenis) return;
    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);
    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.refresh();
    return () => {
      lenis.off("scroll", onScroll);
      gsap.ticker.remove(raf);
    };
  }, [lenis]);
  return null;
}

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{children}</>;
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.08,
        duration: 1.4,
        smoothWheel: true,
        wheelMultiplier: 1,
      }}
    >
      <LenisGsapSync />
      {children}
    </ReactLenis>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add minott-web/components/motion/LenisProvider.tsx
git commit -m "feat(motion): Lenis provider with GSAP ScrollTrigger sync"
```

---

## Task 8: Custom cursor

**Files:**
- Create: `minott-web/components/motion/CustomCursor.tsx`

- [ ] **Step 1: Create CustomCursor.tsx**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

export function CustomCursor() {
  const reduced = useReducedMotion();
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");
  const [active, setActive] = useState(false);
  const [fine, setFine] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: fine)");
    setFine(mq.matches);
    const on = (e: MediaQueryListEvent) => setFine(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (!fine || reduced) return;
    document.documentElement.classList.add("has-custom-cursor");
    return () => document.documentElement.classList.remove("has-custom-cursor");
  }, [fine, reduced]);

  useEffect(() => {
    if (!fine || reduced) return;
    let mouseX = 0,
      mouseY = 0,
      ringX = 0,
      ringY = 0;
    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX - 4}px, ${mouseY - 4}px, 0)`;
      }
    };
    const tick = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX - 16}px, ${ringY - 16}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const i = t.closest<HTMLElement>("a, button, [data-cursor]");
      if (i) {
        setActive(true);
        setLabel(i.dataset.cursor || "");
      }
    };
    const onOut = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("a, button, [data-cursor]")) {
        setActive(false);
        setLabel("");
      }
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    let raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      cancelAnimationFrame(raf);
    };
  }, [fine, reduced]);

  if (!fine || reduced) return null;

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[200] h-2 w-2 rounded-full bg-mec-red transition-opacity"
        style={{
          opacity: active ? 0 : 1,
          transition: "opacity 180ms cubic-bezier(0.16,1,0.3,1)",
        }}
      />
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[199] grid place-items-center rounded-full border border-mec-red"
        style={{
          width: active ? 64 : 32,
          height: active ? 64 : 32,
          marginLeft: active ? -16 : 0,
          marginTop: active ? -16 : 0,
          transition:
            "width 220ms cubic-bezier(0.16,1,0.3,1), height 220ms cubic-bezier(0.16,1,0.3,1), margin 220ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {label && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-mec-red">
            {label}
          </span>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add minott-web/components/motion/CustomCursor.tsx
git commit -m "feat(motion): custom cursor with lagging ring + interactive label"
```

---

## Task 9: ScrollProgress + RevealOnScroll primitives

**Files:**
- Create: `minott-web/components/motion/ScrollProgress.tsx`
- Create: `minott-web/components/motion/RevealOnScroll.tsx`

- [ ] **Step 1: Create ScrollProgress.tsx**

```tsx
"use client";
import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 30,
    restDelta: 0.001,
  });
  return (
    <motion.div
      aria-hidden
      className="fixed left-0 right-0 top-0 z-[150] h-[2px] origin-left bg-mec-red"
      style={{ scaleX }}
    />
  );
}
```

- [ ] **Step 2: Create RevealOnScroll.tsx**

```tsx
"use client";
import { motion, type Variants } from "framer-motion";
import { fadeUp } from "@/lib/motion";

interface Props {
  children: React.ReactNode;
  variants?: Variants;
  className?: string;
  amount?: number;
  delay?: number;
  as?: "div" | "section" | "header" | "article";
}

export function RevealOnScroll({
  children,
  variants = fadeUp,
  className,
  amount = 0.3,
  delay = 0,
  as = "div",
}: Props) {
  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      transition={{ delay }}
    >
      {children}
    </Tag>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add minott-web/components/motion/
git commit -m "feat(motion): scroll progress bar + reveal-on-scroll primitive"
```

---

## Task 10: Button primitive

**Files:**
- Create: `minott-web/components/primitives/Button.tsx`

- [ ] **Step 1: Create Button.tsx**

```tsx
"use client";
import { forwardRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "ghost-dark";

interface BaseProps {
  variant?: Variant;
  arrow?: boolean;
  className?: string;
  children: React.ReactNode;
}

type ButtonAsButton = BaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type ButtonAsLink = BaseProps & {
  href: string;
  external?: boolean;
};

type ButtonProps = ButtonAsButton | ButtonAsLink;

const base =
  "group inline-flex items-center justify-center gap-3 font-semibold uppercase tracking-[0.12em] text-[13px] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] relative overflow-hidden disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-mec-red text-mec-pure px-7 py-4 hover:shadow-[0_24px_48px_-12px_rgba(225,6,0,0.35)] active:scale-[0.97]",
  ghost:
    "border border-mec-ink text-mec-ink px-7 py-[15px] hover:border-mec-red hover:text-mec-red",
  "ghost-dark":
    "border border-white/30 text-mec-pure px-7 py-[15px] hover:border-mec-red hover:text-mec-red",
};

export const Button = forwardRef<HTMLElement, ButtonProps>(function Button(
  { variant = "primary", arrow = false, className, children, ...rest },
  ref,
) {
  const content = (
    <>
      {variant === "primary" && (
        <span
          aria-hidden
          className="absolute inset-0 bg-[#c10500] origin-left scale-x-0 transition-transform duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:scale-x-100"
        />
      )}
      <span className="relative z-[1]">{children}</span>
      {arrow && (
        <ArrowRight
          aria-hidden
          className="relative z-[1] h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
        />
      )}
    </>
  );

  if ("href" in rest && rest.href) {
    const { href, external, ...linkProps } = rest;
    const props = external
      ? { target: "_blank", rel: "noopener noreferrer" }
      : {};
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={cn(base, variants[variant], className)}
        data-cursor="View"
        {...props}
        {...linkProps}
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={cn(base, variants[variant], className)}
      data-cursor="Click"
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add minott-web/components/primitives/Button.tsx
git commit -m "feat(ui): Button primitive with primary/ghost variants + hover fill"
```

---

## Task 11: Container, Section, Eyebrow, Card, AnimatedNumber primitives

**Files:**
- Create: `minott-web/components/primitives/Container.tsx`
- Create: `minott-web/components/primitives/Section.tsx`
- Create: `minott-web/components/primitives/Eyebrow.tsx`
- Create: `minott-web/components/primitives/Card.tsx`
- Create: `minott-web/components/primitives/AnimatedNumber.tsx`

- [ ] **Step 1: Create Container.tsx**

```tsx
import { cn } from "@/lib/cn";

export function Container({
  children,
  className,
  bleed = false,
}: {
  children: React.ReactNode;
  className?: string;
  bleed?: boolean;
}) {
  return (
    <div
      className={cn(
        bleed ? "w-full" : "mx-auto w-full max-w-[1280px] px-6 md:px-10",
        className,
      )}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create Section.tsx**

```tsx
import { cn } from "@/lib/cn";

type Tone = "light" | "dark" | "mist" | "red" | "transparent";

const toneMap: Record<Tone, string> = {
  light: "bg-mec-pure text-mec-ink",
  dark: "bg-mec-ink text-mec-pure",
  mist: "bg-mec-mist text-mec-ink",
  red: "bg-mec-red text-mec-pure",
  transparent: "",
};

export function Section({
  children,
  tone = "light",
  className,
  id,
  pad = true,
  as: As = "section",
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  id?: string;
  pad?: boolean;
  as?: "section" | "div" | "article";
}) {
  return (
    <As
      id={id}
      className={cn(
        "relative w-full",
        pad && "py-[var(--spacing-section-y)]",
        toneMap[tone],
        className,
      )}
    >
      {children}
    </As>
  );
}
```

- [ ] **Step 3: Create Eyebrow.tsx**

```tsx
import { cn } from "@/lib/cn";

export function Eyebrow({
  children,
  tone = "red",
  className,
}: {
  children: React.ReactNode;
  tone?: "red" | "ink" | "white";
  className?: string;
}) {
  const color =
    tone === "red"
      ? "text-mec-red"
      : tone === "white"
        ? "text-mec-pure/80"
        : "text-mec-ink/70";
  return (
    <span className={cn("eyebrow inline-flex items-center", color, className)}>
      <span
        aria-hidden
        className={cn(
          "mr-3 h-px w-8",
          tone === "red"
            ? "bg-mec-red"
            : tone === "white"
              ? "bg-mec-pure/60"
              : "bg-mec-ink/40",
        )}
      />
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Create Card.tsx**

```tsx
import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
  border = "ink",
}: {
  children: React.ReactNode;
  className?: string;
  border?: "ink" | "white" | "none";
}) {
  const borderCls =
    border === "white"
      ? "border border-white/10 hover:border-white/30"
      : border === "ink"
        ? "border border-mec-ink/10 hover:border-mec-ink/30"
        : "";
  return (
    <div
      className={cn(
        "group relative rounded-md p-8 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-2 hover:shadow-[0_24px_48px_-12px_rgba(225,6,0,0.18)]",
        borderCls,
        className,
      )}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Create AnimatedNumber.tsx**

```tsx
"use client";
import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useInView,
  animate,
} from "framer-motion";

export function AnimatedNumber({
  to,
  suffix = "",
  duration = 1.2,
  className,
}: {
  to: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const v = useMotionValue(0);
  const rounded = useTransform(v, (latest) => Math.round(latest));

  useEffect(() => {
    if (inView) {
      const controls = animate(v, to, {
        duration,
        ease: [0.16, 1, 0.3, 1],
      });
      return controls.stop;
    }
  }, [inView, to, duration, v]);

  return (
    <span ref={ref} className={className}>
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add minott-web/components/primitives/
git commit -m "feat(ui): Container, Section, Eyebrow, Card, AnimatedNumber primitives"
```

---

## Task 12: Navigation (transparent → solid, mobile overlay)

**Files:**
- Create: `minott-web/components/layout/Nav.tsx`

- [ ] **Step 1: Create Nav.tsx**

```tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "#products", label: "Products" },
  { href: "#industries", label: "Industries" },
  { href: "#founder", label: "About" },
  { href: "#contact", label: "Contact" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 80);
      if (y > lastY && y > 200) setHidden(true);
      else setHidden(false);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <motion.header
        initial={false}
        animate={{ y: hidden ? "-100%" : "0%" }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed left-0 right-0 top-0 z-[120] transition-[background,backdrop-filter] duration-300",
          scrolled
            ? "bg-mec-ink/90 backdrop-blur-md"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-4 md:px-10">
          <Link
            href="#top"
            className={cn(
              "font-display text-2xl tracking-wider transition-colors",
              scrolled || open ? "text-mec-pure" : "text-mec-pure",
            )}
            data-cursor="Top"
          >
            <span className="text-mec-red">MEC</span>{" "}
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70 font-[var(--font-body)]">
              Minott Chemicals
            </span>
          </Link>

          <nav className="hidden items-center gap-10 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="relative text-sm font-semibold uppercase tracking-[0.14em] text-mec-pure transition-colors hover:text-mec-red"
                data-cursor="View"
              >
                <span className="relative">
                  {l.label}
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-mec-red transition-[width] duration-200 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:w-full" />
                </span>
              </Link>
            ))}
          </nav>

          <div className="hidden md:block">
            <Button href="#contact" variant="primary" arrow>
              Request a Quote
            </Button>
          </div>

          <button
            type="button"
            className="md:hidden text-mec-pure"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[110] grid place-items-center bg-mec-ink md:hidden"
          >
            <nav className="flex flex-col items-center gap-8 text-center">
              {LINKS.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    delay: 0.1 + i * 0.05,
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="font-display text-5xl tracking-wider text-mec-pure"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="mt-8"
              >
                <Button
                  href="#contact"
                  variant="primary"
                  arrow
                  onClick={() => setOpen(false)}
                >
                  Request a Quote
                </Button>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add minott-web/components/layout/Nav.tsx
git commit -m "feat(layout): nav with scroll states + mobile overlay"
```

---

## Task 13: Footer with logo easter-egg

**Files:**
- Create: `minott-web/components/layout/Footer.tsx`

- [ ] **Step 1: Create Footer.tsx**

```tsx
"use client";
import Link from "next/link";
import { Facebook } from "lucide-react";
import { Container } from "@/components/primitives/Container";

const QUICK = [
  { href: "#top", label: "Home" },
  { href: "#products", label: "Products" },
  { href: "#industries", label: "Industries" },
  { href: "#trust", label: "Brands" },
  { href: "#founder", label: "About" },
  { href: "#contact", label: "Contact" },
];

const PRODUCTS = [
  "Industrial & Household Chemicals",
  "Janitorial Equipment & Supplies",
  "Personal Protection Equipment",
  "Paper Products",
];

export function Footer() {
  return (
    <footer className="bg-mec-ink text-mec-pure/80">
      <Container className="grid grid-cols-1 gap-12 py-24 md:grid-cols-12">
        <div className="md:col-span-4">
          <Link
            href="#top"
            className="group inline-flex items-baseline gap-2"
            data-cursor="Top"
          >
            <span className="font-display text-4xl tracking-wider text-mec-pure">
              <span className="text-mec-red">MEC</span> Minott
            </span>
            <span
              aria-hidden
              className="ml-2 h-2 w-2 rounded-full bg-mec-red opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-hover:animate-pulse"
            />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Cleaner Spaces. Stronger Business. Jamaica's most trusted partner in
            clean — since 1990.
          </p>
          <a
            href="https://facebook.com/minottchemicalsja"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Minott Chemicals on Facebook"
            className="mt-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-mec-pure/20 transition hover:border-mec-red hover:text-mec-red"
            data-cursor="Open"
          >
            <Facebook size={18} />
          </a>
        </div>

        <div className="md:col-span-2">
          <h3 className="eyebrow text-mec-pure">Quick Links</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {QUICK.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-mec-red">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-3">
          <h3 className="eyebrow text-mec-pure">Our Products</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {PRODUCTS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-3">
          <h3 className="eyebrow text-mec-pure">Contact</h3>
          <div className="mt-4 space-y-3 text-sm">
            <a
              href="tel:+18769295284"
              className="block hover:text-mec-red"
              data-cursor="Call"
            >
              (876) 929-5284
            </a>
            <a
              href="mailto:sales@minottchem.com"
              className="block hover:text-mec-red"
              data-cursor="Email"
            >
              sales@minottchem.com
            </a>
            <p>Mon–Fri, 8:00 AM – 4:30 PM</p>
            <p>14½ Retirement Road, Kingston 5, Jamaica</p>
          </div>
        </div>
      </Container>

      <div className="border-t border-mec-pure/10">
        <Container className="flex flex-col items-start justify-between gap-3 py-6 text-xs text-mec-pure/50 md:flex-row md:items-center">
          <p>
            © {new Date().getFullYear()} Minott Equipment & Chemicals Limited.
            Designed by FloPro Limited.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-mec-red">
              Privacy
            </Link>
            <Link href="#" className="hover:text-mec-red">
              Terms
            </Link>
          </div>
        </Container>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add minott-web/components/layout/Footer.tsx
git commit -m "feat(layout): footer with logo easter-egg pulse"
```

---

## Task 14: Page transition (diagonal curtain wipe) + page-load bar

**Files:**
- Create: `minott-web/components/layout/PageTransition.tsx`

- [ ] **Step 1: Create PageTransition.tsx**

```tsx
"use client";
import { useEffect, useState } from "react";

export function PageLoadCurtain() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 1200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className={`page-loader ${done ? "is-done" : ""}`} aria-hidden>
      <div className="page-loader__bar" />
    </div>
  );
}
```

This is the minimal version that satisfies the source brief's "Loading state" spec: black screen + red bar growing left-to-right, then page reveals. Internal page-to-page transitions are out of scope (single route), but the curtain primitive is reusable later.

- [ ] **Step 2: Commit**

```bash
git add minott-web/components/layout/PageTransition.tsx
git commit -m "feat(layout): initial page-load red bar curtain"
```

---

## Task 15: Compose root layout with providers, write page.tsx skeleton

**Files:**
- Modify: `minott-web/app/layout.tsx`
- Modify: `minott-web/app/page.tsx`

- [ ] **Step 1: Update layout.tsx to wire providers + nav + footer**

Replace the body of `app/layout.tsx` (keep font and metadata declarations from Task 3) so the JSX becomes:

```tsx
import { LenisProvider } from "@/components/motion/LenisProvider";
import { CustomCursor } from "@/components/motion/CustomCursor";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { PageLoadCurtain } from "@/components/layout/PageTransition";

// ... fonts + metadata from Task 3 stay above this ...

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${bebas.variable} ${montserrat.variable} ${jetbrains.variable}`}
    >
      <body className="bg-mec-pure text-mec-ink">
        <a href="#main" className="skip-to-content">
          Skip to content
        </a>
        <PageLoadCurtain />
        <CustomCursor />
        <ScrollProgress />
        <LenisProvider>
          <Nav />
          <main id="main">{children}</main>
          <Footer />
        </LenisProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Replace page.tsx with skeleton**

```tsx
import { Hero } from "@/components/sections/Hero";
import { TrustBar } from "@/components/sections/TrustBar";
import { ValuePillars } from "@/components/sections/ValuePillars";
import { DualPlay } from "@/components/sections/DualPlay";
import { ProductCategories } from "@/components/sections/ProductCategories";
import { IndustriesGrid } from "@/components/sections/IndustriesGrid";
import { NumbersBar } from "@/components/sections/NumbersBar";
import { FounderStory } from "@/components/sections/FounderStory";
import { QuoteCTA } from "@/components/sections/QuoteCTA";
import { LocationContact } from "@/components/sections/LocationContact";

export default function HomePage() {
  return (
    <>
      <span id="top" className="sr-only" />
      <Hero />
      <TrustBar />
      <ValuePillars />
      <DualPlay />
      <ProductCategories />
      <IndustriesGrid />
      <NumbersBar />
      <FounderStory />
      <QuoteCTA />
      <LocationContact />
    </>
  );
}
```

(The section components don't exist yet — `npm run dev` will fail until they're stubbed. Stub them in Step 3 so the page renders.)

- [ ] **Step 3: Create stub files for all 10 sections**

For each filename in:
- `components/sections/Hero.tsx`
- `components/sections/TrustBar.tsx`
- `components/sections/ValuePillars.tsx`
- `components/sections/DualPlay.tsx`
- `components/sections/ProductCategories.tsx`
- `components/sections/IndustriesGrid.tsx`
- `components/sections/NumbersBar.tsx`
- `components/sections/FounderStory.tsx`
- `components/sections/QuoteCTA.tsx`
- `components/sections/LocationContact.tsx`

Write a stub matching this template (replace `Hero` with the appropriate name):

```tsx
export function Hero() {
  return (
    <section className="min-h-[40vh] grid place-items-center bg-mec-mist">
      <p className="eyebrow text-mec-ink/40">Hero — coming next</p>
    </section>
  );
}
```

- [ ] **Step 4: Smoke check**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: nav bar visible (transparent over first section), 10 stub sections stack vertically, footer renders, custom cursor follows pointer on desktop, scroll progress bar grows at top. Reload should briefly show the black loader with red bar.

Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add minott-web/app/layout.tsx minott-web/app/page.tsx minott-web/components/sections/
git commit -m "feat(layout): wire providers + section stubs"
```

---

## Task 16: Hero section (signature SplitText choreography)

**Files:**
- Replace: `minott-web/components/sections/Hero.tsx`

- [ ] **Step 1: Replace Hero.tsx**

```tsx
"use client";
import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { motion, useScroll, useTransform } from "framer-motion";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { Button } from "@/components/primitives/Button";
import { Shield, Truck, Headphones } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText, DrawSVGPlugin);
}

const TRUST_ITEMS = [
  { icon: Shield, label: "Quality Products" },
  { icon: Truck, label: "Reliable Supply" },
  { icon: Headphones, label: "Expert Support" },
];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const imgWrapRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yImg = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const scaleImg = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const fadeText = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  useGSAP(
    () => {
      const line1 = document.querySelector(".hero-line-1");
      const line2 = document.querySelector(".hero-line-2");
      if (!line1 || !line2) return;

      const s1 = new SplitText(line1, { type: "chars" });
      const s2 = new SplitText(line2, { type: "chars" });

      gsap.set([s1.chars, s2.chars], { yPercent: 110 });
      gsap.set(".hero-eyebrow, .hero-lede, .hero-cta > *", {
        y: 24,
        opacity: 0,
      });
      gsap.set(".hero-trust > *", { y: 12, opacity: 0 });
      gsap.set(".hero-image-clip", { clipPath: "inset(0 0 100% 0)" });

      const tl = gsap.timeline({
        defaults: { ease: "expo.out" },
        delay: 0.3,
      });

      tl.to(".hero-eyebrow", { y: 0, opacity: 1, duration: 0.6 })
        .to(s1.chars, { yPercent: 0, stagger: 0.025, duration: 0.9 }, "-=0.3")
        .to(s2.chars, { yPercent: 0, stagger: 0.025, duration: 0.9 }, "-=0.7")
        .to(".hero-lede", { y: 0, opacity: 1, duration: 0.6 }, "-=0.5")
        .to(
          ".hero-cta > *",
          { y: 0, opacity: 1, stagger: 0.08, duration: 0.5 },
          "-=0.3",
        )
        .to(
          ".hero-trust > *",
          { y: 0, opacity: 1, stagger: 0.06, duration: 0.4 },
          "-=0.3",
        )
        .from(
          ".hero-sweep path",
          { drawSVG: "0%", duration: 1.4, ease: "power2.inOut" },
          0,
        )
        .to(
          ".hero-image-clip",
          { clipPath: "inset(0 0 0% 0)", duration: 1.2 },
          0.2,
        )
        .from(
          ".hero-image",
          { scale: 1.18, duration: 1.6, ease: "power2.out" },
          0.2,
        );

      return () => {
        s1.revert();
        s2.revert();
      };
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      className="relative min-h-[100svh] overflow-hidden bg-mec-pure"
    >
      {/* Background grid */}
      <div aria-hidden className="absolute inset-0 bg-grid opacity-60" />

      {/* Diagonal sweep across the boundary */}
      <svg
        aria-hidden
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        className="hero-sweep pointer-events-none absolute inset-0 h-full w-full"
      >
        <path
          d="M 0 760 L 1440 200"
          stroke="#E10600"
          strokeWidth="3"
          fill="none"
        />
      </svg>

      <div className="relative mx-auto grid min-h-[100svh] w-full max-w-[1440px] grid-cols-1 items-center gap-12 px-6 pt-32 pb-24 md:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <motion.div style={{ opacity: fadeText }} className="relative z-[2]">
          <p className="hero-eyebrow">
            <Eyebrow tone="red">
              Jamaica's Most Trusted Partner in Clean — Since 1990
            </Eyebrow>
          </p>

          <h1 className="mt-8 font-display-tight text-[clamp(3.5rem,8vw,7.5rem)] leading-[0.92]">
            <span className="hero-line-1 block overflow-hidden text-mec-ink">
              CLEANER SPACES.
            </span>
            <span className="hero-line-2 block overflow-hidden text-mec-red">
              STRONGER BUSINESS.
            </span>
          </h1>

          <p className="hero-lede mt-8 max-w-[52ch] text-[clamp(1.125rem,1.4vw,1.375rem)] leading-relaxed text-mec-ink/80">
            We power clean, safe, and productive spaces across Jamaica — with
            manufactured-on-island chemicals and elite-distributed equipment
            from 3M, NSS, San Jamar, Rubbermaid Commercial, and Purell.
          </p>

          <div className="hero-cta mt-10 flex flex-wrap items-center gap-4">
            <Button href="#contact" variant="primary" arrow>
              Request a Quote
            </Button>
            <Button href="#products" variant="ghost">
              See Our Products
            </Button>
          </div>

          <ul className="hero-trust mt-12 flex flex-wrap gap-x-8 gap-y-4">
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-mec-ink/70"
              >
                <Icon className="h-4 w-4 text-mec-red" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </motion.div>

        <div
          ref={imgWrapRef}
          className="hero-image-wrapper relative h-[480px] w-full overflow-hidden rounded-md md:h-[600px] lg:h-[680px]"
        >
          <div className="hero-image-clip absolute inset-0 overflow-hidden">
            <motion.div
              style={{ y: yImg, scale: scaleImg }}
              className="hero-image relative h-full w-full"
            >
              <Image
                src="/images/hero-main.jpg"
                alt="A worker pushes a Rubbermaid commercial cleaning cart down a warehouse aisle with a wet-floor caution sign in foreground"
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </motion.div>
          </div>

          {/* Floating Elite Distributor card */}
          <div className="absolute bottom-6 left-6 right-6 z-[2] flex items-center gap-3 rounded-md border border-white/15 bg-white/10 px-5 py-3 text-mec-pure backdrop-blur-lg md:bottom-8 md:left-8 md:right-auto">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-mec-red text-sm font-bold">
              ★
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">
                Elite Distributor
              </p>
              <p className="text-sm font-semibold">
                3M · NSS · San Jamar · Rubbermaid · Purell
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        aria-hidden
        className="absolute bottom-6 left-1/2 z-[2] flex -translate-x-1/2 flex-col items-center gap-2 text-mec-ink/50"
      >
        <span className="font-display text-xs tracking-[0.3em]">SCROLL</span>
        <span className="block h-10 w-px animate-[scrollLine_2s_ease-in-out_infinite] bg-mec-ink/40" />
      </div>

      <style jsx>{`
        @keyframes scrollLine {
          0% { transform: scaleY(0); transform-origin: top; }
          50% { transform: scaleY(1); transform-origin: top; }
          51% { transform-origin: bottom; }
          100% { transform: scaleY(0); transform-origin: bottom; }
        }
      `}</style>
    </section>
  );
}
```

- [ ] **Step 2: Smoke check**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected:
- Eyebrow lifts in first, then headline characters lift from underneath line-by-line
- "CLEANER SPACES." in black, "STRONGER BUSINESS." in red
- Diagonal red line draws across the screen during load
- Hero image clips down from the top with a slow zoom
- Floating Elite Distributor card visible bottom-left of the image
- On scroll, image parallaxes upward and text fades out around 60% scroll
- "SCROLL" indicator pulses at bottom-center

Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add minott-web/components/sections/Hero.tsx
git commit -m "feat(sections): cinematic hero with SplitText + sweep draw + parallax"
```

---

## Task 17: Trust Bar marquee

**Files:**
- Replace: `minott-web/components/sections/TrustBar.tsx`

- [ ] **Step 1: Replace TrustBar.tsx**

```tsx
"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Eyebrow } from "@/components/primitives/Eyebrow";

const BRANDS = [
  { name: "3M", file: "3m.svg", desc: "Safety, PPE, Adhesives" },
  { name: "NSS", file: "nss.svg", desc: "Industrial Floor Care" },
  { name: "San Jamar", file: "san-jamar.svg", desc: "Foodservice & Dispensing" },
  {
    name: "Rubbermaid Commercial",
    file: "rubbermaid.svg",
    desc: "Carts, Bins, Mop Systems",
  },
  { name: "Purell", file: "purell.svg", desc: "Hand Sanitization" },
];

export function TrustBar() {
  const trackRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useGSAP(
    () => {
      const track = trackRef.current;
      if (!track) return;
      tweenRef.current = gsap.to(track, {
        xPercent: -50,
        duration: 36,
        ease: "none",
        repeat: -1,
      });
    },
    { scope: trackRef },
  );

  const onEnter = (name: string) => {
    setHovered(name);
    tweenRef.current?.pause();
  };
  const onLeave = () => {
    setHovered(null);
    tweenRef.current?.play();
  };

  const items = [...BRANDS, ...BRANDS];

  return (
    <section id="trust" className="relative overflow-hidden bg-mec-mist py-12">
      <div className="mx-auto mb-6 w-full max-w-[1280px] px-6 md:px-10">
        <p className="text-center">
          <Eyebrow tone="ink">Proud Elite Distributor For</Eyebrow>
        </p>
      </div>

      <div className="relative">
        <div ref={trackRef} className="flex w-max items-center gap-16 px-8">
          {items.map((b, i) => {
            const isOther = hovered && hovered !== b.name;
            return (
              <div
                key={`${b.name}-${i}`}
                className="group relative flex h-20 w-56 shrink-0 items-center justify-center"
                onMouseEnter={() => onEnter(b.name)}
                onMouseLeave={onLeave}
                data-cursor={b.name}
              >
                <Image
                  src={`/brand-logos/${b.file}`}
                  alt={b.name}
                  width={224}
                  height={80}
                  className="h-full w-full text-mec-ink transition-all duration-300"
                  style={{
                    opacity: isOther ? 0.18 : hovered === b.name ? 1 : 0.55,
                    transform: hovered === b.name ? "scale(1.06)" : "scale(1)",
                    filter: hovered === b.name ? "none" : "grayscale(1)",
                  }}
                />
                <div
                  aria-hidden={hovered !== b.name}
                  className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-3 whitespace-nowrap rounded-md bg-mec-ink px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-mec-pure opacity-0 transition-all duration-200"
                  style={
                    hovered === b.name
                      ? { opacity: 1, transform: "translate(-50%, 0)" }
                      : undefined
                  }
                >
                  {b.desc}
                </div>
              </div>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-mec-mist to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-mec-mist to-transparent" />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Smoke check**

Run dev server. Expected: greyscale brand wordmarks scroll horizontally and seamlessly. Hover lifts one to full color + scale, dims the rest, and shows a tooltip. Marquee pauses while hovering.

- [ ] **Step 3: Commit**

```bash
git add minott-web/components/sections/TrustBar.tsx
git commit -m "feat(sections): trust bar marquee with hover dim + tooltip"
```

---

## Task 18: Value Pillars (3-up dark cards)

**Files:**
- Replace: `minott-web/components/sections/ValuePillars.tsx`

- [ ] **Step 1: Replace ValuePillars.tsx**

```tsx
"use client";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { motion } from "framer-motion";
import { Award, Truck, Headphones } from "lucide-react";

const PILLARS = [
  {
    icon: Award,
    title: "Quality Products",
    body: "Manufactured on-island. Distributed from the best in the world.",
  },
  {
    icon: Truck,
    title: "Reliable Supply",
    body: "Twice-weekly delivery to every major Jamaican city. 15+ overseas suppliers backing every order.",
  },
  {
    icon: Headphones,
    title: "Expert Support",
    body: "35 years of category knowledge. Our sales consultants walk every order through with you.",
  },
];

export function ValuePillars() {
  return (
    <Section tone="dark" id="why">
      <Container>
        <RevealOnScroll className="text-center">
          <p>
            <Eyebrow tone="red">Why MEC</Eyebrow>
          </p>
          <h2 className="mt-6 font-display-tight text-h2 text-mec-pure">
            Three things we promise.
          </h2>
        </RevealOnScroll>

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-3"
        >
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <motion.li
              key={title}
              variants={{
                hidden: { opacity: 0, y: 32 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.6,
                    ease: [0.16, 1, 0.3, 1],
                  },
                },
              }}
              className="group relative overflow-hidden rounded-md border border-white/10 p-10 transition-all duration-300 hover:-translate-y-2 hover:border-white/30 hover:shadow-[0_24px_48px_-12px_rgba(225,6,0,0.25)]"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-1 -z-[1] origin-top-left rotate-[24deg] bg-mec-red opacity-0 transition-opacity duration-500 group-hover:opacity-[0.06]"
              />
              <Icon
                className="h-10 w-10 text-mec-red transition-transform duration-300 group-hover:rotate-[5deg] group-hover:scale-110"
                aria-hidden
              />
              <h3 className="mt-8 font-display text-3xl text-mec-pure">
                {title}
              </h3>
              <p className="mt-4 text-mec-pure/70">{body}</p>
            </motion.li>
          ))}
        </motion.ul>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 2: Smoke check + commit**

Run dev server, verify section renders dark with three cards. Hover lifts cards, icons rotate slightly, red diagonal tint appears behind.

```bash
git add minott-web/components/sections/ValuePillars.tsx
git commit -m "feat(sections): value pillars with hover lift + diagonal tint"
```

---

## Task 19: Dual-Play split-screen

**Files:**
- Replace: `minott-web/components/sections/DualPlay.tsx`

- [ ] **Step 1: Replace DualPlay.tsx**

```tsx
"use client";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { Eyebrow } from "@/components/primitives/Eyebrow";

export function DualPlay() {
  const [hover, setHover] = useState<"left" | "right" | null>(null);

  const flexLeft =
    hover === "left" ? 1.04 : hover === "right" ? 0.96 : 1;
  const flexRight =
    hover === "right" ? 1.04 : hover === "left" ? 0.96 : 1;

  return (
    <section className="relative flex min-h-[80vh] w-full flex-col overflow-hidden lg:flex-row">
      {/* Left: WE MAKE */}
      <motion.button
        type="button"
        animate={{ flex: flexLeft }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onMouseEnter={() => setHover("left")}
        onMouseLeave={() => setHover(null)}
        className="group relative flex min-h-[60vh] w-full items-end p-10 text-left text-mec-pure md:p-16 lg:min-h-[80vh] lg:w-1/2"
        data-cursor="We Make"
      >
        <Image
          src="/images/dualplay-manufacturing.jpg"
          alt="Inside a chemical manufacturing facility, stainless steel mixing vats and blue 55-gallon drums lined up"
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-mec-ink via-mec-ink/60 to-transparent" />
        <div className="relative max-w-md">
          <Eyebrow tone="white">We Make</Eyebrow>
          <h3 className="mt-4 font-display text-h3 leading-tight">
            Our Own Chemical Line.
          </h3>
          <p className="mt-4 text-sm text-mec-pure/80 md:text-base">
            Industrial and household formulations, mixed at our Kingston
            facility, tuned for Jamaican climate, regulations, and use cases.
          </p>
        </div>
      </motion.button>

      {/* Center red rule */}
      <motion.span
        aria-hidden
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
        className="hidden w-[4px] origin-top bg-mec-red lg:block"
      />

      {/* Right: WE DISTRIBUTE */}
      <motion.button
        type="button"
        animate={{ flex: flexRight }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onMouseEnter={() => setHover("right")}
        onMouseLeave={() => setHover(null)}
        className="group relative flex min-h-[60vh] w-full items-end p-10 text-left text-mec-pure md:p-16 lg:min-h-[80vh] lg:w-1/2 lg:justify-end"
        data-cursor="We Distribute"
      >
        <Image
          src="/images/dualplay-distribution.jpg"
          alt="A clean modern warehouse with palletized cardboard boxes stacked on industrial racking"
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-mec-ink via-mec-ink/50 to-transparent" />
        <div className="relative max-w-md lg:text-right">
          <Eyebrow tone="white" className="lg:flex-row-reverse">
            We Distribute
          </Eyebrow>
          <h3 className="mt-4 font-display text-h3 leading-tight">
            The World's Best Equipment.
          </h3>
          <p className="mt-4 text-sm text-mec-pure/80 md:text-base">
            Elite Distributor for 3M, NSS, San Jamar, Rubbermaid Commercial,
            and Purell — the brands that set global standards.
          </p>
        </div>
      </motion.button>
    </section>
  );
}
```

- [ ] **Step 2: Smoke check + commit**

Run dev. Expected: full-bleed split. Hover left grows the left, shrinks right (and vice versa). Vertical red line draws on entry. Both halves have darken-to-bottom gradient with type bottom-aligned.

```bash
git add minott-web/components/sections/DualPlay.tsx
git commit -m "feat(sections): dual-play split-screen with hover-driven flex"
```

---

## Task 20: Product Categories (horizontal-scroll pin — the signature motion piece)

**Files:**
- Replace: `minott-web/components/sections/ProductCategories.tsx`

- [ ] **Step 1: Replace ProductCategories.tsx**

```tsx
"use client";
import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { Button } from "@/components/primitives/Button";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const CARDS = [
  {
    img: "/images/product-chemicals.jpg",
    eyebrow: "01 / 04",
    title: "Formulated for Jamaica.",
    cat: "Industrial & Household Chemicals",
    items: ["Floor cleaners", "Disinfectants", "Degreasers", "Bleach", "Sanitizers"],
  },
  {
    img: "/images/product-janitorial.jpg",
    eyebrow: "02 / 04",
    title: "Built for the work.",
    cat: "Janitorial Equipment & Supplies",
    items: ["Vacuums", "Mops", "Carts", "Brooms", "Buckets", "Bins"],
  },
  {
    img: "/images/product-ppe.jpg",
    eyebrow: "03 / 04",
    title: "Protection that fits.",
    cat: "Personal Protection Equipment",
    items: ["Surgical gloves", "Nitrile", "Latex", "Masks", "Isolation gowns"],
  },
  {
    img: "/images/product-paper.jpg",
    eyebrow: "04 / 04",
    title: "Never run out.",
    cat: "Paper Products",
    items: ["Hand towels", "Jumbo roll", "Bathroom tissue", "Napkins", "Dispensers"],
  },
];

export function ProductCategories() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const section = sectionRef.current;
      const track = trackRef.current;
      const progress = progressRef.current;
      if (!section || !track || !progress) return;

      const totalScroll = () => track.scrollWidth - window.innerWidth;

      gsap.to(track, {
        x: () => -totalScroll(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${totalScroll()}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      gsap.to(progress, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${totalScroll()}`,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    },
    { scope: sectionRef, dependencies: [reduced] },
  );

  return (
    <section
      ref={sectionRef}
      id="products"
      className="relative bg-mec-ink text-mec-pure"
    >
      <div className="mx-auto w-full max-w-[1440px] px-6 pt-32 md:px-10">
        <p>
          <Eyebrow tone="red">Our Catalog</Eyebrow>
        </p>
        <h2 className="mt-6 font-display-tight text-h2">
          Four categories.{" "}
          <span className="text-mec-red">One supplier.</span>
        </h2>
        <p className="mt-4 max-w-2xl text-mec-pure/70">
          From hospital-grade disinfectant to bulk bathroom tissue, every line
          on this list ships from our Kingston floor or one of fifteen overseas
          partners — usually within forty-eight hours.
        </p>
      </div>

      {/* Progress bar */}
      <div className="mx-auto mt-12 w-full max-w-[1440px] px-6 md:px-10">
        <div className="relative h-px w-full bg-mec-pure/15">
          <div
            ref={progressRef}
            className="absolute left-0 top-0 h-px w-full origin-left scale-x-0 bg-mec-red"
          />
        </div>
      </div>

      {/* Mobile fallback: native horizontal snap carousel */}
      <div className="mt-12 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-16 md:hidden">
        {CARDS.map((c) => (
          <ProductCard key={c.cat} {...c} />
        ))}
      </div>

      {/* Desktop: pinned horizontal scroll */}
      <div className="hidden overflow-hidden pb-24 md:block">
        <div
          ref={trackRef}
          className="mt-12 flex gap-10 pl-[max(2.5rem,calc((100vw-1440px)/2+2.5rem))] pr-[10vw] will-change-transform"
        >
          {CARDS.map((c) => (
            <ProductCard key={c.cat} {...c} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({
  img,
  eyebrow,
  title,
  cat,
  items,
}: {
  img: string;
  eyebrow: string;
  title: string;
  cat: string;
  items: string[];
}) {
  return (
    <article
      className="group relative flex h-[68vh] w-[88vw] shrink-0 snap-start overflow-hidden rounded-md md:h-[78vh] md:w-[78vw] md:max-w-[1080px]"
      data-cursor="View"
    >
      <Image
        src={img}
        alt={cat}
        fill
        sizes="(min-width: 768px) 78vw, 88vw"
        className="object-cover transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-mec-ink via-mec-ink/40 to-transparent" />
      <div className="relative z-[2] flex w-full flex-col justify-between p-8 md:p-12">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-mec-red">
            {eyebrow}
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-mec-pure/60">
            {cat}
          </span>
        </div>
        <div className="max-w-xl">
          <h3 className="font-display-tight text-[clamp(2.5rem,5vw,5rem)] leading-[0.95] text-mec-pure">
            {title}
          </h3>
          <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-mec-pure/80">
            {items.map((i) => (
              <li
                key={i}
                className="inline-flex items-center after:ml-4 after:h-1 after:w-1 after:rounded-full after:bg-mec-red last:after:hidden"
              >
                {i}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Button href="#contact" variant="ghost-dark" arrow>
              View Products
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Smoke check + commit**

Run dev, scroll into the section. Expected: section pins to viewport top, cards translate horizontally as you scroll. Progress bar fills left-to-right. On mobile (narrow viewport), cards scroll natively horizontally with snap.

```bash
git add minott-web/components/sections/ProductCategories.tsx
git commit -m "feat(sections): product categories with pinned horizontal scroll"
```

---

## Task 21: Industries Grid (3×3 interactive)

**Files:**
- Replace: `minott-web/components/sections/IndustriesGrid.tsx`

- [ ] **Step 1: Replace IndustriesGrid.tsx**

```tsx
"use client";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Hotel,
  Stethoscope,
  Factory,
  Landmark,
  Antenna,
  Music,
  ShoppingBag,
  Brush,
  SprayCan,
  ArrowRight,
} from "lucide-react";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

const TILES = [
  { name: "Hospitality", icon: Hotel, img: "industry-hospitality.jpg" },
  { name: "Medical", icon: Stethoscope, img: "industry-medical.jpg" },
  { name: "Manufacturing", icon: Factory, img: "industry-manufacturing.jpg" },
  { name: "Financial", icon: Landmark, img: "industry-financial.jpg" },
  { name: "Telecoms", icon: Antenna, img: "industry-telecoms.jpg" },
  { name: "Entertainment", icon: Music, img: "industry-entertainment.jpg" },
  { name: "Retail", icon: ShoppingBag, img: "industry-retail.jpg" },
  { name: "Janitorial", icon: Brush, img: "industry-janitorial.jpg" },
  { name: "Sanitation", icon: SprayCan, img: "industry-sanitation.jpg" },
];

export function IndustriesGrid() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <Section tone="mist" id="industries">
      <Container>
        <RevealOnScroll className="text-center">
          <p>
            <Eyebrow tone="red">Who We Serve</Eyebrow>
          </p>
          <h2 className="mt-6 font-display-tight text-h2">
            Nine industries. <span className="text-mec-red">One standard.</span>
          </h2>
        </RevealOnScroll>

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          className="mt-16 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4"
        >
          {TILES.map(({ name, icon: Icon, img }) => {
            const isActive = active === name;
            const isOther = active && !isActive;
            return (
              <motion.li
                key={name}
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                  },
                }}
                onMouseEnter={() => setActive(name)}
                onMouseLeave={() => setActive(null)}
                className="relative aspect-square overflow-hidden rounded-md transition-opacity duration-300"
                style={{ opacity: isOther ? 0.35 : 1 }}
                data-cursor={name}
              >
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.04 : 1,
                  }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="relative h-full w-full"
                >
                  <Image
                    src={`/images/${img}`}
                    alt={name}
                    fill
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover transition-all duration-500"
                    style={{
                      filter: isActive ? "grayscale(1) brightness(0.6)" : "grayscale(0.3)",
                      opacity: isActive ? 0.35 : 0.55,
                    }}
                  />
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: isActive ? "#E10600" : "#FFFFFF",
                      color: isActive ? "#FFFFFF" : "#0D0D0D",
                    }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 mix-blend-multiply"
                    style={{ opacity: isActive ? 0.92 : 0 }}
                  />
                  <div className="relative flex h-full flex-col justify-between p-5 md:p-7">
                    <div className="flex items-start justify-between">
                      <Icon
                        className={`h-6 w-6 transition-colors ${isActive ? "text-mec-pure" : "text-mec-ink"}`}
                        aria-hidden
                      />
                      <motion.div
                        initial={false}
                        animate={{ x: isActive ? 0 : 8, opacity: isActive ? 1 : 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <ArrowRight className="h-5 w-5 text-mec-pure" aria-hidden />
                      </motion.div>
                    </div>
                    <h3
                      className={`font-display text-3xl md:text-4xl ${isActive ? "text-mec-pure" : "text-mec-ink"}`}
                    >
                      {name}
                    </h3>
                  </div>
                </motion.div>
              </motion.li>
            );
          })}
        </motion.ul>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 2: Smoke check + commit**

Run dev. Expected: 3×3 grid (2-col on mobile). Hover a tile: it goes red with white text, arrow slides in. Other tiles dim.

```bash
git add minott-web/components/sections/IndustriesGrid.tsx
git commit -m "feat(sections): industries grid with hover invert + arrow slide"
```

---

## Task 22: Numbers Bar (animated counters with ghost numerals)

**Files:**
- Replace: `minott-web/components/sections/NumbersBar.tsx`

- [ ] **Step 1: Replace NumbersBar.tsx**

```tsx
"use client";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { AnimatedNumber } from "@/components/primitives/AnimatedNumber";

const STATS = [
  { value: 35, suffix: "+", label: "Years building Jamaica's clean standard" },
  { value: 15, suffix: "+", label: "Suppliers across the U.S. and China" },
  { value: 5, suffix: "", label: "Global Elite brands under one roof" },
  { value: 8, suffix: "", label: "Cities with twice-weekly delivery" },
];

export function NumbersBar() {
  return (
    <Section tone="dark">
      <Container>
        <ul className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <li
              key={s.label}
              className={`relative flex flex-col items-start ${
                i < STATS.length - 1
                  ? "lg:border-r lg:border-mec-pure/10 lg:pr-8"
                  : ""
              }`}
            >
              <div className="relative">
                <span
                  aria-hidden
                  className="absolute -left-3 -top-3 select-none font-display text-[clamp(6rem,10vw,9rem)] leading-none text-mec-pure/[0.06]"
                  style={{ transform: "scale(1.3)" }}
                >
                  {s.value}
                </span>
                <span className="relative block font-display text-[clamp(4.5rem,7vw,6.5rem)] leading-none text-mec-red">
                  <AnimatedNumber to={s.value} suffix={s.suffix} />
                </span>
              </div>
              <p className="mt-5 max-w-[18ch] text-sm font-semibold uppercase tracking-[0.16em] text-mec-pure/80">
                {s.label}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 2: Smoke check + commit**

Scroll into section. Numbers count up from 0. Ghost numeral sits behind in dim red. Vertical rules between on desktop.

```bash
git add minott-web/components/sections/NumbersBar.tsx
git commit -m "feat(sections): numbers bar with count-up + ghost numerals"
```

---

## Task 23: Founder Story (editorial reveal)

**Files:**
- Replace: `minott-web/components/sections/FounderStory.tsx`

- [ ] **Step 1: Replace FounderStory.tsx**

```tsx
"use client";
import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";

const PARAS = [
  "Thirty-five years ago, Chester G. Minott opened the doors of a small equipment distribution shop in Kingston with a single conviction: that Jamaican businesses deserved the same caliber of cleaning, sanitation, and chemical supplies as any company in Miami, Atlanta, or Toronto.",
  "That conviction built MEC into Jamaica's largest supplier of chemicals — the country's go-to manufacturer for industrial and household formulations, and the Elite Distributor of choice for 3M, NSS, San Jamar, Rubbermaid Commercial Solutions, and Purell.",
  "Three and a half decades later, we still answer to one standard: the work we deliver should let our clients run their businesses without ever having to think about ours.",
];

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText, ScrollTrigger);
}

export function FounderStory() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const lines = gsap.utils.toArray<HTMLElement>(".founder-line");
      const splits = lines.map(
        (el) => new SplitText(el, { type: "lines", linesClass: "split-line" }),
      );
      const allLines = splits.flatMap((s) => s.lines);

      gsap.set(allLines, { yPercent: 110 });
      gsap.set(".founder-image-clip", { clipPath: "inset(0 100% 0 0)" });

      ScrollTrigger.create({
        trigger: ref.current,
        start: "top 65%",
        once: true,
        onEnter: () => {
          const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
          tl.to(".founder-image-clip", {
            clipPath: "inset(0 0% 0 0)",
            duration: 1.2,
          })
            .to(
              ".founder-eyebrow, .founder-h2",
              { y: 0, opacity: 1, duration: 0.6, stagger: 0.1 },
              "-=0.8",
            )
            .to(
              allLines,
              { yPercent: 0, duration: 0.8, stagger: 0.05 },
              "-=0.4",
            );
        },
      });

      gsap.set(".founder-eyebrow, .founder-h2", { y: 24, opacity: 0 });

      return () => splits.forEach((s) => s.revert());
    },
    { scope: ref },
  );

  return (
    <Section id="founder" tone="light">
      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1fr] lg:gap-20">
          <div className="founder-image-wrap relative aspect-[4/5] w-full overflow-hidden rounded-md bg-mec-mist">
            <div className="founder-image-clip absolute inset-0">
              <Image
                src="/images/founder-portrait.jpg"
                alt="Portrait of the Minott Chemicals founder inside the company's facility"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-mec-red/15 mix-blend-multiply" />
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <p className="founder-eyebrow">
              <Eyebrow tone="red">The Founder</Eyebrow>
            </p>
            <h2 className="founder-h2 mt-6 font-display-tight text-h2">
              Chester G. Minott started with one truck and a standard.
            </h2>
            <div className="mt-10 space-y-6 text-lg leading-relaxed text-mec-ink/80">
              {PARAS.map((p, i) => (
                <p key={i} className="founder-line overflow-hidden">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 2: Smoke check + commit**

Scroll into section. Founder image wipes in horizontally. Eyebrow + headline rise. Each paragraph reveals line-by-line.

```bash
git add minott-web/components/sections/FounderStory.tsx
git commit -m "feat(sections): founder story with image wipe + line-by-line reveal"
```

---

## Task 24: Quote CTA with paint-roller fill + demo form

**Files:**
- Replace: `minott-web/components/sections/QuoteCTA.tsx`

- [ ] **Step 1: Replace QuoteCTA.tsx**

```tsx
"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Container } from "@/components/primitives/Container";
import { Button } from "@/components/primitives/Button";

export function QuoteCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", need: "" });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };
  const reset = () => {
    setForm({ name: "", company: "", need: "" });
    setSubmitted(false);
  };

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="relative overflow-hidden bg-mec-ink py-[var(--spacing-section-y)] text-mec-pure"
    >
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        className="absolute inset-0 origin-left bg-mec-red"
      />

      <Container className="relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.7, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mec-pure/80">
            ★ Request a Quote
          </p>

          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key="form"
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="mt-6 max-w-4xl font-display-tight text-[clamp(3rem,7vw,7rem)] leading-[0.95] text-mec-pure">
                  Your space. Our standard.
                </h2>
                <p className="mt-6 max-w-2xl text-lg text-mec-pure/90">
                  Tell us what you need clean. We'll quote it within one
                  business day.
                </p>

                <form
                  onSubmit={onSubmit}
                  className="mt-12 grid max-w-3xl grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2"
                >
                  <Field
                    label="Name"
                    value={form.name}
                    onChange={(v) => setForm({ ...form, name: v })}
                    required
                  />
                  <Field
                    label="Company"
                    value={form.company}
                    onChange={(v) => setForm({ ...form, company: v })}
                    required
                  />
                  <Field
                    label="What do you need?"
                    value={form.need}
                    onChange={(v) => setForm({ ...form, need: v })}
                    textarea
                    required
                    className="md:col-span-2"
                  />
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="group inline-flex items-center gap-3 bg-mec-pure px-8 py-4 font-semibold uppercase tracking-[0.14em] text-mec-red transition-transform duration-200 hover:bg-mec-ink hover:text-mec-pure active:scale-[0.97]"
                      data-cursor="Send"
                    >
                      Send My Quote Request
                      <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">
                        →
                      </span>
                    </button>
                    <p className="mt-6 text-sm text-mec-pure/80">
                      Or call us directly:{" "}
                      <a
                        href="tel:+18769295284"
                        className="font-semibold underline-offset-4 hover:underline"
                        data-cursor="Call"
                      >
                        (876) 929-5284
                      </a>
                    </p>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <h2 className="mt-6 max-w-4xl font-display-tight text-[clamp(2.5rem,6vw,6rem)] leading-[0.95] text-mec-pure">
                  Got it. A sales consultant will call you within one business
                  day.
                </h2>
                <button
                  type="button"
                  onClick={reset}
                  className="mt-10 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-mec-pure/80 underline-offset-4 hover:text-mec-pure hover:underline"
                >
                  ← Send another
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Container>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  textarea,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  textarea?: boolean;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;
  const floating = focused || hasValue;
  const id = `qcf-${label.replace(/\s+/g, "-").toLowerCase()}`;

  const baseInput =
    "peer w-full border-b-2 bg-transparent pb-2 pt-5 text-mec-pure outline-none transition-colors placeholder-transparent";
  const borderCls = focused
    ? "border-mec-pure"
    : "border-mec-pure/40";

  return (
    <div className={`relative ${className ?? ""}`}>
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-0 top-5 origin-left text-sm font-semibold uppercase tracking-[0.14em] text-mec-pure/80 transition-all duration-200"
        style={{
          transform: floating
            ? "translateY(-22px) scale(0.85)"
            : "translateY(0) scale(1)",
        }}
      >
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      {textarea ? (
        <textarea
          id={id}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={3}
          className={`${baseInput} ${borderCls} resize-none`}
          placeholder=" "
        />
      ) : (
        <input
          id={id}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`${baseInput} ${borderCls}`}
          placeholder=" "
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Smoke check + commit**

Scroll into section. Red paint-roller fills left-to-right. Type fades in. Labels float on focus / when value is set. Bottom border thickens. Submit collapses form → confirmation. "Send another" link resets the form.

```bash
git add minott-web/components/sections/QuoteCTA.tsx
git commit -m "feat(sections): quote CTA with paint-roller fill + floating-label form"
```

---

## Task 25: Location & Contact (custom SVG map + info card)

**Files:**
- Replace: `minott-web/components/sections/LocationContact.tsx`

- [ ] **Step 1: Replace LocationContact.tsx**

```tsx
"use client";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { Button } from "@/components/primitives/Button";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Printer } from "lucide-react";

const DIRECTIONS_HREF =
  "https://www.google.com/maps/dir/?api=1&destination=14.5+Retirement+Road,+Kingston+5,+Jamaica";

export function LocationContact() {
  return (
    <Section tone="light" pad>
      <Container>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <BrandedMap />

          <div className="flex flex-col justify-center">
            <p>
              <Eyebrow tone="red">Find Us</Eyebrow>
            </p>
            <h2 className="mt-6 font-display-tight text-h2">
              14½ Retirement Road. <br />
              <span className="text-mec-red">Kingston 5.</span>
            </h2>

            <ul className="mt-10 space-y-5 text-mec-ink/85">
              <InfoRow icon={MapPin}>
                14½ Retirement Road, Kingston 5, Jamaica
              </InfoRow>
              <InfoRow icon={Clock}>Mon–Fri, 8:00 AM – 4:30 PM</InfoRow>
              <InfoRow icon={Phone}>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {["+18769295284", "+18769293132", "+18769295147"].map(
                    (n, i) => (
                      <a
                        key={n}
                        href={`tel:${n}`}
                        className="font-semibold underline-offset-4 hover:text-mec-red hover:underline"
                        data-cursor="Call"
                      >
                        {(i === 0 && "(876) 929-5284") ||
                          (i === 1 && "929-3132") ||
                          (i === 2 && "929-5147")}
                      </a>
                    ),
                  )}
                </div>
              </InfoRow>
              <InfoRow icon={Printer}>Fax: (876) 929-5228</InfoRow>
              <InfoRow icon={Mail}>
                <a
                  href="mailto:sales@minottchem.com"
                  className="font-semibold underline-offset-4 hover:text-mec-red hover:underline"
                  data-cursor="Email"
                >
                  sales@minottchem.com
                </a>
              </InfoRow>
            </ul>

            <div className="mt-10">
              <Button
                href={DIRECTIONS_HREF}
                variant="primary"
                arrow
                external
              >
                Get Directions
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

function InfoRow({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-4">
      <span className="mt-1 inline-grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mec-red/10 text-mec-red">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="leading-relaxed">{children}</div>
    </li>
  );
}

function BrandedMap() {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-md bg-mec-ink text-mec-pure">
      <svg
        viewBox="0 0 600 600"
        className="absolute inset-0 h-full w-full"
        aria-label="Stylized map showing the Minott Chemicals location at 14 1/2 Retirement Road, Kingston 5, Jamaica"
        role="img"
      >
        {/* Subtle grid */}
        <defs>
          <pattern
            id="map-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="600" height="600" fill="url(#map-grid)" />

        {/* "Streets" */}
        <g stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none">
          <path d="M 0 180 L 600 220" />
          <path d="M 0 320 L 600 360" />
          <path d="M 0 460 L 600 500" />
          <path d="M 150 0 L 200 600" />
          <path d="M 360 0 L 410 600" />
        </g>

        {/* Highlighted Retirement Road */}
        <path
          d="M 0 340 L 600 380"
          stroke="rgba(225,6,0,0.4)"
          strokeWidth="3"
          fill="none"
        />
        <text
          x="40"
          y="332"
          fill="rgba(225,6,0,0.7)"
          fontSize="11"
          fontFamily="var(--font-mono), monospace"
          letterSpacing="2"
        >
          RETIREMENT ROAD
        </text>

        {/* Property block */}
        <rect
          x="280"
          y="350"
          width="40"
          height="32"
          fill="rgba(225,6,0,0.18)"
          stroke="rgba(225,6,0,0.5)"
          strokeWidth="1"
        />

        {/* Pin pulse */}
        <g>
          <circle cx="300" cy="360" r="22" fill="none" stroke="#E10600" strokeWidth="3">
            <animate
              attributeName="r"
              from="22"
              to="44"
              dur="2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              from="1"
              to="0"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="300" cy="360" r="10" fill="#E10600" />
          <circle cx="300" cy="360" r="3.5" fill="#FFFFFF" />
        </g>

        {/* Compass + label */}
        <text
          x="540"
          y="40"
          fill="rgba(255,255,255,0.5)"
          fontSize="10"
          fontFamily="var(--font-mono), monospace"
          letterSpacing="2"
          textAnchor="end"
        >
          18.0179° N · 76.7972° W
        </text>
      </svg>

      <motion.div
        initial={{ y: 12, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-6 left-6 right-6 rounded-md border border-white/15 bg-white/10 p-5 backdrop-blur-md"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-mec-pure/80">
          Minott Equipment & Chemicals
        </p>
        <p className="mt-1 font-display text-2xl">Kingston 5, Jamaica</p>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Smoke check + commit**

Scroll into section. Custom stylized SVG map appears dark with grid + faint streets + red Retirement Road line + pulsing pin. Info card overlaid. Right side shows contact details with tap-to-call links and "Get Directions" button.

```bash
git add minott-web/components/sections/LocationContact.tsx
git commit -m "feat(sections): location with custom SVG map + pulsing pin"
```

---

## Task 26: 404 page

**Files:**
- Create: `minott-web/app/not-found.tsx`

- [ ] **Step 1: Create not-found.tsx**

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-[80svh] place-items-center bg-mec-ink px-6 text-center text-mec-pure">
      <div className="max-w-xl">
        <p className="eyebrow text-mec-red">Error 404</p>
        <h1 className="mt-6 font-display-tight text-[clamp(4rem,12vw,9rem)] leading-[0.92]">
          Wrong aisle.
        </h1>
        <p className="mt-6 text-mec-pure/70">
          The page you're looking for isn't on this shelf. Let's get you back
          to clean.
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-mec-red underline-offset-4 hover:underline"
          data-cursor="Home"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Smoke + commit**

Navigate to `http://localhost:3000/nope`. Expected: "WRONG AISLE." page renders.

```bash
git add minott-web/app/not-found.tsx
git commit -m "feat(pages): 404 'wrong aisle'"
```

---

## Task 27: SEO + JSON-LD LocalBusiness schema

**Files:**
- Modify: `minott-web/app/layout.tsx`

- [ ] **Step 1: Add JSON-LD to layout.tsx**

Inside the `<body>` of `RootLayout`, just before `<a href="#main" ...>`, add:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "Minott Equipment & Chemicals Limited",
      image: "https://minottchem.com/og.jpg",
      url: "https://minottchem.com",
      telephone: "+1-876-929-5284",
      email: "sales@minottchem.com",
      priceRange: "$$",
      address: {
        "@type": "PostalAddress",
        streetAddress: "14 1/2 Retirement Road",
        addressLocality: "Kingston 5",
        addressCountry: "JM",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 18.0179,
        longitude: -76.7972,
      },
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
          ],
          opens: "08:00",
          closes: "16:30",
        },
      ],
      sameAs: ["https://facebook.com/minottchemicalsja"],
    }),
  }}
/>
```

- [ ] **Step 2: Commit**

```bash
git add minott-web/app/layout.tsx
git commit -m "feat(seo): LocalBusiness JSON-LD schema"
```

---

## Task 28: Reduced-motion audit

**Files:**
- Audit-only across all section components

- [ ] **Step 1: Toggle prefers-reduced-motion in browser devtools**

Chrome devtools → Rendering panel → Emulate CSS media feature `prefers-reduced-motion: reduce`. Reload.

- [ ] **Step 2: Verify each section's fallback**

For each section, confirm:
- Hero: image + text render in final state immediately (no SplitText animation, no parallax)
- Trust Bar: marquee static (paused)
- Value Pillars: cards visible without entrance animation
- Dual-Play: hover-scale interaction skipped
- Product Categories: pin disabled — `useReducedMotion` gates the GSAP setup, so the section becomes a normal vertical stack; mobile snap-carousel works on desktop too
- Numbers: numbers shown at final value (no count-up)
- Founder: image + text shown without wipe / line reveal
- Quote CTA: red fill is instant, no paint-roller
- Location: pulse SVG `<animate>` ignored under reduced motion (browser native handles this)
- Custom cursor: hidden
- Lenis: disabled

- [ ] **Step 3: Fix any sections that still animate**

For any GSAP-based section that doesn't already gate on `useReducedMotion`, add the same pattern used in `ProductCategories`:

```tsx
const reduced = useReducedMotion();
useGSAP(() => {
  if (reduced) return;
  // ...
}, { scope: ref, dependencies: [reduced] });
```

This applies to Hero, FounderStory if you didn't already gate them — add the guard.

- [ ] **Step 4: Commit**

```bash
git add minott-web/components/
git commit -m "fix(a11y): gate all GSAP timelines on prefers-reduced-motion"
```

---

## Task 29: Mobile audit

**Files:**
- Audit-only

- [ ] **Step 1: Open devtools responsive mode, test breakpoints**

Test at 375px (iPhone SE), 414px (iPhone 14 Pro), 768px (iPad portrait), 1024px (iPad landscape).

For each, verify:
- **Nav:** logo + hamburger only; tap hamburger opens full-screen overlay with staggered links; tapping outside or X closes it
- **Hero:** type stack stacks above image; CTAs wrap; trust icons wrap
- **Trust bar:** continues to scroll, items remain legible
- **Value Pillars:** stacks to 1 column
- **Dual-Play:** stacks vertically; red rule hides
- **Product Categories:** uses snap-x carousel (no pin); swipe to navigate
- **Industries Grid:** 2-col grid
- **Numbers:** stacks; vertical separator becomes horizontal
- **Founder Story:** image stacks above text
- **Quote CTA:** form fields stack
- **Location:** map stacks above info card
- **Footer:** columns collapse to one

- [ ] **Step 2: Fix any responsive bugs uncovered**

Common fixes: forgotten `md:` prefix, layout shifts at narrow widths, text overflow. Make focused edits per section.

- [ ] **Step 3: Commit**

```bash
git add minott-web/
git commit -m "fix(responsive): mobile audit pass across all sections"
```

---

## Task 30: Accessibility pass

**Files:**
- Audit + targeted fixes

- [ ] **Step 1: Keyboard navigation**

- Tab from page load: focus reaches "Skip to content" link first (visible).
- Tab continues through nav links, CTA, then into main content.
- All interactive elements have visible focus rings (2px red, offset 2px).
- The mobile nav button is reachable, `aria-expanded` flips correctly.
- Form fields are tabbable in logical order; submit reachable via Tab + Enter.

- [ ] **Step 2: Screen-reader smoke (VoiceOver on macOS or NVDA on Windows)**

- Headings linearize H1 → H2 → H3 with no skips.
- Each image has descriptive alt text.
- Map SVG announces its `aria-label`.
- Form labels announce; required state announces.

- [ ] **Step 3: Contrast verification**

Open Chrome devtools → Lighthouse → Accessibility audit. Expected: ≥ 95 score. Address any low-contrast warnings (target: white on red = 5.27:1, already verified).

- [ ] **Step 4: Commit any fixes**

```bash
git add minott-web/
git commit -m "fix(a11y): WCAG 2.2 AA pass — tab order, alt text, contrast"
```

---

## Task 31: Performance / Lighthouse pass

**Files:**
- Audit + targeted fixes

- [ ] **Step 1: Build production bundle**

```bash
npm run build
npm run start
```

- [ ] **Step 2: Run Lighthouse on `http://localhost:3000`**

Chrome devtools → Lighthouse → Mobile + Desktop. Target: ≥ 95 across Performance, Accessibility, Best Practices, SEO. LCP < 1.8s. CLS < 0.05.

- [ ] **Step 3: Address common regressions**

If Performance < 95:
- Verify Hero image has `priority` (it does, from Task 16)
- Ensure no images are missing `width`/`height` or `fill` + `sizes` (CLS)
- Move non-critical scripts (e.g., GSAP plugins) to dynamic imports if they're bloating initial JS
- Consider `next/dynamic({ ssr: false })` wrapping for `ProductCategories` and `LocationContact` if first-paint JS is over budget

If SEO < 95: meta description present, alt text on every image, link text descriptive.

- [ ] **Step 4: Commit**

```bash
git add minott-web/
git commit -m "perf: Lighthouse pass — LCP, CLS, dynamic imports"
```

---

## Task 32: Cross-browser smoke

**Files:**
- Audit-only

- [ ] **Step 1: Test in each browser**

Open the dev / build URL in:
- Chrome (desktop)
- Safari (desktop)
- Firefox (desktop)
- Edge (desktop)
- iOS Safari (real device or simulator)
- Chrome Android (real device or emulator)

For each, run through the page top to bottom and confirm:
- Hero motion plays smoothly
- Marquee scrolls without jank
- Pinned horizontal scroll works (desktop); snap carousel works (mobile)
- Custom cursor hides on touch
- Form submits to demo success state
- Map renders correctly (SVG animations supported in all targeted browsers)

- [ ] **Step 2: Patch any browser-specific bugs**

Common issues:
- Safari clip-path with inset: ensure no fractional offsets cause jitter
- iOS Safari 100vh vs 100svh: hero uses `100svh` (correct)

- [ ] **Step 3: Commit**

```bash
git add minott-web/
git commit -m "fix(compat): cross-browser smoke pass"
```

---

## Task 33: Final report + handoff

**Files:**
- Create: `docs/handoff/2026-05-27-minott-demo-handoff.md`

- [ ] **Step 1: Take final screenshots**

While dev server is running, take a screenshot of each section at desktop + mobile breakpoints. Save under `docs/handoff/screenshots/`.

```bash
mkdir -p /home/liamd/Work/github/Minott/docs/handoff/screenshots
```

(Screenshot mechanism is human-driven or via Playwright if available — not in scope for automation here. Manual screenshots are fine for a demo handoff.)

- [ ] **Step 2: Write the handoff doc**

```bash
cat > /home/liamd/Work/github/Minott/docs/handoff/2026-05-27-minott-demo-handoff.md
```

The handoff should cover:
- What's built (link to live preview URL if deployed to Vercel)
- Open items for the client (real founder photo, branded SVGs that landed as wordmark fallbacks, Phase 2 add-ons)
- How to run locally (`cd minott-web && npm install && npm run dev`)
- How to deploy to Vercel (push to GitHub, import in Vercel dashboard)
- Lighthouse scores from Task 31
- Section 14 verification gate status — all checked

- [ ] **Step 3: Final verification gate from spec Section 8**

Walk the checklist:
- [ ] Lighthouse ≥ 95 across all four pillars
- [ ] LCP < 1.8s on 4G
- [ ] CLS < 0.05
- [ ] No layout shift on font load
- [ ] Tested on a real mobile device
- [ ] Phone numbers tap-to-call
- [ ] Form submits visually with success + reset
- [ ] Reduced motion verified in OS settings
- [ ] Keyboard nav pass
- [ ] Screen reader smoke
- [ ] Cross-browser smoke
- [ ] Deployable to Vercel preview URL

- [ ] **Step 4: Commit**

```bash
git add docs/handoff/
git commit -m "docs: handoff doc + final verification gate"
```

---

## Self-review notes (per writing-plans skill)

**Spec coverage:** Every spec section maps to a task above —
- Spec §1 (Scope) → Tasks 16-25 (sections) + 26 (404)
- Spec §2 (Stack) → Task 1 (scaffold + deps)
- Spec §3 (File structure) → enforced across Tasks 1, 4, 7-15
- Spec §4 (Architecture: tokens, motion org, reduced-motion, perf, a11y) → Tasks 2, 4, 7, 28, 30, 31
- Spec §5 (Image asset wiring) → Task 5
- Spec §6 (Section build order) → Tasks 16-25 in spec-defined order
- Spec §7 (Deltas: custom map, JPG format, founder fallback, demo form, GSAP plugins, single-route, JSON-LD, brand-logo fallbacks, no tests, desktop-only cursor) → all called out inline in their respective tasks
- Spec §8 (Verification gate) → Task 33
- Spec §9 (Open items for client) → Task 33 handoff doc

**Placeholder scan:** No "TBD", "TODO" placeholders in the actionable steps. All code blocks contain real, runnable code. Audit-style tasks (28-33) deliberately don't have code blocks since they are verification passes — the work is in running browser tools and noting fixes.

**Type / API consistency:** `useReducedMotion()` is used consistently across `LenisProvider`, `CustomCursor`, `ProductCategories`, and (per Task 28) Hero + FounderStory. `Eyebrow`, `Section`, `Container` props are stable across all sections.

---

**End of plan.**
