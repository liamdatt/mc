# Minott Chemicals Homepage — Design Spec (Demo Build)

**Date:** 2026-05-27
**Client:** Minott Equipment & Chemicals Limited (MEC)
**Agency:** FloPro Limited
**Scope:** Single-route homepage demo build for client signoff. No backend, CMS, or analytics in this phase.
**Source brief:** `Minott_Chemicals_Design_Prompt.md` (640 lines, locked spec)
**Source assets:** `Minott_Chemicals_Image_Assets.md` + 18 numbered PNGs in `/assets/`
**Brand kit:** `Minott Brand Kit.png`

This document captures the agreed scope, architecture, and deltas from the source brief. The source brief is authoritative for visual and motion direction; this spec records only architectural decisions and explicit changes.

---

## 1. Scope

Build the full homepage end-to-end in a single push: all 11 sections from hero through footer, including:

- Cinematic hero with SplitText character reveal, parallax, diagonal sweep
- Trust Bar marquee (Elite Distributor logos)
- Value Pillars (3-up dark)
- Dual-Play split-screen (manufacturer + distributor)
- Product Categories horizontal-scroll pin (the signature motion piece)
- Industries Grid (3×3 interactive)
- Numbers Bar (animated counters)
- Founder Story (editorial)
- Quote CTA (paint-roller fill + demo form)
- Location & Contact (custom SVG map — no Mapbox)
- Footer with logo easter-egg

Plus: custom cursor, Lenis smooth scroll, page-transition curtain wipe, scroll progress bar, reduced-motion fallbacks, mobile audit, Lighthouse pass, 404 page.

**Out of scope (Phase 2 add-ons):** real form delivery, CMS, analytics, sitemap submission, DNS cutover, separate product/industry/about routes.

---

## 2. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 (CSS-first config) + CSS variables for tokens |
| Primary animation | Framer Motion (`motion/react`) |
| Heavy choreography | GSAP 3.13+ with ScrollTrigger, SplitText, DrawSVGPlugin (all free post-Webflow acquisition) |
| GSAP React binding | `@gsap/react` (`useGSAP`) |
| Smooth scroll | Lenis (root provider) |
| Icons | `lucide-react` + custom SVG line set |
| Package manager | npm |
| Hosting target | Vercel (preview URL for client walkthrough) |

No Mapbox. No backend libraries. No analytics packages installed in this phase.

---

## 3. File structure

```
minott-web/
├── app/
│   ├── layout.tsx               // root: fonts, providers, cursor, scroll progress
│   ├── page.tsx                 // composes the 11 sections
│   ├── globals.css              // tokens, base, utility helpers
│   └── not-found.tsx            // 404 "WRONG AISLE"
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
│   ├── tokens.ts                // TS mirror of CSS variables for JS-driven motion
│   ├── motion.ts                // shared easing curves, durations, Framer variants
│   └── use-reduced-motion.ts    // wrapper around prefers-reduced-motion
├── public/
│   ├── images/                  // semantic-named JPGs (renamed from /assets)
│   ├── brand-logos/             // 3M / NSS / San Jamar / Rubbermaid / Purell SVGs
│   └── svg/                     // diagonal sweeps, grid, custom icons, map
├── next.config.ts
├── tailwind.config.ts           // minimal — v4 is CSS-first
├── tsconfig.json
└── package.json
```

---

## 4. Architectural decisions

### Tokens
- Defined once in `app/globals.css` as CSS custom properties at `:root` (colors, easing curves, type scale via `clamp()`, spacing scale `8 / 16 / 24 / 32 / 48 / 64 / 96 / 128 / 192`, radii, shadows).
- Mirrored in `lib/tokens.ts` for JS-driven values (GSAP timelines, Framer values). Single source of truth — never duplicate values.
- Tailwind v4 reads them via `@theme` in CSS so utilities like `bg-mec-red`, `text-mec-ink` work without a separate JS config.

### Motion organization
- Each section component owns its own animations. No global motion controller.
- All GSAP timelines wrapped in `useGSAP({ scope: ref })` for safe cleanup under React strict mode.
- `LenisProvider` at the root binds `lenis.on('scroll', ScrollTrigger.update)` and calls `ScrollTrigger.refresh()` on load + resize.
- Shared easing curves and durations live in `lib/motion.ts`. Reuse, don't redefine.

