# Final Client Review (Nov 2026) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship every change from the client's "Final MEC Website Review (2)" that we have content for, and leave out anything still waiting on the client.

**Architecture:** Mostly edits to existing sections and layout components in `minott-web/`. There is one new feature, custom-logo mats: the customer uploads a logo when adding a mat to a quote. The file is stored privately on the data volume (same pattern as `lib/application-files.ts`), the browser cart keeps an opaque token, and the token is saved on `InquiryItem.logoFile` at submit. Staff open the file through a role-gated route.

**Tech Stack:** Next.js 16 / React 19 App Router, Prisma 7 + SQLite, Tailwind v4, GSAP + Framer Motion, better-auth.

**Spec:** `docs/reviews/2026-10-23-final-client-review-tasks.md`, the task list for review v1. Review v2 adds item 4.5, custom-logo mats. Mockups are in `assets/client-review-2026-10/`, and the mat mockups are in `/tmp/mecrev/x/word/media/image5.png` and `image6.png`. The decisions below override the **[Q]** items in that file.

## Global Constraints

- Work on branch `feat/client-review-nov` off `main`. All commands run from `minott-web/`.
- Read `node_modules/next/dist/docs/` before any Next-specific API; `cookies()`/`headers()`/`params` are async.
- Every `useGSAP` gates on `useReducedMotion()` with `dependencies: [reduced]`. Browser-state hooks use `useSyncExternalStore`.
- Named exports only (except page/layout/route). `@/` imports.
- **Leave out anything still waiting on the client.** No placeholders for: MECPro logo, Read Across Jamaica photos, Careers page, Privacy Notice page, extra social links, "Minott Certifications", SKU fixes, or the unfinished "From our in-house chemical manufacture to …" intro sentence.
- Incorporation year is **1988** everywhere. Homepage years stat = **38+**. About page keeps **40** (client's explicit request).
- Phone numbers: **+1 (876) 906-4835** (primary) and **+1 (876) 968-5857**. They replace (876) 929-5284 / 929-3132 / 929-5147 everywhere they're shown as phone numbers. The WhatsApp link (`wa.me/18769295284` on contact, `WHATSAPP_URL`) and the fax line stay unchanged.
- Purell is removed everywhere: the logo slot, copy and metadata. Nothing replaces it until the MECPro logo arrives.
- Verification gate for every task: `npx tsc --noEmit` and `npm run lint` are clean, and `npm run build` succeeds (each task runs at least tsc + lint; tasks 3, 5 and 6 also build). There is no unit test suite. Where a task has logic, it adds a `scripts/check-*.ts` script run with `npx tsx` that asserts and exits non-zero on failure.

## Review Focus

1. **Logo upload abuse:** this is an unauthenticated upload endpoint. It needs a per-IP rate limit (20 per hour), a 10 MB cap, a PNG/JPG/PDF allowlist checked by **magic bytes** (not just `file.type`), and UUID-only stored names. The submit path must reject any token that doesn't match the name regex or doesn't exist on disk, by dropping the logo rather than failing the quote. Pinned in Task 5's check script.
2. **Who can open a logo:** admins can open any logo. Reps only for quotes on companies assigned to them. Customers can't open them; their history only shows "Custom logo attached". Anonymous users get 404. Pinned in Task 5, Step 6.
3. **Cart line from before this release:** an old `mec_quote_cart_v2` line without a `logo` field must still render and submit. `logo` is optional everywhere.
4. **Fixed solid nav covering page tops:** every public page's first section must still clear the now-solid nav, at 375, 1024, 1280 and 1440 px wide. Pages: `/`, `/about`, `/products`, `/products/all`, a product detail page, `/deals`, `/solutions`, `/social-responsibility`, `/contact`, `/quote`, `/register`, `/portal/sign-in`. Task 2's QA step screenshots each one.
5. **Search while a category is active:** typing in the search on `/products/all?category=mats` must search **all** products (the category param is dropped), and clearing the search must not bring the category back. Pinned in Task 4's manual check.

---

### Task 1: Copy, numbers and brand scrub (mechanical)

**Files:**
- Modify: `lib/constants.ts` — add `export const PHONES = [{ tel: "+18769064835", label: "(876) 906-4835" }, { tel: "+18769685857", label: "(876) 968-5857" }] as const;`
- Modify: `lib/industries.ts` — insert `"Beauty, Wellness & Personal Care"`, `"Automotive & Transportation"`, `"Construction"` before `"Personal / Individual"`.
- Modify: `components/sections/BrandWordmarks.tsx` — delete the Purell slot and `PurellWordmark`.
- Modify: `components/sections/DualPlay.tsx:84`, `components/sections/FounderStory.tsx:19`, `app/layout.tsx:45,49` — remove Purell from the copy (lists end "…and Rubbermaid Commercial"). `app/layout.tsx:45`: "35+ years" → "Since 1988". `app/layout.tsx:76` JSON-LD `telephone` → `"+1-876-906-4835"`.
- Modify: `app/contact/page.tsx:13` metadata phone → (876) 906-4835. Leave the WhatsApp href alone.
- Modify: `components/sections/LocationContact.tsx:16-18` — use `PHONES`; fax unchanged.
- Modify: `components/layout/Footer.tsx` — "since 1990" → "since 1988"; render both `PHONES`.
- Modify: `components/sections/AboutHero.tsx` STATS → keep `{ value: 40, suffix: "+", label: "Years of Excellence" }`, then three text stats using `display`:
  - `{ icon: MapPin, display: "Nationwide", label: "Nationwide coverage, multi-sector expertise." }`
  - `{ icon: Package, display: "2,000+", label: "Core products in stock — with custom and special-order solutions available upon request." }`
  - `{ icon: Truck, display: "Islandwide", label: "Delivery islandwide, with twice-weekly delivery to major cities." }`
  The labels are long: let the label wrap with normal case (`normal-case tracking-normal text-sm`) and keep the grid at 2 columns from sm up (`sm:grid-cols-2`) so they fit.
- Modify: `components/sections/OurStory.tsx` — Chester title `"1984 — A Vision Takes Root"` → `"1989 — A Vision Takes Root"`. Mileydi body becomes exactly: `Fifteen years ago, Mileydi Minott stepped in with courage and vision, taking the reins and leading the company through new challenges. Building on a proud legacy, she spearheaded the diversification of MEC’s product lines and enhanced service capabilities, driving dynamic growth across new and existing markets.` Today & Beyond: "…the relationships we build and…" → "…the relationships we nurture and…" (the second "build").

- [ ] **Step 1:** Make the edits above.
- [ ] **Step 2:** Run `grep -rn "Purell\|1990\|929-5284\|9295284\|929-3132\|929-5147" app components lib emails --include=*.ts --include=*.tsx`. Expected: only the WhatsApp href in `app/contact/page.tsx` (`wa.me/18769295284`). CinematicHero hits are fine at this stage; Task 3 rewrites that file.
- [ ] **Step 3:** `npx tsc --noEmit && npm run lint` are clean.
- [ ] **Step 4:** Commit `feat(content): client review copy — 1988, new phones, About story, industries, drop Purell`.

### Task 2: Always-visible nav, footer on every page, memberships

**Files:**
- Modify: `components/layout/Nav.tsx`
- Modify: `components/layout/PublicChrome.tsx`
- Modify: `components/layout/Footer.tsx`
- Create: `components/layout/NavSearch.tsx`
- Create: `public/images/memberships/jmea.jpg` and `issa.png`, copied from `assets/client-review-2026-10/logo-jmea.jpg` and `logo-issa.png`

**Interfaces:** Produces `NavSearch()`, a client component. Task 4 relies on the nav search submitting to `/products/all?q=<term>` with no other params.

**Nav behaviour:**
- **Always visible.** Delete the hide-on-scroll `hidden` state and the `motion.header` y animation. The header is `fixed top-0` with a solid `bg-mec-pure` and a bottom border `border-black/10`, on every route including `/`. All link text is `text-mec-ink` with active/hover `text-mec-red`. Delete the `onDarkHero` and `scrolled` colour logic. The hamburger icon is `text-mec-ink` (white while the dark overlay is open).
- **Items,** in this order:
  - Left: the logo.
  - Centre: `Home (/)`, `Products (/products, category dropdown kept)`, `Special Offer (/deals)`, `About Us (/about)`, `Social Responsibility (/social-responsibility)`.
  - Right cluster: `NavSearch`, then `Quote (/quote)` with the count badge, then a `Login` primary `Button` → `/portal/sign-in`.
  - Remove `Tailored Solutions`, `Contact` and `Accounts Portal` from the header. They stay reachable from the footer.
  - The mobile overlay lists the same items, plus a search input at the top.
- **Responsive ("only shows in fullscreen").** The desktop row shows from `lg` (1024px), not `xl`. Below `lg` the hamburger takes over. At 1024–1279px use `text-[12px] tracking-[0.06em] gap-4`. Nothing may wrap or overflow at 1024, 1280 or 1440px.
- **NavSearch.** A search icon button. Clicking it opens an inline input (`w-56` on desktop) with autofocus. Enter → `router.push("/products/all?q=" + encodeURIComponent(term.trim()))`. An empty term does nothing. Esc or blur with an empty term closes it. `aria-label="Search products"`.

**Showroom strip:** `ShowroomBanner` is already rendered only on product pages (`/products`, `/products/all`, detail) — confirm in QA, no change needed.

**PublicChrome:** delete `isLanding`. The Footer renders on `/` too, because the client wants company info at the bottom of the home page.

**Footer:**
- Quick Links: add `Tailored Solutions`, `Special Offer (/deals)` and `Company Information (/about)`. Rename `Accounts Portal` to `Login` (→ `/portal/sign-in`).
- Remove the dead `#` "Privacy" and "Terms" links. The Privacy Notice is on the client list.
- Add a row above the bottom bar, headed "Certifications & Memberships", with the JMEA and ISSA logos via `next/image`, height 56px, each on a white rounded tile because the footer is dark. Alt text: "Jamaica Manufacturers and Exporters Association (JMEA) member" and "ISSA — The Worldwide Cleaning Industry Association member".

**Header height:** the header is a fixed `h-20` (80px) at every breakpoint, with the row vertically centred and the logo at `h-11 md:h-12`. Today it is `py-4` around an `h-14` logo, which is 88px from `md` up; every "80px" offset in this plan (page-top clearance, the Task 3 hero padding and scroll offsets) assumes exactly 80.

**Page top clearance:** the nav was transparent, so some pages tucked a dark first section under it (e.g. `/`, possibly `/solutions`, `/social-responsibility`). With a solid nav, every first section's content must start below the 80px header. Adjust only `pt-*` values. Don't restructure sections. The homepage hero is rewritten in Task 3, so only make it non-broken here.

- [ ] **Step 1:** Implement the Nav, NavSearch, PublicChrome and Footer changes.
- [ ] **Step 2:** `npx tsc --noEmit && npm run lint` are clean.
- [ ] **Step 3: QA.** Start `npm run dev`. Use playwright (see the memory note: `npm install playwright` in /tmp + `npx playwright install chromium --only-shell`). Screenshot the 12 pages in Review Focus #4 at 1024, 1280 and 1440px, plus 375px for `/` and `/products/all`. Also screenshot `/about` scrolled 1500px down to prove the nav stays visible. Check that no nav item wraps and no page content sits under the header. Save the shots under `/tmp/qa/task2/` and fix what's broken.
- [ ] **Step 4:** Commit `feat(nav): always-visible solid nav with client menu, search, footer on home, memberships`.

### Task 3: Homepage restructure

**Design source:** the critique in `docs/reviews/2026-11-17-homepage-ui-critique.md` and the client's mockup `assets/client-review-2026-10/current-homepage-annotated.png`. The values below are the spec. Where a value is given (size, colour, offset, padding), use it as written; don't substitute the old section defaults.

**Files:**
- Create: `public/images/hero-minott-warehouse.jpg` — the backdrop from `assets/client-review-2026-10/hero-backdrop-minott-labels.png`, converted with `sharp` to JPEG quality 82 at its native 2048px width.
- Modify: `components/sections/CinematicHero.tsx`
- Modify: `components/sections/TrustBar.tsx` — static partner strip (section 2 below).
- Create: `components/sections/SourceSpotlight.tsx`
- Modify: `lib/deals.ts` — add `getSpotlightDeal()`
- Modify: `components/sections/FeaturedDeals.tsx` — light tone. Keep `id="deals"`.
- Modify: `components/deals/DealCardView.tsx` — add a `tone` prop. `/deals` also renders this card on a dark page and must not change.
- Modify: `components/sections/NumbersBar.tsx`
- Modify: `components/primitives/AnimatedNumber.tsx` — reduced-motion gate (section 5 below). `AboutHero` also uses it; its output there must not change.
- Modify: `app/globals.css` — add the two `stat-3d` utilities (section 5 below). No new colour tokens, so `lib/tokens.ts` is untouched.
- Create: `components/sections/JamaicaOutline.tsx`
- Modify: `components/sections/QuoteCTA.tsx`
- Modify: `components/primitives/Button.tsx` — add the `solid-light` and `ghost-on-red` variants (section 6 below).
- Create: `components/sections/VisitShowroom.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- `getSpotlightDeal(): Promise<DealCard | null>` returns the first item of `getFeaturedDeals().deals`, or null. `DealCard` is the existing type in `lib/deals.ts` that `DealCardView` consumes (there is no `FeaturedDeal` type).
- `DealCardView({ deal, tone = "dark" }: { deal: DealCard; tone?: "dark" | "light" })`.
- `JamaicaOutline({ className }: { className?: string })` renders an inline SVG `<path>` of the island with `fill="currentColor"`. `role="img"` with `aria-label="Map of Jamaica"`.
- `AnimatedNumber` keeps its props. `suffix` stays supported for `AboutHero`; `NumbersBar` stops passing it and renders the suffix itself.
- `Button` `Variant` becomes `"primary" | "ghost" | "ghost-dark" | "solid-light" | "ghost-on-red"`.

**Target layout:** the client's mockup. At 1440×900, the hero, the partner strip and the top of the promo card must all be visible without scrolling. The vertical budget at 1440×900 is: header 80 + hero image area ≈ 442 + partner strip 88 + spotlight top padding 40 = 650, which leaves about 250px of the promo card above the fold.

**Shared homepage values** (apply to sections 3, 4, 6 and 7):
- Section padding is `py-16 md:py-24` (64 / 96px). Do not use `py-[var(--spacing-section-y)]` on the homepage: it resolves to 172px at 1440 and is the main cause of the empty bands. Where a section uses the `Section` primitive, pass `pad={false}` and set the padding in `className`.
- Section H2 is `font-display-tight uppercase text-[clamp(2.25rem,3.6vw,3.5rem)] leading-[0.95]`. Don't use `text-h2` (72px max) here; it is too large beside the shorter hero.
- Body copy on light is `text-mec-ink/70`. Hairlines on light are `border-mec-ink/10`.

**Section rhythm, top to bottom.** One dark band and one red band, everything else light:

| # | Section | Background | Text |
|---|---------|------------|------|
| – | Nav | `bg-mec-pure` | ink |
| 1 | Hero | photo + ink gradient | white |
| 2 | Partner strip | `bg-mec-pure`, `border-b border-mec-ink/10` | ink |
| 3 | SourceSpotlight | `bg-mec-mist` | ink |
| 4 | FeaturedDeals | `bg-mec-pure` | ink |
| 5 | NumbersBar | `bg-mec-ink` | white + red |
| 6 | QuoteCTA | `bg-mec-red` | white |
| 7 | VisitShowroom | `bg-mec-mist` | ink |
| – | Footer | `bg-mec-ink` | white |

1. **Hero (`CinematicHero`):**
   - **Size.** `min-h-[clamp(440px,58svh,540px)]` instead of `100svh`, with `pt-20` (80px) for the fixed nav and `pb-10`. At 375px wide use `min-h-0` with `pt-[calc(80px+2.5rem)] pb-10`, so the hero is only as tall as its content (target ≤ 520px at 375×812).
   - **Content position.** Vertically centred (`justify-center`, not `justify-end`), left-aligned, inside the same `max-w-[1440px] px-6 md:px-10` wrapper the nav uses so the headline lines up with the logo. Content block `max-w-[760px]`.
   - **Background.** `/images/hero-minott-warehouse.jpg`, `object-cover object-[70%_50%]` so the aisle and forklift stay in frame on the right and the labelled jugs fall under the dark side.
   - **Overlay.** One left-to-right gradient, ink at these stops: 96% at 0%, 88% at 32%, 45% at 58%, 5% at 100% (`bg-[linear-gradient(90deg,rgba(13,13,13,0.96)_0%,rgba(13,13,13,0.88)_32%,rgba(13,13,13,0.45)_58%,rgba(13,13,13,0.05)_100%)]`). Below `md`, use a flat `bg-mec-ink/75` instead, because the text spans the full width. Delete the top-to-bottom vignette (`to-mec-ink/85`): the hero now ends on a white strip and a dark bottom edge reads as a smudge.
   - **Remove** the drifting particles, the red light-sweep, the `1988` watermark, the bottom trust strip and the "Elite Distributor" chip. Over a busy photo at this height they are noise, and the mockup has none of them. 1988 still appears in the eyebrow.
   - **Type.**
     - Eyebrow `Jamaica’s Most Trusted Partner in Clean — Since 1988` (`Eyebrow tone="white"`).
     - H1 unchanged copy (`The premium standard in` / red `equipment & chemicals.`), `mt-4 font-display-tight uppercase text-[clamp(2.5rem,4.6vw,4.25rem)] leading-[0.95]`. It must sit on two lines at 1280 and 1440.
     - Lede: `Locally manufactured chemical solutions, backed by world-class equipment from 3M, San Jamar and Rubbermaid.` — `mt-4 max-w-[56ch] text-[clamp(1rem,1.15vw,1.125rem)] leading-relaxed text-mec-pure/90`.
   - **CTAs** (`mt-7 flex flex-wrap gap-4`): primary `See the Promotions` with arrow → `#deals`, and secondary `ghost-dark` `Explore Products` → `/products`.
     - Smooth scroll: `LenisProvider` does not expose `window.__lenis`. Use `useLenis()` from `lenis/react` and call `lenis.scrollTo("#deals", { offset: -80 })`. When `useLenis()` returns nothing (reduced motion bypasses Lenis), fall back to `scrollIntoView()`; the `scroll-mt-20` on `#deals` (section 4) handles the offset.
     - `FeaturedDeals` renders nothing when there are no live deals, so `#deals` may not exist. `app/page.tsx` passes `hasDeals: boolean` to the hero; when false, the primary CTA is a plain link to `/deals`.
   - **Motion.** Keep the SplitText entrance and the veil. Halve the scroll parallax (`yBg` 0→12%, `scaleBg` 1→1.06) and keep pointer parallax on the background only (drop the content `x` lean). Both `useGSAP` blocks keep their `if (reduced) return` gate and `dependencies: [reduced]`; delete the tweens for the removed elements.
2. **`TrustBar` → static partner strip.** With Purell gone there are three logos; a duplicated marquee of three reads as filler, and the mockup shows a static row.
   - `bg-mec-pure border-b border-mec-ink/10`. From `lg`: one row, `h-[88px]`, in the `max-w-[1440px] px-6 md:px-10` wrapper.
   - Left: the label `Trusted Distribution Partners` (mockup copy; replaces "Proud Elite Distributor For"), `text-[11px] font-semibold uppercase tracking-[0.16em] text-mec-ink/70 max-w-[14ch]`, with a `border-l-2 border-mec-red pl-4` bar.
   - Right of it: the three `BRAND_SLOTS` wordmarks rendered bare (no bordered chip, no tooltip), each capped at `max-h-10`, spread with `flex-1 justify-around` and separated by `h-6 w-px bg-mec-ink/15` dividers.
   - Below `lg`: `py-5`, the label centred on its own line, then the wordmarks in `grid grid-cols-3 gap-4` capped at `max-h-7`, no dividers.
   - Delete the GSAP tween, the hover state and the edge fades. The component no longer needs `"use client"`.
3. **`SourceSpotlight`:** a new server component. `bg-mec-mist`, padding `pt-10 pb-16 md:pb-20` (the short top padding is what gets the promo card above the fold).
   - Grid: `grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:items-center`. With no live deal, the left column is the only child and is capped at `max-w-3xl`.
   - **Left column.**
     - Eyebrow `Cleaner Spaces. Healthier People.` — `.eyebrow text-mec-red`, no leading rule (as in the mockup).
     - H2 `Your #1 Source for All Your Cleaning Solutions.` — the shared H2 style, `mt-3 max-w-[18ch] text-mec-ink`.
     - Do not invent the unfinished intro sentence. There is no paragraph between the H2 and the columns.
     - Two columns: `mt-8 grid gap-6 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-mec-ink/15`; first cell `sm:pr-8`, second `sm:pl-8`. Each cell is `flex gap-4`: a lucide icon (`FlaskConical` for chemicals, `Cog` for equipment) at `h-10 w-10 shrink-0 text-mec-red` with `strokeWidth={1.5}`, then:
       - title `text-[13px] font-bold uppercase tracking-[0.08em] text-mec-ink`
       - body `mt-1 text-sm leading-snug text-mec-ink/70`
       - **CHEMICALS** — `Locally manufactured and certified by the Bureau of Standards, as well as imported solutions.`
       - **EQUIPMENT** — `World-class brands and budget-friendly, reliable options.`
     - Text link `Explore Our Products` + arrow → `/products`: `mt-8 inline-flex items-center gap-2 border-b border-mec-red pb-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-mec-red`.
   - **Right column: promo card** (only when `getSpotlightDeal()` returns a deal).
     - Shell: `overflow-hidden rounded-md bg-mec-pure shadow-card`, `grid sm:grid-cols-[1fr_1.1fr]`, `lg:min-h-[300px]`.
     - Text side, `p-6 sm:p-8 flex flex-col justify-center`:
       - eyebrow `Featured Offer`: a `h-px w-8 bg-mec-red` rule, then `.eyebrow text-mec-ink/60`
       - product name `mt-4 font-display-tight uppercase text-[clamp(2rem,3vw,3rem)] leading-[0.95] text-mec-ink line-clamp-3`
       - copy (`deal.description ?? deal.product.shortDescription`) `mt-3 text-sm text-mec-ink/70 line-clamp-2`
       - `Shop the Promotions` primary `Button` with arrow → `#deals`, `mt-6 self-start px-5 py-3 text-[12px]`
     - Image side: `relative bg-mec-mist min-h-[220px]`, the product image (`deal.variant?.imagePath ?? deal.product.imagePath`) `fill object-contain p-6`. Below `sm` the image comes first (`order-first aspect-[16/10]`).
     - Badge, top-right of the image (`absolute right-4 top-4`):
       - percent deals: a round seal `grid h-24 w-24 place-items-center rounded-full bg-mec-red text-center text-mec-pure ring-4 ring-mec-pure`, with `SAVE` (`text-[11px] font-bold tracking-[0.12em]`) over `{percentOff}%` (`font-display text-[2.25rem]`)
       - custom-text deals: a pill with `dealLabel(deal)`, `rounded-pill bg-mec-red px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-mec-pure` (free text doesn't fit a circle)
     - No prices, ever.
4. **`FeaturedDeals`**, light tone.
   - `bg-mec-pure`, `py-16 md:py-24`, `scroll-mt-20` on the `#deals` element so the fixed nav doesn't cover the heading.
   - Header stays centred: `Eyebrow tone="red"`, H2 in the shared style with `text-mec-ink`, lede `text-mec-ink/70`. Grid `mt-12`.
   - Pass `tone="light"` to `DealCardView`. Light values:
     - card `border border-mec-ink/10 bg-mec-pure shadow-card`
     - image well `bg-mec-mist`
     - title `text-mec-ink`; variant line `text-mec-ink/60`; copy `text-mec-ink/70`
     - `View Deal` link `border-mec-ink/20 text-mec-ink hover:border-mec-red hover:text-mec-red`
   - The dark values stay the default, so `/deals` is pixel-identical to before.
5. **`NumbersBar`:** the one dark band on the page. It keeps the client's "3D numbers", rebuilt as a true extrusion.

   **What is wrong today** (see the critique): the grey copy is a second, 1.3×-scaled glyph that doesn't share an origin with the red one, so it reads as a rendering fault; the dividers have padding on one side only; the band is ~750px tall for ~300px of content; and the labels wrap to four lines of wide-tracked caps.

   **Content.** Exactly these four stats, in this order:

   | Figure | Suffix | Label line 1 | Label line 2 |
   |--------|--------|--------------|--------------|
   | `38` | `+` | `Years in business` | `Incorporated 1988` |
   | `2000` | `+` | `Stock product lines` | – |
   | `24` | `HR` | `Delivery in Kingston` | – |
   | `<JamaicaOutline>` | – | `Weekly islandwide delivery` | – |

   The client's first label, "Years in business — incorporated 1988", is split at the dash into the two lines; no words change.

   **The 3D effect: one technique, a hard stepped extrusion.**
   - Face colour `mec-pure` (#FFFFFF). Depth colour `mec-red` (#E10600). The depth runs down and to the right at 45°, in 1px steps with zero blur.
   - Depth is **8px from `lg` up** and **5px below `lg`**.
   - Delete the scaled grey ghost `<span>` entirely. There is one glyph per figure; the depth is drawn from that same glyph, so it can't misalign.
   - Add two utilities to `app/globals.css`, next to `.text-outline-pure`:
     - `.stat-3d` — for text. `text-shadow` with one entry per step: `1px 1px 0 var(--color-mec-red), 2px 2px 0 var(--color-mec-red), …` up to `5px 5px`; inside `@media (min-width: 1024px)` the list runs to `8px 8px`.
     - `.stat-3d-shape` — for the SVG. `filter` with one `drop-shadow(1px 1px 0 var(--color-mec-red))` per step: five of them, and eight inside the same media query. Chained drop-shadows accumulate, so this gives the same 5px / 8px depth as the text.
   - If the chained filter shows seams on the island's coastline in QA, switch `JamaicaOutline` to draw the depth itself (the same path repeated at 1px offsets under the face) and keep the depth values identical.
   - White faces on red depth, rather than the old red-on-grey, because the band sits directly above the red CTA: white numerals stay legible (red on ink is only ~4.4:1), and the red reads as the lit side of a solid object.

   **Figure row.**
   - Font: `font-display` (Bebas Neue), `text-[clamp(4rem,7.2vw,7rem)] leading-none tabular-nums text-mec-pure`. That is 64px at 375, ~74px at 1024 and ~104px at 1440.
   - Each figure is `flex items-baseline` with `pb-2 pr-2` so the depth never touches the label or the divider.
   - The number is `<AnimatedNumber>` with class `stat-3d` and no `suffix` prop.
   - The suffix is a sibling span: `ml-[0.1em] self-start mt-[0.1em] text-[0.45em] text-mec-red`, flat (no extrusion). `+` and `HR` get the same treatment, so `24HR` reads as a number with a unit.
   - `aria-label` on the figure gives the full value (`38+`, `2000+`, `24 hour`); the animated digits are `aria-hidden`.

   **Jamaica item.**
   - `<JamaicaOutline className="stat-3d-shape h-[0.72em] w-auto text-mec-pure" />` inside the same figure wrapper, so `em` is the numeral font size. 0.72em is the Bebas cap height: the island is exactly as tall as the digits (≈ 75px tall at 1440, ≈ 46px at 375) and, because the row is `items-baseline`, its bottom edge sits on the digits' baseline.
   - Same white face, same red depth, same direction and same step count as the numbers. That shared construction is what stops it looking like an odd one out. No stroke, no second colour, no pin.
   - For the path, use the public-domain Natural Earth outline of Jamaica. Fetch `https://raw.githubusercontent.com/johan/world.geo.json/master/countries/JAM.geo.json`, project lon/lat equirectangularly (scale longitude by `cos(18.1°)` so the island isn't stretched) into a viewBox 200 units wide with the height following from the aspect ratio (≈ 200×72), and hard-code the resulting `d` string. Commit the one-off conversion as `scripts/gen-jamaica-path.ts`.

   **Labels.**
   - `mt-6` below the figure row.
   - Line 1: `text-[13px] font-semibold uppercase leading-snug tracking-[0.14em] text-mec-pure`, `max-w-[22ch]`. Every label fits on one or two lines at 1440.
   - Line 2 (first stat only): `mt-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-mec-pure/55`.

   **Layout.**
   - Section: `bg-mec-ink py-16 md:py-20` (64 / 80px). Use `Section tone="dark" pad={false}` with that padding in `className`, plus `data-section="stats"` for QA. Add an `sr-only` H2 `MEC at a glance`. No visible heading or eyebrow.
   - From `lg`: `grid grid-cols-4`, no gap. Every cell is `px-10 border-l border-mec-pure/12`; the first cell is `pl-0 border-l-0`. Content is left-aligned. The dividers are neutral white hairlines running the full cell height, not red.
   - Below `lg` (including 375px): `grid grid-cols-2 gap-x-6 gap-y-10`, no vertical dividers. The third and fourth cells get `border-t border-mec-pure/12 pt-10` to separate the rows.
   - At 375px the widest figure (`2000+`, ≈ 125px at 64px type) must fit its ≈ 151px column with no horizontal scroll.
   - Resulting height at 1440: about 330px (down from ~750px).

   **Motion.**
   - Count-up stays, via `AnimatedNumber`. Use `duration={1.6}` for `2000` and the default 1.2 for the others.
   - Each cell is wrapped in `RevealOnScroll` with `delay={i * 0.08}`. The Jamaica cell uses the same reveal; it has no count-up.
   - **Reduced motion.** `AnimatedNumber` currently animates through framer's imperative `animate()`, which `MotionRoot`'s `reducedMotion="user"` does not cover. Read `useReducedMotion()` from `@/lib/use-reduced-motion`; when it is true, set the motion value straight to `to` (no tween, no wait for in-view). `RevealOnScroll` is already covered by `MotionRoot`.
6. **`QuoteCTA`:**
   - `bg-mec-red` with the existing wipe-in. Padding `py-16 md:py-24` instead of the section token.
   - Remove the `★ Request a Quote` eyebrow and the `Browse Products` button.
   - H2 `Your space. Our standard.` — `max-w-3xl font-display-tight text-[clamp(2.5rem,5.5vw,5rem)] leading-[0.95] text-mec-pure` (down from a 7rem max). Lede `mt-5 max-w-2xl text-lg text-mec-pure` at full opacity: white at 80–90% on this red drops below 4.5:1.
   - Buttons (`mt-8 flex flex-wrap gap-4`):
     - `Contact Us` → `/contact`, variant `solid-light`, with arrow: `bg-mec-pure text-mec-ink px-7 py-4 hover:bg-mec-ink hover:text-mec-pure`. The `primary` variant is red and would be invisible on the red band.
     - `Talk to a Consultant` → `tel:+18769064835`, variant `ghost-on-red`: `border border-mec-pure/70 text-mec-pure px-7 py-[15px] hover:border-mec-pure hover:bg-mec-pure hover:text-mec-ink`.
   - **Bug fix:** "Talk to a Consultant" disappears on hover because `ghost-dark` hovers to red text and a red border on the red background. The `ghost-on-red` variant above hovers to a white fill with ink text. Neither new variant renders the inner red hover-fill span that `primary` uses.
   - Phones: `mt-8` label `Or call us directly` (`text-sm text-mec-pure`), then both `PHONES` as `tel:` links in `font-display text-[1.75rem] tracking-[0.02em] text-mec-pure hover:underline underline-offset-4`, in a row with `gap-x-8 gap-y-2 flex-wrap` (they stack at 375px). Labels read `+1 (876) 906-4835` and `+1 (876) 968-5857`.
7. **`VisitShowroom`:**
   - `bg-mec-mist py-16 md:py-24`. Grid `grid gap-10 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:items-stretch`.
   - **Left.** Heading `Visit Our Showroom` in the shared H2 style. Then three rows, `mt-8 divide-y divide-mec-ink/10 border-y border-mec-ink/10`, each `flex gap-4 py-5` with a lucide icon (`MapPin`, `Clock`, `Phone`) at `h-5 w-5 mt-0.5 text-mec-red`, a caption (`Address`, `Opening hours`, `Phone`) in `font-mono text-[11px] uppercase tracking-[0.12em] text-mec-ink/55`, and the value in `mt-1 text-base font-medium text-mec-ink`:
     - Address `14½ Retirement Road, Kingston 5, Jamaica` (use `SHOWROOM_ADDRESS`, and add a `SHOWROOM_FULL_ADDRESS` constant).
     - Opening hours `Mon–Fri, 8:00 AM – 4:30 PM`. This is the existing footer value; also add it as an `OPENING_HOURS` constant and use it in the Footer.
     - Both phones as `tel:` links.
   - `Get Directions` primary `Button` with arrow, `mt-8`, `external` → `https://www.google.com/maps/dir/?api=1&destination=` + encoded full address.
   - **Right.** The embedded map in a frame `overflow-hidden rounded-lg border border-mec-ink/10 shadow-card`, `h-[320px] lg:h-full lg:min-h-[420px]`: `<iframe src="https://www.google.com/maps?q=<encoded full address>&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Map to Minott Equipment & Chemicals showroom">` filling the frame (`h-full w-full border-0`). Below `lg` the map comes after the text.
   - Check that `next.config.ts` / `proxy.ts` don't set a CSP `frame-src` that blocks google.com. If they do, allow `https://www.google.com`.
8. **`app/page.tsx` order:** `CinematicHero, TrustBar, SourceSpotlight, FeaturedDeals, NumbersBar, QuoteCTA, VisitShowroom` → Footer (via chrome). Drop `LegacyBanner` from home; it stays on About (fix its "used on both About and Home" comment). Update the comment at the top of the file. The page becomes `async` to compute `hasDeals` for the hero.

- [ ] **Step 1:** Convert the backdrop image and generate the Jamaica path script and output.
- [ ] **Step 2:** Implement the sections above.
- [ ] **Step 3:** `npx tsc --noEmit && npm run lint && npm run build` succeed. `grep -n "spacing-section-y" components/sections/{NumbersBar,QuoteCTA,FeaturedDeals,SourceSpotlight,VisitShowroom}.tsx` → no hits.
- [ ] **Step 4: QA (playwright).** Seed at least one live percent-off deal in the dev DB through `/portal/deals` or the Prisma script, so the spotlight renders. Save shots under `/tmp/qa/task3/`.
  - At 1440×900, screenshot `/` with no scroll. Confirm the hero headline is on two lines, the partner strip is fully visible, and at least 200px of the promo card is above the fold.
  - Take wheel-scrolled shots of every section at 1440 and 375. Compare the backgrounds against the section rhythm table.
  - Click `See the Promotions` and confirm the "Featured Deals" heading lands just below the nav, not under it.
  - Hover "Talk to a Consultant" and "Contact Us" and screenshot each to prove the text stays visible.
  - Open `/deals` and confirm its cards are still dark.
  - Run with `prefers-reduced-motion: reduce` once: the hero renders, and the stats show their final values immediately.
- [ ] **Step 5: Stats section QA against the spec.** Scroll `[data-section="stats"]` into view, wait 2.5s for the count-up, and take an element screenshot at 1440×900 (`stats-1440.png`) and 375×812 (`stats-375.png`). Read both images and check every line below. Fix and re-shoot until all pass.
  - Measured with `page.evaluate`:
    - section height is ≤ 360px at 1440 and ≤ 520px at 375
    - the four figure rows have the same bottom edge within 2px at 1440 (per row of two at 375)
    - `document.documentElement.scrollWidth === clientWidth` at 375
    - the figures read `38`, `2000`, `24` after the wait
  - Visual, both widths:
    - there is no grey or oversized ghost digit anywhere
    - each numeral is white with a solid red depth going down-right, with no gap between face and depth
    - the depth is 8px at 1440 and 5px at 375
    - the Jamaica outline has the same white face and the same red depth, is as tall as the digits, and sits on their baseline
    - the `+` and `HR` suffixes are red, flat, and top-aligned
    - the red depth never touches a label or a divider
  - Visual, 1440: four columns, three full-height neutral hairline dividers, equal 40px padding on both sides of each divider, and no label longer than two lines.
  - Visual, 375: a 2×2 grid, a hairline between the two rows, no vertical dividers, and `2000+` fully inside its column.
- [ ] **Step 6:** Commit `feat(home): shorter hero with Minott backdrop, #1 source + promo spotlight, new stats with Jamaica map, showroom block`.

### Task 4: Product listing — no sidebar, global search, quantity on Add to Quote

**Files:**
- Modify: `app/products/all/page.tsx`
- Delete: `components/products/ProductFilterSidebar.tsx`, plus any filter-option helpers in `lib/products.ts` that nothing else uses. Grep first, and keep anything the portal uses.
- Create: `components/products/CategoryChips.tsx`
- Modify: `components/products/ProductSearchBar.tsx`
- Modify: `components/quote/AddToQuoteButton.tsx`
- Modify: `components/products/VariantSelector.tsx`

**Interfaces:**
- `CategoryChips({ categories, activeSlug, q }: { categories: { slug: string; name: string; count: number }[]; activeSlug?: string; q?: string })` is a server component: a horizontal, wrapping row of links. `All` → `/products/all`, and each category → `/products/all?category=<slug>`. The active chip is red. Chips drop `q` (picking a category clears the search).
- `AddToQuoteButton` gains `quantity?: number` (it already has one) and reads `useQuoteCart().items` to find the line with `variantId === product.variantId`.

**Changes:**
1. **Listing page:**
   - Remove the sidebar grid and render the product grid full width, `grid-cols-2 md:grid-cols-3 xl:grid-cols-4`.
   - Put `CategoryChips` under the search bar.
   - Keep `ProductSort`.
   - Drop the `form/industry/volume/color` searchParams from the page. Still use `category`, `q` and `sort`.
   - Keep the `getCategoriesWithCounts()` call; it feeds the chips.
2. **Global search.** In `ProductSearchBar`, when pushing a non-empty query on `/products/all`, build the params from scratch: `q`, plus `sort` if present. That drops `category` and any filter. When the query is cleared, push `/products/all` with only `sort`. The listing then searches across all categories, and the heading shows "Search results" when `q` is set and no category is active.
3. **Quantity on Add to Quote:**
   - The button label shows the cart quantity once the line is in the cart: `In Quote · {qty}` with a `+` icon, and clicking it adds `quantity` more. With nothing in the cart it shows `Add to Quote`. The 1.6s "Added" flash shows `Added · {newQty}`.
   - The cart state is only known after hydration, so render the plain label until mounted. Use the provider's hydrated items; there's no SSR mismatch because the provider starts empty.
   - On the product detail page (`VariantSelector`), add a quantity stepper (− [n] +, min 1, max 999, numeric input) left of the button and pass it as `quantity`.
   - Cards keep a single-click add of 1, but show `In Quote · N`.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `npx tsc --noEmit && npm run lint && npm run build` succeed. `grep -rn ProductFilterSidebar app components` → no hits.
- [ ] **Step 3: Manual check (playwright).**
  - On `/products/all?category=mats`, type "glove" in the search. The URL becomes `/products/all?q=glove` and the results include products outside Mats.
  - Clear the search: the URL is `/products/all`.
  - On a card, click Add twice → `In Quote · 2`.
  - On a detail page, set the stepper to 5 and add → `In Quote · 5`. Navigate to `/quote` and the line qty is 5.
  - Screenshot `/products/all` at 1440 to confirm there's no white-space gap.
- [ ] **Step 4:** Commit `feat(products): full-width listing with category chips, global search, quantity on Add to Quote`.

### Task 5: Custom-logo mats

**Files:**
- Modify: `prisma/schema.prisma` — `InquiryItem` gains `logoFile String?` (stored name only) and `logoOriginalName String?`. Migration: `npm run db:migrate -- --name inquiry_item_logo`.
- Create: `lib/quote-logos.ts` (server-only). Mirror `lib/application-files.ts`. `DIR = data/quote-logos`.
- Create: `lib/quote-logos-shared.ts` — `LOGO_ACCEPT = "image/png,image/jpeg,application/pdf"`, `LOGO_MAX_BYTES = 10 * 1024 * 1024`, and `isLogoCategory(slug: string): boolean` (returns `slug === "mats"`).
- Create: `lib/actions/quote-logo.ts` (`"use server"`)
- Create: `scripts/check-quote-logos.ts`
- Create: `app/portal/(protected)/requests/[id]/logo/[itemId]/route.ts`
- Create: `components/products/CustomLogoField.tsx` (client)
- Create: `components/products/CustomLogoBanner.tsx` (server), plus `public/images/mats-custom-logo.jpg` — the generated image at `assets/client-review-2026-10/mats-custom-logo.png`, converted to JPEG q82.
- Modify: `components/quote/QuoteCartProvider.tsx`, `components/products/VariantSelector.tsx`, `components/products/ProductDetailActions.tsx` (pass the category through), `components/quote/QuotePageClient.tsx`, `lib/actions/inquiries.ts`, `app/products/all/page.tsx` (render the banner when `category === "mats"`), `app/portal/(protected)/requests/[id]/page.tsx`, `app/portal/(protected)/quotes/[id]/page.tsx`, `app/portal/(protected)/history/[id]/page.tsx`, `emails/inquiry-notification.tsx`, `lib/email/send-inquiry-emails.tsx`.

**Interfaces:**
- `lib/quote-logos.ts`:
  - `validateLogo(file: File, head: Uint8Array): { ok: true; ext: "png" | "jpg" | "pdf" } | { ok: false; error: string }` checks size ≤ `LOGO_MAX_BYTES`, size > 0, and the magic bytes. PNG starts `89 50 4E 47`, JPEG starts `FF D8 FF`, PDF starts `25 50 44 46`. The extension comes from the magic bytes, not `file.type`.
  - `saveLogo(file: File): Promise<{ ok: true; token: string } | { ok: false; error: string }>` — `token = ${randomUUID()}.${ext}`.
  - `isLogoToken(token: unknown): token is string` — regex `^[0-9a-f-]{36}\.(png|jpg|pdf)$` on a UUID shape like `NAME_RE`.
  - `logoExists(token: string): Promise<boolean>`
  - `readLogo(token: string): Promise<{ body: Buffer; mime: string } | null>`
- `uploadQuoteLogo(formData: FormData): Promise<{ ok: true; token: string; fileName: string } | { ok: false; error: string }>` reads field `logo`, rate-limits with `checkRateLimit("quote-logo:" + ip, { max: 20, windowMs: 3_600_000 })` (get the IP from `lib/request-ip.ts`), and returns `fileName` = original name truncated to 120 chars. Server Actions already allow 8 MB bodies (`next.config.ts`); raise `serverActions.bodySizeLimit` to `"11mb"`.
- `QuoteItem` gains `logo?: { token: string; fileName: string }`. `addItem(item, quantity, logo?)`: if a logo is passed, set or replace it on the line. Otherwise keep the line's existing logo.
- Items JSON posted by the quote page gains `logoToken?: string` and `logoFileName?: string`.

**Behaviour:**
1. **Product detail, for mats only** (`isLogoCategory(listing.categorySlug)`):
   - Above the stepper and button, `CustomLogoField` shows a checkbox `Add Custom Logo` with an `Optional` pill and the subcopy `Personalize this mat with your company logo, colours, or design.`
   - When the box is checked, show a dashed upload box: `Upload Logo Image — PNG, JPG, or PDF (max 10 MB)` with a `Choose File` button, the chosen file name, and a remove ×.
   - Note line: `Our team will review your logo and confirm artwork, pricing, and lead time in your quote.`
   - Upload happens immediately on file choice through `uploadQuoteLogo`, with a spinner and errors shown inline.
   - Add to Quote is disabled while uploading, and while the box is checked with no uploaded logo.
   - On add, pass the logo to `addItem`. Match the mockup `image6.png`.
2. **Mats listing banner** (`CustomLogoBanner`, only on `/products/all?category=mats`):
   - A dark rounded card with the image on the right, eyebrow `Custom Logo Mats`, title `Add Your Logo`, and body `Select a mat, click “Add to Quote,” and upload your logo image. A member of our sales team will review your request and get back to you with pricing, artwork confirmation, and lead time.`
   - Place it beside the H1 on `lg`, stacked below on mobile, per mockup `image5.png`.
3. **Quote page:** a line with a logo shows `Custom logo: {fileName}` with a "Remove logo" link (it clears `logo` on the line). The serialized items include `logoToken` / `logoFileName`.
4. **`submitQuote`:** per line, if `isLogoToken(i.logoToken) && await logoExists(i.logoToken)`, set `logoFile` and `logoOriginalName` (sliced to 120). Otherwise leave both null. An invalid token never fails the quote. Apply the same to `lib/integration/create-quote.ts`? **No** — the integration API has no uploads; leave it.
5. **Staff route** `GET /portal/requests/[id]/logo/[itemId]`:
   - Session via `getPortalSession()`.
   - Admin → allowed. Rep → allowed only if the inquiry's company `salesRepId` is the rep's own (reuse the scoping helper in `lib/sales.ts` that `quotes/[id]` uses).
   - Anyone else, missing item, item not on that inquiry, or a missing file → `404`.
   - Respond with the file's MIME, `Content-Disposition: inline; filename="<sanitized original>"`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`.
6. **Displays:**
   - The `requests/[id]` and `quotes/[id]` item rows show `Custom logo · {logoOriginalName}` linking to the route, opening in a new tab.
   - `history/[id]` (customer) shows only `Custom logo attached` text, no link.
   - The staff notification email shows `Custom logo attached — view in portal` on that line. The customer confirmation email shows `Custom logo attached`.

- [ ] **Step 1: Write `scripts/check-quote-logos.ts`** (imports the pure functions; no DB needed). Assertions:
  - `validateLogo` accepts a PNG header (`[0x89,0x50,0x4e,0x47,...]`), a JPEG header and a PDF header (`%PDF`).
  - It rejects a GIF header, an HTML file named `.png` with type `image/png`, a 0-byte file, and an 11 MB file.
  - `isLogoToken` accepts `crypto.randomUUID() + ".png"` and rejects `"../x.png"`, `"abc.png"`, `UUID + ".exe"` and `UUID + ".png/../a"`.
  - A round trip `saveLogo` → `logoExists` → `readLogo` works, with `DIR` overridden through `process.env.QUOTE_LOGO_DIR` pointing at a tmp dir. `lib/quote-logos.ts` reads `QUOTE_LOGO_DIR ?? path.join(process.cwd(), "data/quote-logos")`.
  Since `server-only` throws outside Next, run it with `npx tsx --conditions=react-server scripts/check-quote-logos.ts`. If that doesn't satisfy `server-only`, move the pure helpers into `lib/quote-logos-core.ts` without `server-only` and re-export them.
- [ ] **Step 2:** Run it. Expected: it fails (module missing).
- [ ] **Step 3:** Implement the schema, migration, `lib/quote-logos*.ts` and the action.
- [ ] **Step 4:** Run the check script. Expected: `all quote-logo checks passed`.
- [ ] **Step 5:** Implement the cart, detail UI, banner, quote page, `submitQuote`, route, displays and emails.
- [ ] **Step 6: Access check.** With `npm run dev` running, submit a guest quote for a mat with a PNG logo, then `curl`:
  - no cookie → 404
  - a customer session → 404
  - an admin session → 200 with `content-type: image/png`
  - a rep session not assigned to the company → 404
  For sessions, sign in via the better-auth API (`/api/auth/sign-in/email`) with seeded users. Create a rep and a customer with `prisma/seed`-style scripts if none exist, and delete them afterwards.
- [ ] **Step 7:** Load the quote page with a pre-release cart line (`localStorage.mec_quote_cart_v2 = '[{"productId":1,"variantId":1,"slug":"x","name":"X","sku":"S","variantLabel":"","imagePath":"/images/product-placeholder.png","categorySlug":"mats","quantity":1}]'`). It renders and submits with no logo.
- [ ] **Step 8:** `npx tsc --noEmit && npm run lint && npm run build` succeed.
- [ ] **Step 9:** Update `CLAUDE.md` (the Data & admin section). Add one bullet on custom-logo mats: storage dir, route, token flow, and that `data/quote-logos/` must be on the persisted volume. It already is, because `data/` is the volume.
- [ ] **Step 10:** Commit `feat(mats): custom logo upload on mat quotes, private storage, staff viewing route`.

### Task 6: Final QA and client asks

**Files:**
- Create: `docs/reviews/2026-11-17-client-asks.md`
- Modify: `docs/reviews/2026-10-23-final-client-review-tasks.md` — tick the completed items.

- [ ] **Step 1:** `npm run build` and `npm run lint` are clean on the branch head.
- [ ] **Step 2:** Do a full playwright pass of the 12 pages in Review Focus #4 at 1440 and 375, saved to `/tmp/qa/final/`. The controller reviews the images.
- [ ] **Step 3:** Write the asks doc, listing everything this plan left out and every assumption the client should confirm:
  - MECPro logo
  - Read Across Jamaica photos
  - showroom hours (we used Mon–Fri 8:00–4:30 from the old footer) and whether Saturday opening applies
  - Careers content
  - the Privacy Notice text
  - social media URLs beyond Facebook
  - "Minott Certifications" — what the client meant by their "?"
  - the SKU corrections table (it was empty)
  - the rest of the sentence "From our in-house chemical manufacture to …"
  - years: home shows 38+ (from 1988) while About shows 40+, and Chester's 1989 start postdates the 1988 incorporation — confirm
  - whether the old 929-xxxx numbers are fully retired, and the correct WhatsApp number
  - confirm dropping Tailored Solutions and Contact from the top menu (they're in the footer)
  - homepage design calls to confirm: the stats numerals are now white with a red 3D depth (they were red on grey); the partner strip is a static row labelled "Trusted Distribution Partners", as in the client's mockup (it was a scrolling "Proud Elite Distributor For" carousel); the first featured deal appears both in the promo card and in the Featured Deals grid
- [ ] **Step 4:** Commit `docs: client review status + outstanding client asks`.
