# Final MEC Website Review — Task List

Source: `Final MEC Website Review (1).docx` (client review of https://mce.floproltd.com/, comments by Mia Minott, 21 Oct 2026).
Images from the doc are saved in `assets/client-review-2026-10/`.

Legend: **[Q]** = needs client clarification before/while doing it.

---

## 1. Global — Navigation / Header

- [ ] **1.1 Sticky header on every page.** Main menu banner must stay visible (sticky) on all pages while scrolling. (`components/layout/Nav.tsx`)
- [ ] **1.2 Restructure top-level menu** to these items:
  Login · Quote · Home · Products · Special Offer · About Us · Social Responsibility · Search Product
  - "Login" → `/portal/sign-in` (replaces "Accounts Portal")
  - "Quote" → `/quote`
  - "Special Offer" → `/deals`
  - "Search Product" → global product search (see 5.2)
  - Solutions is not in the list → drop from top nav? **[Q]**
- [ ] **1.3 Keep the secondary/bottom nav strip** (Visit showroom, etc.) **on Products pages only**; hide it everywhere else.
- [ ] **1.4 Fix: banner only renders correctly in fullscreen.** Nav breaks at non-fullscreen / narrower desktop widths — make it responsive at all window sizes (likely needs collapsing to the mobile menu sooner given 8 items).

## 2. Home Page

### Hero
- [ ] **2.1 More white space + promotions visible above the fold.** Rebalance hero so the promo/featured-deal block is visible without scrolling; hero CTA should scroll down to the promotions section. (`CinematicHero.tsx`, `FeaturedDeals.tsx`)
- [ ] **2.2 Replace hero backdrop** with the new warehouse image showing real Minott product labels → `assets/client-review-2026-10/hero-backdrop-minott-labels.png` (optimise into `public/images/`).
- [ ] **2.3 Fix incorporation year → 1988.** Watermark ("1990") and the eyebrow "Since 1990" in the hero; also the footer "since 1990" (`CinematicHero.tsx:241,252`, `Footer.tsx:42`). Remove "Purell." from the hero subcopy too (see 2.4).

### Brand logos
- [ ] **2.4 Scrub Purell mentions** from copy/metadata (`DualPlay.tsx:84`, `FounderStory.tsx:19`, `app/layout.tsx:45,49`, `CinematicHero.tsx:268,304`).
- ⏸ **2.4b DEFERRED — Replace Purell logo with the MECPro logo** in the trusted-partners strip (`BrandWordmarks.tsx`). Waiting on MECPro logo from client.

### Section below brand logos
- [ ] **2.5 Rewrite the "Solutions for every facility" section** with:
  - Headline: **"YOUR #1 SOURCE FOR ALL YOUR CLEANING SOLUTIONS."**
  - Intro: "From our in-house chemical manufacture to …" **[Q]** sentence is unfinished in doc
  - Two columns: **CHEMICALS** — "Locally manufactured, certified by the Bureau of Standards" / **EQUIPMENT** — "World-class brands and budget-friendly, reliable options — imported solutions …" **[Q]** confirm final copy (third "Facility Solutions" column dropped?)

### Stats / "3D" numbers section (`NumbersBar.tsx`)
- [ ] **2.6 Update the 4 stats:**
  1. Years — recalculated from 1988 incorporation (→ 38+) **[Q]** About page keeps "40 years" — reconcile
  2. **2000+** Stock Product Lines
  3. **24-hour** delivery in Kingston
  4. **Jamaica map shape** (instead of a number) — "Weekly Island-wide delivery"

### Bottom CTA section (`QuoteCTA.tsx`)
- [ ] **2.7 Remove "Request a Quote"** button; keep **Contact Us** and **Talk to a Consultant**.
- [ ] **2.8 Fix bug: "Talk to a Consultant" disappears on hover** (hover text/background colour clash).
- [ ] **2.9 Phone numbers:** replace with **+1 (876) 906-4835** and **+1 (876) 968-5857** (everywhere phones appear — footer, contact, CTA, `lib/constants`).

### Footer / bottom-of-page info
- [ ] **2.10 Certifications & Memberships block** with **JMEA** and **ISSA** logos (`assets/client-review-2026-10/logo-jmea.jpg`, `logo-issa.png`).
- ⏸ **2.11 DEFERRED — "Minott Certifications"** — client left a "?" comment on this line. On hold for now.
- [ ] **2.12 "Visit our Showroom"** block: opening hours, address, embedded Google Map. **[Q]** confirm hours + address.
- [ ] **2.13 Footer links:** Careers, Company Information, Privacy Notice, Social Media. **[Q]** need content for Careers / Privacy Notice pages and social URLs.

## 3. About Us

- [ ] **3.1 Hero stats** (`AboutHero.tsx`): keep "40 years", replace the other three with:
  - "Nationwide coverage, multi-sector expertise."
  - "2,000+ core products in stock — with custom and special-order solutions available upon request."
  - "Delivery island-wide, with twice-weekly delivery to major cities."
- [ ] **3.2 Our Story — Chester:** change **1984 → 1989** (`OurStory.tsx:22`).
- [ ] **3.3 Our Story — Mileydi:** replace text with:
  > Fifteen years ago, Mileydi Minott stepped in with courage and vision, taking the reins and leading the company through new challenges. Building on a proud legacy, she spearheaded the diversification of MEC's product lines and enhanced service capabilities, driving dynamic growth across new and existing markets.
- [ ] **3.4 Today & Beyond:** replace the second "build" with **"nurture"** (`OurStory.tsx:133` area).

> Note: Chester 1989 vs. incorporation 1988 (2.3) — confirm both dates are intended. **[Q]**

## 4. Products

- [ ] **4.1 Quantity on "Add to Quote".** When adding multiples of the same product, the button/card should show the quantity already in the quote (and/or a qty stepper). (`AddToQuoteButton`, `ProductCard`)
- [ ] **4.2 Global product search.** Search bar searches across all products, not just the current category.
- [ ] **4.3 Remove the filter sidebar** on product listings to eliminate the white-space gap under products; go full-width grid. (`ProductFilterSidebar.tsx`)
- [ ] **4.4 Specific product (SKU) fixes** — the SKU/Comment table in the doc is **empty**. **[Q]** request the SKU list from client.

## 5. Tailored Solutions

- [ ] **5.1** Heading present in the doc but no comments. **[Q]** confirm no changes (and whether Solutions stays in nav, see 1.2).

## 6. Social Responsibility

- ⏸ **6.1 DEFERRED — Add Read Across Jamaica images** to the CSR gallery (`CsrGallery.tsx`). Waiting on photos from client.

## 7. My Quote

- [ ] **7.1 Add industry options** to `lib/industries.ts` (affects quote form + registration form):
  - Beauty, Wellness and Personal Care
  - Automotive and Transportation
  - Construction

---

## Assets / info still needed from client

1. Final copy for "Your #1 source…" section — 2.5
2. Showroom hours + address — 2.12
3. Careers / Privacy Notice content + social media links — 2.13
4. SKU-level product corrections — 4.4
5. Confirm years-in-business figure (38 vs 40) and Chester date (1989) vs incorporation (1988)

Deferred (already requested, parked): MECPro logo (2.4b), Read Across Jamaica photos (6.1), Minott certifications (2.11).
