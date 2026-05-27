# Minott Equipment & Chemicals — Premium Website Design Prompt

**Prepared by:** FloPro Limited
**For:** Minott Equipment & Chemicals Limited (MEC)
**Tagline lock:** _Cleaner Spaces. Stronger Business._ — _Jamaica's Most Trusted Partner in Clean._

---

## 0. NORTH STAR

Build the website Jamaica's #1 chemical and janitorial supplier should have had ten years ago. The current site reads like a 2021 WordPress wholesaler. The new site must read like a **category-defining industrial brand** — the kind of digital presence you'd expect from a U.S. mid-market B2B leader (think Ecolab, Cintas, Grainger), but with Jamaican grit and a 35-year founder story that gives it real soul.

**Three non-negotiables:**

1. **It must feel heavy.** This is a company that moves drums of degreaser and pallets of paper goods. The motion design, typography, and color use should carry weight — not weightless flat-design fluff.
2. **It must feel premium.** Generous whitespace, cinematic hero, real photography, magazine-grade typography hierarchy. No stock-photo clichés, no gradient mush.
3. **It must convert.** Every section drives toward the quote request. Sales cycle is quote-driven (no pricing on site), so the entire architecture is a runway to that one CTA.

**Reference vibe boards** (for tone, not literal copy):

- **Linear.app** — for restraint, dark surfaces, precise typography
- **Cintas.com** — for industrial B2B credibility
- **Bilt Rewards** — for kinetic editorial feel
- **3M.com Commercial Solutions** — for Elite Distributor adjacency
- **Caterpillar.com** — for industrial heroism

---

## 1. BRAND DNA (LOCKED)

| Token            | Value                | Use                                                        |
| ---------------- | -------------------- | ---------------------------------------------------------- |
| `--mec-red`      | `#E10600`            | Primary. CTAs, accent rules, hover states, highlight chips |
| `--mec-ink`      | `#0D0D0D`            | Body text on light, dark surfaces, headlines               |
| `--mec-graphite` | `#2B2B2B`            | Section contrast, cards, footer base                       |
| `--mec-mist`     | `#F2F2F2`            | Alternate section background, dividers                     |
| `--mec-pure`     | `#FFFFFF`            | Primary background, type on dark                           |
| `--mec-red-glow` | `rgba(225,6,0,0.18)` | Soft glow under hover, focus ring tint                     |
| `--mec-grid`     | `rgba(225,6,0,0.06)` | Background grid lines (industrial blueprint feel)          |

**Typography:**

- **Display / Headlines:** Bebas Neue — track wide (+0.02em), 1.0 line-height at large sizes. ALL CAPS for H1/H2 hero blocks; sentence case for sub-headlines.
- **Body / UI:** Montserrat — 400 for body, 500 for UI labels, 600 for emphasis, 700 for nav/buttons. Line-height 1.55 for body, 1.2 for UI.
- **Code / Specs (where used):** JetBrains Mono — for product spec sheets, certification codes, SKU references.

**Type scale (fluid via `clamp`):**

- H1: `clamp(3.5rem, 8vw, 7.5rem)` / Bebas Neue / -0.01em letter-spacing
- H2: `clamp(2.5rem, 5vw, 4.5rem)` / Bebas Neue
- H3: `clamp(1.5rem, 2.5vw, 2.25rem)` / Bebas Neue
- Eyebrow: `0.75rem` / Montserrat 600 / +0.16em tracking / uppercase
- Body: `clamp(1rem, 1.1vw, 1.125rem)` / Montserrat 400
- Lede: `clamp(1.125rem, 1.4vw, 1.375rem)` / Montserrat 400

**Voice (verbatim from brand kit):**

- Trusted. Industrial. Clean. Reliable. Bold.
- Hook formulas: _"Stop the mess. Start the standard."_ / _"Clean isn't just seen. It's felt."_ / _"Less downtime. More productivity."_ / _"Built for businesses that don't cut corners."_

---

## 2. TECH STACK (RECOMMENDED)