### Reduced motion
- `useReducedMotion` hook reads `prefers-reduced-motion: reduce`.
- When reduced:
  - Lenis is disabled (`new Lenis({ smooth: false })` or skip provider).
  - Custom cursor unmounts.
  - All GSAP timelines are skipped — sections render in their final state via Tailwind classes.
  - Marquee is paused.
  - Horizontal-scroll pin becomes a vertical stack of cards.
  - Parallax is disabled.

### Performance
- Targets: LCP < 1.8s on 4G, CLS < 0.05, Lighthouse ≥ 95 across all four pillars, total initial JS < 200KB gzipped.
- Heavy components (`ProductCategories`, `LocationContact`) are `next/dynamic` with SSR off where appropriate.
- All images use Next.js `<Image>` with `placeholder="blur"` blur-up, AVIF/WebP auto, explicit width/height to prevent CLS.
- Fonts via `next/font/google` with `display: swap` and `size-adjust` to prevent layout shift on font load.

### Accessibility (WCAG 2.2 AA)
- Skip-to-content link in root layout.
- All interactive elements have `:focus-visible` 2px red ring at 2px offset.
- Heading hierarchy strictly linear (H1 → H2 → H3, no skips).
- All images have descriptive alt text.
- Form fields have explicit `<label>` and `aria-describedby` for error states.
- Color is never the sole carrier of meaning (icon + text accompany state colors).
- Custom SVG map has a text alternative listing address + a "Get Directions" link.

---

## 5. Image asset wiring

The 18 PNGs in `/assets/` are AI-generated placeholders matching the spec in `Minott_Chemicals_Image_Assets.md`.

**Renamed and copied into `/public/images/`** with semantic names:

| Source | Destination |
|---|---|
| `assets/1.png` | `public/images/hero-main.jpg` |
| `assets/2.png` | `public/images/hero-trust-card.jpg` |
| `assets/3.png` | `public/images/dualplay-manufacturing.jpg` |
| `assets/4.png` | `public/images/dualplay-distribution.jpg` |
| `assets/5.png` | `public/images/product-chemicals.jpg` |
| `assets/6.png` | `public/images/product-janitorial.jpg` |
| `assets/7.png` | `public/images/product-ppe.jpg` |
| `assets/8.png` | `public/images/product-paper.jpg` |
| `assets/9.png` | `public/images/industry-hospitality.jpg` |
| `assets/10.png` | `public/images/industry-medical.jpg` |
| `assets/11.png` | `public/images/industry-manufacturing.jpg` |
| `assets/12.png` | `public/images/industry-financial.jpg` |
| `assets/13.png` | `public/images/industry-telecoms.jpg` |
| `assets/14.png` | `public/images/industry-entertainment.jpg` |
| `assets/15.png` | `public/images/industry-retail.jpg` |
| `assets/16.png` | `public/images/industry-janitorial.jpg` |
| `assets/17.png` | `public/images/industry-sanitation.jpg` |
| `assets/18.png` | `public/images/founder-portrait.jpg` |

PNGs are converted to optimized JPGs during copy (or Next.js Image will produce AVIF/WebP variants at request time). Originals are retained in `/assets/` for reference.

**Brand logos** (`/public/brand-logos/`): monochrome SVG sourced from each brand's press kit / official assets — `3m.svg`, `nss.svg`, `san-jamar.svg`, `rubbermaid.svg`, `purell.svg`. Any logo that can't be reliably sourced falls back to a Bebas Neue all-caps wordmark; fallbacks are flagged in the final report.

---

## 6. Section build order

Sequenced to de-risk the hardest motion pieces first.

1. **Foundation** — scaffold, fonts, tokens, providers (Lenis, cursor, scroll progress), `Nav`, `Footer`, primitives (`Button`, `Container`, `Section`, `Eyebrow`, `Card`), `PageTransition`, asset rename/copy, brand-logo sourcing
2. **Hero** — signature SplitText choreography, diagonal SVG sweep draw, image clip-in + parallax + subtle 1.0→1.04 zoom, floating Elite Distributor card
3. **Product Categories** — horizontal-scroll pin via ScrollTrigger, scrub progress bar, mobile snap-carousel fallback
4. **Dual-Play** — split-screen reveal, 4px vertical red rule draw, hover-driven 52/48 scale interaction
5. **Trust Bar** — infinite GSAP marquee, hover dim + tooltip slide-up
6. **Value Pillars** — three border-cards, icon hover sweep
7. **Industries Grid** — 3×3 expand-on-hover with image invert and arrow slide-in
8. **Numbers** — Framer `useMotionValue` count-up + ghost numerals
9. **Founder Story** — vertical wipe + line-by-line SplitText reveal
10. **Quote CTA** — paint-roller red fill + 3-field form with demo success state ("GOT IT" Bebas confirmation + reset link)
11. **Location & Contact** — custom hand-built SVG map, pulsing red pin, info card, mailto + tap-to-call
12. **Polish** — 404 page ("WRONG AISLE"), reduced-motion audit, mobile audit, keyboard/focus pass, Lighthouse pass, screen reader pass

---

## 7. Deltas from the source brief

Explicit decisions where this spec departs from `Minott_Chemicals_Design_Prompt.md`. None of these affect visual direction — they're scoping, dependency, or technical calls.

1. **Mapbox replaced with custom SVG map.** Hand-built stylized neighborhood map of 14½ Retirement Road, Kingston 5. Branded color palette, 4px red ring around pin pulsing on a 2s loop, popup on click. No API token, no billing risk. Address + "Get Directions" link retained.

2. **Image format.** Source assets are `.png` at ~2MB each; copies into `public/images/` are saved as `.jpg`. Next.js `<Image>` produces AVIF/WebP variants at request time. Filenames already standardized to `.jpg` per the spec.

3. **Founder portrait.** `assets/18.png` is a generic professional portrait, not the Chester G. Minott vertical environmental portrait the spec describes. Used as-is in the Founder Story slot — the editorial composition still works, and the spec's likeness-rights fallback authorized representational substitutes. Flagged for the client to swap with a real founder photo before launch.

4. **Form delivery.** Visual demo only. Submit collapses the form with a Bebas Neue "GOT IT. A SALES CONSULTANT WILL CALL YOU WITHIN ONE BUSINESS DAY." confirmation. A small "Send another" reset link is shown so the client can demo the interaction repeatedly. No backend, no email send. Phase 2 add-on.

5. **GSAP plugins.** SplitText and DrawSVGPlugin (historically Club GreenSock paid) are free as of `gsap@3.13` after the Webflow acquisition. Pinned to `gsap@^3.13`.

6. **Page transitions.** Single-route demo. The red-diagonal curtain wipe is implemented and fires on the nav's secondary links, which scroll to anchored sections rather than routing to separate pages. Separate product / industry / about routes are Phase 2.

7. **SEO.** No sitemap submission or DNS cutover. `<title>`, meta description, Open Graph image (1200×630 hero composition), and `LocalBusiness` JSON-LD schema (address, phones, hours, lat/lng `18.0179, -76.7972`, `priceRange: "$$"`) are still written into the head — they're cheap and the source brief calls for them.

8. **Brand logos.** Sourced as best-effort monochrome SVGs from press kits. Any not reliably available falls back to a styled Bebas wordmark; fallbacks are reported.

9. **No automated tests.** Demo build with visual signoff cycle. Verification is the Section 14 checklist from the source brief: Lighthouse > 95, manual mobile audit, keyboard nav, screen reader pass, reduced-motion check, cross-browser smoke (Chrome, Safari, Firefox, Edge, mobile Safari, Chrome Android).

10. **Custom cursor.** Desktop-only (`pointer: fine` media query). Hidden on touch devices and under `prefers-reduced-motion`. The 8px dot + 32px lagging ring with spring damping is in scope per the brief.

---

## 8. Verification gate

Per the source brief Section 14, before declaring the demo complete:

- [ ] All four Lighthouse pillars ≥ 95
- [ ] LCP < 1.8s on 4G throttling
- [ ] CLS < 0.05
- [ ] No layout shift on font load
- [ ] Tested on a real mobile device (not just devtools)
- [ ] Phone numbers tap-to-call on iOS and Android
- [ ] Form submits visually with success state and reset link
- [ ] Reduced motion verified in OS settings
- [ ] Full keyboard navigation pass (tab order, focus visible, skip-to-content)
- [ ] Screen reader smoke test (VoiceOver or NVDA)
- [ ] Cross-browser smoke (Chrome, Safari, Firefox, Edge, mobile Safari, Chrome Android)
- [ ] Deployable to Vercel preview URL

---

## 9. Open items for client (post-demo)

To capture in a handoff doc when the demo ships:

- Real founder photo to replace `founder-portrait.jpg`
- Final brand-logo asset confirmation (any Bebas fallbacks flagged for replacement)
- Decision on Phase 2 inclusions: form delivery (Resend or SMTP to `sales@minottchem.com`), CMS (Sanity or Payload), analytics (Plausible + Vercel Analytics), separate product / industry / about routes
- DNS cutover plan + 90-day archive of the existing WordPress site
- Production Mapbox token decision (if switching back from custom SVG map)

---

**End of spec.**