| Layer                         | Choice                               | Why                                                                                                                     |
| ----------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **Framework**                 | Next.js 15 (App Router)              | SSR/SSG for SEO, React Server Components, image optimization                                                            |
| **Styling**                   | Tailwind CSS v4 + CSS variables      | Token-driven, fast iteration                                                                                            |
| **Animation (primary)**       | Framer Motion (motion/react)         | Component-level orchestration, layout animations, scroll-linked motion                                                  |
| **Animation (heavy lifting)** | GSAP 3 + ScrollTrigger + SplitText   | Timeline choreography, text masking, pinned sections, horizontal scroll                                                 |
| **Smooth scroll**             | Lenis                                | Replaces native scroll for cinematic feel; integrates with ScrollTrigger via `lenis.on('scroll', ScrollTrigger.update)` |
| **Forms (demo)**              | React Hook Form (visual states only) | Field interactions, focus styling, faked success state — no backend wiring this round                                   |
| **Hosting**                   | Vercel                               | Edge runtime, image optimization, instant preview deployments for client review                                         |
| **Maps**                      | Mapbox GL JS (dark/branded style)    | Replaces ugly default Google embed                                                                                      |
| **Icons**                     | Lucide React + custom SVG line set   | Matches brand kit's line-style icon spec                                                                                |

> **Out of scope for this demo build:** real form delivery, CMS integration, and analytics. All three are noted as Phase 2 add-ons in Section 12 and can be wired in after client signoff on the design.

**Performance budget:**

- LCP < 1.8s on 4G
- CLS < 0.05
- Total JS < 200KB gzipped on initial route
- Lighthouse > 95 across all four pillars

---

## 3. DESIGN SYSTEM PRIMITIVES

### Spacing scale (matches brand kit)

`8 / 16 / 24 / 32 / 48 / 64 / 96 / 128 / 192` px — expose as Tailwind theme.

### Radii

- `--radius-sm`: 4px (chips, tags)
- `--radius-md`: 8px (cards, buttons)
- `--radius-lg`: 16px (image containers)
- `--radius-pill`: 999px (rare; primary CTA only)

### Shadows (use sparingly — industrial design is flat)

- `--shadow-card`: `0 1px 2px rgba(0,0,0,0.04), 0 12px 24px -8px rgba(0,0,0,0.08)`
- `--shadow-lift`: `0 24px 48px -12px rgba(225,6,0,0.18)` — only on red-accented hover states

### Easing curves (CRITICAL — most "AI sites" use the wrong easing)

- `--ease-out-expo`: `cubic-bezier(0.16, 1, 0.3, 1)` — entrance reveals
- `--ease-in-out-quart`: `cubic-bezier(0.76, 0, 0.24, 1)` — section transitions
- `--ease-out-back`: `cubic-bezier(0.34, 1.56, 0.64, 1)` — small UI elements only, never large blocks
- Default durations: 600ms (large), 400ms (medium), 200ms (small UI)

### Grid

12-column, 80px max gutter on desktop, 24px on mobile. Container max-width 1440px. Content max-width 1280px. Full-bleed permitted for hero, image rails, marquee.

### Cursor (desktop only, `pointer: fine`)

Custom cursor: 8px solid red dot + 32px outlined ring that lags by ~80ms with spring damping. On interactive elements (links, buttons, cards): ring expands to 64px, dot scales to 0, label fades in inside ring ("View" / "Drag" / "Open"). Hides on touch devices.

---

## 4. GLOBAL BEHAVIORS

### 4.1 Smooth scroll initialization

```ts
// app/lenis-provider.tsx
'use client'
import { ReactLenis } from 'lenis/react'
import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function LenisProvider({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis
      root
      options={{ lerp: 0.08, duration: 1.4, smoothWheel: true }}
    >
      {children}
    </ReactLenis>
  )
}
```

Wire Lenis to ScrollTrigger in a top-level effect so pinned sections track correctly. **Respect `prefers-reduced-motion`** — disable Lenis and all non-essential motion under that media query.

### 4.2 Navigation

- **Transparent** over hero, **solid `--mec-ink`** after 80px scroll, with a 200ms backdrop-blur transition.
- Logo left, links center (Products, Industries, About, Contact), red **"Request a Quote"** button right.
- On scroll-up after scroll-down, nav slides back in from top with a 300ms ease-out-expo.
- Mobile: full-screen overlay nav with staggered link reveal (50ms between links), Bebas Neue at H2 scale.

### 4.3 Page transitions

On internal navigation, a red curtain wipes diagonally (matches the brand kit "diagonal red sweep" visual element) — 600ms total, route loads behind the curtain. Use Framer Motion's `AnimatePresence` with a route-level wrapper.

### 4.4 Reduced motion

Every animation must have a no-motion fallback. Hero text appears instantly. ScrollTrigger pins become static stacks. Lenis disabled. Custom cursor hidden.

---

## 5. PAGE ARCHITECTURE (HOMEPAGE)

1. Sticky Nav
2. **Hero** — Cinematic statement
3. **Trust Bar** — Elite Distributor brand marquee
4. **Value Pillars** — Quality / Supply / Support (3 columns)
5. **Dual-Play** — Manufacturer + Distributor split-screen
6. **Product Categories** — Horizontal scroll showcase (4 categories)
7. **Industries Served** — Interactive grid (9 industries)
8. **The Numbers** — Animated counters (35+ years, 15+ suppliers, 4 elite brands, island-wide delivery)
9. **Founder Story** — 35-year origin, Chester G. Minott
10. **Quote CTA** — Big conversion block
11. **Location & Contact** — Branded map + ops info
12. Footer

---

## 6. SECTION-BY-SECTION SPEC

### 6.1 HERO — _"Cleaner Spaces. Stronger Business."_

**Layout (desktop):**

- Full viewport height (100svh, accounting for mobile address bars).
- Left 60%: type stack. Right 40%: cinematic still image.
- Diagonal red sweep (SVG) cuts across the boundary between the two — animated draw on load.

**Type stack (left):**

- Eyebrow (red, uppercase): `JAMAICA'S MOST TRUSTED PARTNER IN CLEAN — SINCE 1990`
- H1 (Bebas Neue, two lines, alternating color):
  - Line 1: **CLEANER SPACES.** (ink)
  - Line 2: **STRONGER BUSINESS.** (red)
- Lede (Montserrat 400, max-width 48ch): _We power clean, safe, and productive spaces across Jamaica — with manufactured-on-island chemicals and elite-distributed equipment from 3M, NSS, San Jamar, Rubbermaid and Purell._
- Dual CTA row:
  - Primary: **REQUEST A QUOTE →** (red fill, white text, arrow icon)
  - Secondary: **SEE OUR PRODUCTS** (ghost, ink border)
- Below CTAs, three small trust icons inline: Quality Products / Reliable Supply / Expert Support (matches brand kit hero composition)

**Right visual (60/40 split):**

- High-resolution still image of a real industrial cleaning scene — wet floor sign in foreground, gleaming polished concrete, a janitor mid-action pushing a Rubbermaid commercial cart down a warehouse aisle. Red color graded subtly. **No talking-head shots. No people smiling at camera.** Cinematic, documentary, slightly desaturated except for safety-red accents (the floor sign, the cart handle).
- Slow, subtle parallax on scroll (the image translates upward at 0.6x scroll speed) plus an extremely gentle zoom (1.0 → 1.04 over 6 seconds via Framer Motion's `useTransform` on scroll progress) — this gives the still image cinematic life without a video file.
- A small floating card overlay: _"⭐ Elite Distributor — 3M, NSS, San Jamar, Rubbermaid, Purell"_ — frosted glass, white text.

**Motion (load sequence, 1.6s total):**

```ts
// Pseudocode timeline with GSAP
const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
tl.from(".hero-eyebrow", { y: 24, opacity: 0, duration: 0.6 })
  .from(
    ".hero-line-1 .char",
    { yPercent: 110, stagger: 0.02, duration: 0.9 },
    "-=0.3",
  )
  .from(
    ".hero-line-2 .char",
    { yPercent: 110, stagger: 0.02, duration: 0.9 },
    "-=0.7",
  )
  .from(".hero-lede", { y: 16, opacity: 0, duration: 0.6 }, "-=0.6")
  .from(
    ".hero-cta > *",
    { y: 12, opacity: 0, stagger: 0.08, duration: 0.5 },
    "-=0.4",
  )
  .from(".hero-sweep path", { drawSVG: "0%", duration: 1.2 }, 0)
  .from(
    ".hero-image-wrapper",
    { clipPath: "inset(0 0 100% 0)", duration: 1.2 },
    0.2,
  )
  .from(".hero-image", { scale: 1.15, duration: 1.6, ease: "power2.out" }, 0.2);
```

Use **GSAP SplitText** to split H1 into chars for the per-character mask reveal. Lines lift from a 1px offset behind a horizontal clip, then settle. **This is the signature move.** Get it right.

**Scroll-out:**
As the user scrolls, the hero image parallaxes at 0.5x scroll speed. The H1 fades out at 30% scroll. A scroll-indicator (small Bebas Neue "SCROLL" with a vertical line that draws downward in a loop) sits bottom-center.

---

### 6.2 TRUST BAR — Elite Distributor Marquee

**Single horizontal row**, full-bleed, `--mec-mist` background, 96px tall.

- Eyebrow centered above: `PROUD ELITE DISTRIBUTOR FOR`
- Infinite horizontal marquee of brand logos (greyscale at 60% opacity): **3M · NSS · SAN JAMAR · RUBBERMAID COMMERCIAL · PURELL · 3M · NSS · ...**
- On hover of a logo: that logo lifts to 100% opacity, scales 1.05, the others dim to 30%, and a small tooltip slides up: _"3M — Safety, PPE, Adhesives"_ etc.
- Marquee paused on hover, pauses on `prefers-reduced-motion`.

**Implementation:** GSAP `gsap.to('.marquee-track', { xPercent: -50, duration: 30, repeat: -1, ease: 'none' })` with the track containing the logos twice for seamless looping.

---

### 6.3 VALUE PILLARS — Quality / Supply / Support

Three-column grid, dark section (`--mec-ink` background, white type). Generous vertical padding (192px top/bottom).

**Section header:**

- Eyebrow: `WHY MEC`
- H2: **THREE THINGS WE PROMISE.** (line breaks for emphasis)

**Three cards** (border-only, 1px `rgba(255,255,255,0.1)`, no fill):

1. **Quality Products** — _"Manufactured on-island. Distributed from the best in the world."_ Icon: medallion (matches brand kit). On hover, the icon's interior fills with red, and a red diagonal sweep crosses the card from top-left to bottom-right.
2. **Reliable Supply** — _"Twice-weekly delivery to every major Jamaican city. 15+ overseas suppliers backing every order."_ Icon: delivery truck.
3. **Expert Support** — _"35 years of category knowledge. Our sales consultants walk every order through with you."_ Icon: headset.

**Motion:** ScrollTrigger reveals — each card lifts 32px, opacity 0→1, stagger 120ms, triggered when the section is 70% in viewport.

**Hover state:** Card border thickens from 1px to 2px, the entire card lifts 8px with `--shadow-lift`, the icon rotates 5deg then settles via `ease-out-back`.

---

### 6.4 DUAL-PLAY — Manufacturer + Distributor

This is the **conceptual hero** of the brand: Minott is both maker and middleman, and that combination is the moat.

**Layout:** Full-bleed split-screen, 100vh. Left half = manufacturing (industrial blue-grey palette, a photo of a chemical drum / mixing tank). Right half = distribution (cleaner, white-ish, a photo of branded boxes on a pallet, 3M/Rubbermaid visible).

**Center:** A vertical red line (4px) bisects the screen. On scroll into the section, both halves slide in from their respective sides (left half from -10%, right half from +10%), and the red dividing line draws from top to bottom over 1s.

**Type overlays:**

- Left half (bottom-left aligned): Eyebrow `WE MAKE`. H3 **OUR OWN CHEMICAL LINE.** Body (white, small): _Industrial and household formulations, mixed at our Kingston facility, tuned for Jamaican climate, regulations, and use cases._
- Right half (bottom-right aligned): Eyebrow `WE DISTRIBUTE`. H3 **THE WORLD'S BEST EQUIPMENT.** Body: _Elite Distributor for 3M, NSS, San Jamar, Rubbermaid Commercial, and Purell — the brands that set global standards._

**Interaction:** On hover left, left half scales to 52%, right contracts to 48%. Vice versa. Creates a deliberate "you can't have one without the other" feel.

---

### 6.5 PRODUCT CATEGORIES — Horizontal Scroll Showcase

**The signature motion piece.** Pinned section, horizontal scroll using GSAP ScrollTrigger.

**Layout:** 4 large category cards, each 80vw wide, stacked horizontally. As the user scrolls vertically, the cards translate horizontally. A progress bar at the top of the viewport (red, fills as you scroll) signals position. Total pin distance: ~3x viewport height.

**The four cards:**

1. **Industrial & Household Chemicals** — Image: gleaming drums of degreaser, bottles on stainless shelving. Headline (Bebas, on image): _"FORMULATED FOR JAMAICA."_ Sub-list (3 items max): Floor cleaners · Disinfectants · Degreasers · Bleach · Sanitizers.
2. **Janitorial Equipment & Supplies** — Image: Rubbermaid commercial cart in a hotel hallway. Headline: _"BUILT FOR THE WORK."_ Sub-list: Vacuums · Mops · Carts · Brooms · Buckets · Bins.
3. **Personal Protection Equipment (PPE)** — Image: nitrile gloves, KN95 masks neatly arranged. Headline: _"PROTECTION THAT FITS."_ Sub-list: Surgical gloves · Nitrile · Latex · Masks · Isolation gowns.
4. **Paper Products** — Image: bulk hand towel cases, jumbo rolls in a dispenser. Headline: _"NEVER RUN OUT."_ Sub-list: Hand towels · Jumbo roll · Bathroom tissue · Napkins · Dispensers.

Each card has a **"VIEW PRODUCTS →"** ghost button bottom-left.

**Code skeleton:**

```ts
useGSAP(
  () => {
    const track = trackRef.current;
    const cards = gsap.utils.toArray(".product-card");
    const totalScroll = (cards.length - 1) * window.innerWidth * 0.8;

    gsap.to(track, {
      x: -totalScroll,
      ease: "none",
      scrollTrigger: {
        trigger: sectionRef.current,
        pin: true,
        scrub: 1,
        end: () => `+=${totalScroll}`,
        anticipatePin: 1,
      },
    });
  },
  { scope: sectionRef },
);
```

**Mobile fallback:** Becomes a native horizontal swipe-snap carousel with `scroll-snap-type: x mandatory`. No pinning.

---

### 6.6 INDUSTRIES SERVED — Interactive Grid

3×3 grid of industry tiles. `--mec-mist` background.

- Eyebrow: `WHO WE SERVE`
- H2: **NINE INDUSTRIES. ONE STANDARD.**

The nine tiles: Hospitality · Medical · Manufacturing · Financial · Telecoms · Entertainment · Retail · Janitorial · Sanitation.

Each tile is a square with:

- Industry name (Bebas Neue)
- A small line-style icon top-left
- A muted thumbnail image of that environment top-right (hotel lobby for hospitality, hospital corridor for medical, etc.)

**Hover state:** Tile expands by 4px in all directions (uses layout animation), background flips from white to `--mec-red`, text and icon invert to white, image desaturates fully, and a small `→` arrow slides in from the right. Other tiles dim to 40%.

**Mobile:** 2-column grid, tap to expand, tap again to dismiss.

---

### 6.7 THE NUMBERS — Animated Counters

Full-bleed `--mec-ink` section. 4 stats in a horizontal row.

| Stat                     | Counter | Label                                      |
| ------------------------ | ------- | ------------------------------------------ |
| Years in operation       | 35+     | YEARS BUILDING JAMAICA'S CLEAN STANDARD    |
| Overseas suppliers       | 15+     | SUPPLIERS ACROSS THE U.S. AND CHINA        |
| Elite Distributor brands | 5       | GLOBAL BRANDS UNDER ONE ROOF               |
| Major cities served      | 8       | JAMAICAN CITIES WITH TWICE-WEEKLY DELIVERY |

**Motion:** Each number counts up from 0 to target over 1.2s when section enters viewport. Use Framer Motion `useMotionValue` + `useTransform` + `animate()`. Don't use a setInterval — use `requestAnimationFrame` via Motion's `animate`.

Behind each number, a faint Bebas Neue ghost of the number sits at 8% opacity, 1.3x scale, slightly offset — adds editorial depth.

A 1px red horizontal rule runs between each stat on desktop, becomes vertical on mobile.

---

### 6.8 FOUNDER STORY — 35-Year Origin

Two-column layout. Left: large portrait-style photo of the founder, **Chester G. Minott** (or a representational shot if unavailable — a worn pair of work boots, a hand on a clipboard, a chemical drum with the company logo). Image is in a 4:5 aspect ratio, slight desaturation, red duotone if no founder photo is available.

Right: Editorial type block.

- Eyebrow: `THE FOUNDER`
- H2: **CHESTER G. MINOTT STARTED WITH ONE TRUCK AND A STANDARD.**
- Body (long-form, 3 short paragraphs):
  > Thirty-five years ago, Chester G. Minott opened the doors of a small equipment distribution shop in Kingston with a single conviction: that Jamaican businesses deserved the same caliber of cleaning, sanitation, and chemical supplies as any company in Miami, Atlanta, or Toronto.
  >
  > That conviction built MEC into Jamaica's largest supplier of chemicals — the country's go-to manufacturer for industrial and household formulations, and the Elite Distributor of choice for 3M, NSS, San Jamar, Rubbermaid Commercial Solutions, and Purell.
  >
  > Three and a half decades later, we still answer to one standard: the work we deliver should let our clients run their businesses without ever having to think about ours.

**Motion:** Image clips in from the left with a vertical wipe. Text reveals line-by-line via SplitText (each line a separate clip-reveal, stagger 80ms).

---

### 6.9 QUOTE CTA — The Conversion Block

Full-bleed `--mec-red` background. Generous padding (192px vertical).

- H2 (white, massive — Bebas Neue at 7-9rem desktop): **YOUR SPACE. OUR STANDARD.**
- Lede (white): _Tell us what you need clean. We'll quote it within one business day._
- Inline form (3 fields visible, expands on focus):
  - Name
  - Company
  - What do you need? (textarea)
- Single button: **SEND MY QUOTE REQUEST →** (white fill, red text)
- Below: _"Or call us directly: (876) 929-5284"_ — tap-to-call link.

**Motion:** As the user scrolls in, the section's red color "fills" from left to right (like a paint roller) over 800ms, then the type and form fade in.

**Form behavior (demo build — visual only):**

- Inline validation styling shown on focus/blur.
- Submit button triggers the success animation locally — no backend wiring for this build.
- On click: form collapses with a quick fade-and-slide, replaced with a Bebas Neue confirmation: **"GOT IT. A SALES CONSULTANT WILL CALL YOU WITHIN ONE BUSINESS DAY."**
- A small reset link appears below the confirmation so the client can demo the interaction repeatedly during walkthroughs.
- Real form delivery (Resend or SMTP wiring to `sales@minottchem.com`) is a Phase 2 add-on once the design is approved.

---

### 6.10 LOCATION & CONTACT

Two-column: left a custom-styled Mapbox map (dark theme, red pin, branded tile style), right an info card.

**Info card includes:**

- Address: 14 1/2 Retirement Road, Kingston 5, Jamaica
- Hours: Mon–Fri, 8:00 AM – 4:30 PM
- Phones: (876) 929-5284 · 929-3132 · 929-5147 (all tap-to-call)
- Fax: (876) 929-5228
- Email: <sales@minottchem.com> (mailto)
- A small "Get Directions" button that opens native maps with the destination pre-filled.

**Map detail:** Use Mapbox Studio to build a custom style — desaturated streets, red highlight on the property, a 4px red ring around the pin that pulses on a 2s loop. On click, the pin bounces and a custom popup card appears.

---

### 6.11 FOOTER

Dark `--mec-ink`. 4-column layout:

- **Col 1:** MEC logo, tagline, social (Facebook icon — linked to `facebook.com/minottchemicalsja`).
- **Col 2:** Quick Links — Home / Products / Industries / Brands / About / Contact.
- **Col 3:** Our Products — Industrial & Household Chemicals / Janitorial Equipment & Supplies / PPE / Paper Products.
- **Col 4:** Contact mini-block (phone, email, hours).

Bottom strip: © 2026 Minott Equipment & Chemicals Limited · Designed by FloPro Limited · Privacy · Terms.

**Easter egg:** On hover of the MEC logo in the footer, a tiny red dot appears next to it that pulses — and clicking it scrolls smoothly back to the hero. Small flourish, signals craft.

---

## 7. MICRO-INTERACTION LIBRARY

These are the small details that separate a $5K site from a $25K site. Implement all of them.

| Element                      | Behavior                                                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Primary CTA button**       | On hover: background fills from left to right with a slightly darker red (200ms ease-out-quart). Arrow icon translates 4px right. On click: 50ms scale-down to 0.97 then back. |
| **Secondary (ghost) button** | On hover: border thickens from 1px to 2px, text color shifts to red.                                                                                                           |
| **Links (in body)**          | Animated underline that draws from left to right on hover (200ms). On exit, retracts from right to left.                                                                       |
| **Cards**                    | Lift 8px on hover with `--shadow-lift`, image inside zooms to 1.05 over 800ms.                                                                                                 |
| **Images**                   | Lazy-loaded with a blur-up placeholder (Next.js `placeholder="blur"`). On entry into viewport, fade from blurred to sharp over 400ms.                                          |
| **Section headers**          | Eyebrow text appears first, then H2 wipes up from below a clip-mask, then lede fades in — all triggered by ScrollTrigger at 70% viewport.                                      |
| **Scroll progress bar**      | 2px red bar at top of viewport, fills as user scrolls page.                                                                                                                    |
| **Form inputs**              | Label floats above the field on focus (Material-style), bottom border thickens to 2px red on focus.                                                                            |
| **404 page**                 | Bebas Neue **"404. WRONG AISLE."** with a small red "Back to Home" link. Subtle floating dust particles in background (canvas, very subtle).                                   |
| **Loading state**            | Initial page load shows a red horizontal bar growing from left to right at the top of a black screen, then the page reveals. Maximum 800ms.                                    |

---

## 8. IMAGE & ASSET DIRECTION

**This is where most B2B sites lose the war.** Photography is everything.

### Mandatory photography spec

- **Real industrial environments.** No "smiling office workers." No stock photo overlays.
- **High contrast.** Strong shadows, blacks at near-pure black, whites at clean white.
- **Slight desaturation** with safety-red as the only fully-saturated color in frame (wet floor signs, Rubbermaid carts, chemical labels).
- **People shown working** — never posing, never looking at camera. Mid-action only.
- **Environments:** warehouses, hotel back-of-house, hospital corridors, restaurant kitchens, factory floors, school cafeterias.

### Asset list (all stills — AI-generated placeholders for the demo)

1. Hero still image (1920×1200 minimum, 16:10)
2. Hero floating-card thumbnail (small product/scene shot)
3. 4 product category lifestyle images
4. 9 industry tile images
5. 1 founder portrait (or representational substitute)
6. Dual-play split-screen pair (manufacturing + distribution)
7. 5 Elite Distributor brand logos (SVG, monochrome dark — sourced from each brand's press kit, not AI-generated)
8. Custom icon set (line style, 24px and 32px variants): Quality, Delivery, Support, Lab, Security, Truck, Mop, Glove, Mask, Tissue, Bin, Cart, Drum, Bottle (14 icons total — Lucide React covers most; supplement with SVG)
9. Diagonal red sweep SVGs (3 variants: thin, medium, full-bleed — hand-drawn, not AI)
10. Background grid SVG (subtle red dot or line grid, 5% opacity — hand-drawn, not AI)

### Image sourcing if commissioning is out of scope

- **Unsplash:** search "industrial cleaning," "warehouse," "janitorial," filter for editorial photography. Pre-approved photographers: Annie Spratt, Jon Tyson, Christopher Burns.
- **Pexels:** search "commercial cleaning," "hotel housekeeping."
- **Adobe Stock:** budget $200-400 for 8-10 hero-grade images. Search "industrial chemical" and filter for editorial style, not stock-y compositions.
- **Avoid:** Anything from Shutterstock's "Business Background" category. Anything with white backgrounds and floating objects. Anything with a model staring at the camera holding a spray bottle.

---

## 9. ACCESSIBILITY (WCAG 2.2 AA, MINIMUM)

- All text on red must be white at minimum 16px, 500 weight — contrast ratio 5.27:1 on `#E10600`. Verified.
- Focus rings: 2px red offset 2px on all interactive elements. Visible on keyboard nav (`:focus-visible`).
- Skip-to-content link on every page.
- Form fields: explicit `<label>` elements, error messages tied via `aria-describedby`.
- Motion: respect `prefers-reduced-motion`, disable parallax, marquee, horizontal scroll pin, and custom cursor under that media query.
- Color is never the sole carrier of meaning (error states use icon + color + text).
- Heading hierarchy linear (H1 → H2 → H3, no skips).
- Alt text on every image, descriptive (not "image1.jpg").
- Mapbox map has a text alternative listing the address and a "Get Directions" link.

---

## 10. SEO

- Title: `Minott Chemicals — Jamaica's Most Trusted Partner in Clean | Industrial & Janitorial Supplies`
- Meta description: `Jamaica's largest supplier of chemicals, janitorial equipment, and PPE. Elite Distributor for 3M, NSS, San Jamar, Rubbermaid Commercial, and Purell. 35+ years serving Jamaican businesses. Request a quote in one business day.`
- OG image: 1200×630 hero composition with the tagline overlaid.
- Schema.org: `LocalBusiness` JSON-LD with address, phones, hours, geo coordinates (18.0179, -76.7972), priceRange `$$`.
- Sitemap and robots.txt configured.
- Each product category page (when built) gets its own dedicated title and meta.
- Open Graph + Twitter cards configured for share previews.

---

## 11. ANALYTICS & MEASUREMENT _(Phase 2 — deferred for demo build)_

Analytics is not part of this demo build. When wired up post-approval, track these events:

- `quote_request_submitted` (primary conversion)
- `phone_clicked` (every tap-to-call)
- `email_clicked`
- `product_category_viewed` (which of the 4 cards the user dwelled on >2s)
- `scroll_depth_75` and `scroll_depth_100`
- `marquee_brand_hovered` (which Elite Distributor logo got attention)

Recommended stack at that point: Plausible (privacy-first) + Vercel Analytics. These let you A/B copy and refine the funnel after the real launch.

---

## 12. IMPLEMENTATION ROADMAP

> **Demo build** — focused on design, motion, and visual polish for client signoff. Form delivery, CMS, and analytics are Phase 2.

**Phase 1 — Foundation (Week 1)**

- Repo setup (Next.js 15, Tailwind, Framer Motion, GSAP, Lenis)
- Token system, base components (Button, Section, Container, Card, Eyebrow)
- Custom cursor, smooth scroll provider, nav with scroll behavior

**Phase 2 — Above the fold (Week 2)**

- Hero (full motion choreography, still image with parallax + subtle zoom)
- Trust bar marquee
- Value pillars
- Page transitions

**Phase 3 — Signature sections (Week 3)**

- Dual-play split-screen
- Product categories horizontal scroll (the hardest piece)
- Industries grid
- Animated counters

**Phase 4 — Conversion + close (Week 4)**

- Founder story
- Quote CTA + form (visual success state only, no backend)
- Mapbox map
- Footer

**Phase 5 — Polish + demo handoff (Week 5)**

- All micro-interactions
- Mobile audit (every section)
- Lighthouse pass (target >95)
- Accessibility pass (axe, keyboard nav, screen reader)
- 404 page
- Cross-browser test (Chrome, Safari, Firefox, Edge, mobile Safari, Chrome Android)
- Deploy to Vercel preview URL for client walkthrough

**Phase 2 add-ons (after client approval — not part of demo build):**

- Real quote form delivery to `sales@minottchem.com` via Resend or SMTP
- Sanity / Payload CMS so the Minott team can self-update products and industries
- Plausible + Vercel Analytics with the event list in Section 11
- Sitemap, robots.txt, full OG image set
- DNS cutover and 90-day archive of the old WordPress site

---

## 13. POST-LAUNCH (FUTURE-PROOFING)

Plan for these in version 2:

- **Product catalog** — Browsable, searchable, with SKU-level detail per category. Connects to CMS.
- **Online quote builder** — Multi-step wizard. User picks categories → specifies quantities/needs → builds a quote PDF.
- **Customer portal** — Reorder history, saved quotes (requires auth).
- **Blog / Resource center** — Cleaning standards by industry, regulatory updates, "How to choose a degreaser" guides. Major SEO play.
- **Spanish translation** — Open the door to Caribbean expansion.

---

## 14. FINAL DELIVERY CHECKLIST (DEMO BUILD)

Before handing the demo to Minott for review:

- [ ] All Lighthouse scores >95
- [ ] Tested on actual mobile devices (not just devtools)
- [ ] Quote form submits visually with success state (no backend wiring expected)
- [ ] Phone numbers tap-to-call on iOS and Android
- [ ] All images optimized (Next.js Image, AVIF + WebP fallback)
- [ ] No layout shift on font load (`font-display: swap` + size-adjust)
- [ ] Reduced motion verified in macOS / iOS / Windows settings
- [ ] Keyboard navigation full pass
- [ ] Screen reader pass (VoiceOver + NVDA)
- [ ] Deployed to Vercel preview URL with passcode protection for client walkthrough
- [ ] Walkthrough deck or Loom prepared explaining the design decisions, motion language, and what Phase 2 unlocks

---

**End of brief.**

This is the deliverable that takes Minott from a sleepy 2021 WordPress page to a category-defining digital presence Jamaica hasn't seen in this sector. Build it right and the client gets a website that pulls in inbound quote requests instead of just sitting there as a digital business card.

— FloPro Limited
