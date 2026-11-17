# Homepage Promotions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-managed promotion campaigns that rotate in a mockup-faithful card beside the homepage intro section.

**Architecture:** New `Promotion` Prisma model linked to `Category` (image + link come from the category). Pure parsing/status rules live in a Prisma-free module checked by a tsx script; reads in a server-only `lib/promotions.ts`; admin CRUD mirrors the Deals admin exactly; the homepage renders a client `PromotionCarousel` inside the existing `SourceSpotlight`.

**Tech Stack:** Next.js 16 / React 19 App Router, Prisma 7 + SQLite, Tailwind v4, Server Actions, Framer Motion (`MotionRoot reducedMotion="user"`).

**Spec:** `docs/superpowers/specs/2026-11-17-homepage-promotions-design.md` — read it first. Mockup: `assets/client-review-2026-10/requested-homepage-mockup.png`.

## Global Constraints

- All code work in `minott-web/`. Follow `/root/Work/github/Minott/CLAUDE.md` (named exports, `@/` alias, async `params`, Server Actions, reduced-motion gating, `useSyncExternalStore` for browser state).
- No test suite: verification is `npx tsc --noEmit`, `npm run lint`, tsx check scripts, Playwright screenshots. `npm run build` once at the end (Task 3).
- No prices anywhere. `Deal`, `FeaturedDeals`, `/deals`, and the hero's "See the Promotions" button are untouched.
- Dates: end date = `${yyyy-mm-dd}T23:59:59-05:00`; start date = `${yyyy-mm-dd}T00:00:00-05:00` (Jamaica, fixed UTC-5). Form round-trip uses `toLocaleDateString("en-CA", { timeZone: "America/Jamaica" })`.
- Copy limits: eyebrow ≤ 40, title ≤ 60, body ≤ 160, badgeText ≤ 14, ctaLabel ≤ 30 (default `"Shop the Promotion"`).
- Image = `category.imagePath ?? "/images/product-placeholder.png"`, rendered `object-contain` with padding on white. Link = `/products/${category.slug}`.
- Keep client-review wording: "Since 1988", no Purell; left column copy of `SourceSpotlight` unchanged.
- Dev QA: `SITE_PASSWORD= npx next dev -p 3100`, record the PID, stop ONLY that PID — never `pkill`/`killall`, never touch processes outside `minott-web/`. Playwright from `/tmp/node_modules`, `executablePath: '/root/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell'`.
- Local DB is `prisma/app.db` (`DATABASE_URL="file:./prisma/app.db"`). Create the migration with `npx prisma migrate dev --name promotions`.

## Review Focus

1. Start date in the future → admin shows "Scheduled", homepage does not show it until that Jamaica day begins (pinned in Task 1 check script).
2. End date before start date → form error, nothing saved (Task 1 check script).
3. A promotion whose category is deleted → promotion is deleted with it (Cascade), no homepage crash (Task 1 schema).
4. Reduced-motion users and keyboard users → no autoplay with reduced motion; focus inside the card pauses rotation; dots are real buttons with labels (Task 3 QA).
5. Long admin copy at the limits (60-char title, 160-char body) → card height fixed, no layout shift between slides, no overflow on 390 px (Task 3 screenshots with max-length copy).

---

### Task 1: Promotion model, rules, and reads

**Files:**
- Modify: `minott-web/prisma/schema.prisma` (add `Promotion`, add `promotions Promotion[]` to `Category`)
- Create: migration via `npx prisma migrate dev --name promotions`
- Create: `minott-web/lib/promotion-rules.ts` (pure, no Prisma, importable from client)
- Create: `minott-web/lib/promotions.ts` (server-only reads)
- Create: `minott-web/scripts/check-promotions.ts`

**Interfaces:**
- Produces (`lib/promotion-rules.ts`):
  - `export const PROMO_LIMITS = { eyebrow: 40, title: 60, body: 160, badgeText: 14, ctaLabel: 30 } as const`
  - `export const DEFAULT_PROMO_CTA = "Shop the Promotion"`
  - `export type PromotionInput = { categoryId: number; eyebrow: string; title: string; body: string; badgeText: string | null; ctaLabel: string; startsAt: Date | null; endsAt: Date | null; active: boolean }`
  - `export function parsePromotionForm(get: (key: string) => string | null): { error: string } | { data: PromotionInput }` — trims; required eyebrow/title/body/categoryId (positive int); enforces limits (error names the field and limit); empty badge → null; empty ctaLabel → default; dates parsed per Global Constraints; invalid date → error; `endsAt < startsAt` → `"End date must be on or after the start date."`; active = `"on"` or `"true"`. Does NOT check the category exists (the action does).
  - `export type PromotionStatus = "Live" | "Scheduled" | "Expired" | "Inactive"`
  - `export function promotionStatus(p: { active: boolean; startsAt: Date | null; endsAt: Date | null }, now?: Date): PromotionStatus` — Expired if `endsAt <= now` (wins over Inactive, same as deals list); else Inactive if `!active`; else Scheduled if `startsAt > now`; else Live.
  - `export function toDateInput(d: Date | null): string` — `""` or Jamaica `yyyy-mm-dd`.
- Produces (`lib/promotions.ts`, starts with `import "server-only"`):
  - `export function livePromotionWhere(now?: Date): Prisma.PromotionWhereInput`
  - `export type PromoSlide = { id: number; eyebrow: string; title: string; body: string; badgeText: string | null; ctaLabel: string; href: string; imagePath: string }`
  - `export const getLivePromotions: () => Promise<PromoSlide[]>` — `cache()`d; live only; ordered `[sortOrder asc, id asc]`; maps category to `href`/`imagePath` per Global Constraints.

- [ ] **Step 1: Add the model.** Fields exactly as the spec's Data table; `category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)`, `ctaLabel String @default("Shop the Promotion")`, `active Boolean @default(true)`, `sortOrder Int @default(0)`, `@@index([categoryId])`. Run `npx prisma migrate dev --name promotions` → migration created and applied, client regenerated.
- [ ] **Step 2: Write `scripts/check-promotions.ts`** (run: `npx tsx scripts/check-promotions.ts`, prints `ok`) asserting with `node:assert/strict`, using a `get` built from a plain object:
  - valid minimal input → data with `badgeText === null`, `ctaLabel === "Shop the Promotion"`, `startsAt === null`, `endsAt === null`
  - `endsAt: "2026-10-31"` → `endsAt.toISOString() === "2026-11-01T04:59:59.000Z"`; `startsAt: "2026-10-01"` → `"2026-10-01T05:00:00.000Z"`
  - `startsAt: "2026-11-02", endsAt: "2026-11-01"` → error `"End date must be on or after the start date."`; same-day start/end → ok
  - title of 61 chars → error containing `"60"`; badge of 15 chars → error containing `"14"`; missing title → error; `categoryId: "abc"` → error
  - `promotionStatus`: with `now = new Date("2026-10-15T12:00:00Z")`: future start → `"Scheduled"`; past end + inactive → `"Expired"`; inactive, no dates → `"Inactive"`; active, past start, future end → `"Live"`
  - `toDateInput(new Date("2026-11-01T04:59:59Z")) === "2026-10-31"`; `toDateInput(null) === ""`
- [ ] **Step 3: Run it** → fails (module missing).
- [ ] **Step 4: Implement `lib/promotion-rules.ts` and `lib/promotions.ts`** per Interfaces.
- [ ] **Step 5: Run** `npx tsx scripts/check-promotions.ts` → `ok`; `npx tsc --noEmit` and `npm run lint` clean.
- [ ] **Step 6: Commit** `feat(promotions): Promotion model, form rules, live reads`.

### Task 2: Promotions admin

**Files:**
- Create: `minott-web/lib/actions/admin-promotions.ts`
- Create: `minott-web/components/admin/PromotionForm.tsx`, `minott-web/components/admin/DeletePromotionButton.tsx`
- Create: `minott-web/app/portal/(protected)/promotions/page.tsx`, `.../promotions/new/page.tsx`, `.../promotions/[id]/page.tsx`
- Modify: `minott-web/app/portal/(protected)/layout.tsx:15` (add `{ href: "/portal/promotions", label: "Promotions" }` right after Deals)

**Interfaces:**
- Consumes: Task 1 `parsePromotionForm`, `promotionStatus`, `toDateInput`, `PROMO_LIMITS`, `DEFAULT_PROMO_CTA`.
- Produces (`"use server"`): `export type PromotionFormState = { error?: string }`; `createPromotion(prev, formData)`, `updatePromotion(prev, formData)` (reads hidden `id`), `deletePromotion(formData)`, `movePromotion(formData)` (fields `id`, `direction` up/down) — same shapes, gating (`requireAdmin()`), redirect-to-list and swap/self-heal ordering as `lib/actions/admin-deals.ts`. Create appends: `sortOrder = (max sortOrder) + 1`. Actions verify the category exists → `"Please choose a valid category."`. Revalidate `"/"` and `"/portal/promotions"`.
- `PromotionForm({ action, categories, promotion? })` — `categories: { id: number; name: string }[]` (all categories, sorted by name; subcategories shown as `Parent › Child`); `promotion` serialized with dates via `toDateInput`. Inputs carry `maxLength` from `PROMO_LIMITS`; button label placeholder shows the default; native `type="date"` for both dates; active checkbox defaulting on. Mirror `DealForm` styling constants and Cancel link.

- [ ] **Step 1: Implement actions** per Interfaces (form values read via `(k) => formData.get(k) as string | null` into `parsePromotionForm`).
- [ ] **Step 2: Implement `PromotionForm` + `DeletePromotionButton`** (copy `DeleteDealButton`'s confirm pattern).
- [ ] **Step 3: Implement the three pages** (`requireAdminSession()` gate as Deals pages). List columns: Badge (red pill, or "—"), Title (+ eyebrow small above), Category, Status from `promotionStatus` + `starts …`/`ends …` Jamaica dates, ↑/↓, Edit, Delete. Empty state: "No promotions yet." + "New Promotion" button. Edit page → `notFound()` for unknown id.
- [ ] **Step 4: Add the sidebar link.**
- [ ] **Step 5: Verify** `npx tsc --noEmit`, `npm run lint` clean. Dev server QA (Global Constraints rules): sign in as `admin@example.com` / `test123` at `/portal/sign-in`; create 3 promotions (Paper Products / "October Feature" / "Save 15%" / `paper`; Gloves / "This Month" / "Save 10%" / `gloves`; Mats with no badge and a future start date); confirm list statuses (Live, Live, Scheduled), reorder works, edit round-trips dates, end-before-start shows the error, delete confirms. Leave the two live ones in the local DB for Task 3. Stop your server PID.
- [ ] **Step 6: Commit** `feat(promotions): admin list, create/edit form, reorder, delete`.

### Task 3: Homepage promotion carousel + mockup layout

**Files:**
- Create: `minott-web/components/sections/PromotionCarousel.tsx` (`"use client"`)
- Modify: `minott-web/components/sections/SourceSpotlight.tsx` (replace deal-based `PromoCard` with `PromotionCarousel` fed by `getLivePromotions()`; drop now-unused deal imports)
- Modify: `/root/Work/github/Minott/CLAUDE.md` (Data & admin: a "Homepage promotions" bullet; component list: `PromotionCarousel`; admin list mention `/portal/promotions`)

**Interfaces:**
- Consumes: Task 1 `getLivePromotions(): Promise<PromoSlide[]>`, `PromoSlide`.
- Produces: `PromotionCarousel({ slides }: { slides: PromoSlide[] })`.
- `getSpotlightDeal` stays exported and used by `app/page.tsx` (hero `hasDeals`); do not remove it.

- [ ] **Step 1: Build `PromotionCarousel`.** Card per mockup: white, rounded, `shadow-card`, two columns from `sm` (text left, image right; image on top below `sm`). Text column: red hairline + eyebrow (`eyebrow` utility, ink/60), title Bebas `font-display-tight` uppercase large, body ink/70, red primary button `ctaLabel →` linking `href` (use `Button`). Image column: `next/image` fill, `object-contain p-6`, red circular badge top-right with white ring when `badgeText` (if it matches `/^save\s+(.+)$/i` render "SAVE" small over the remainder large, as today's `PromoCard`; otherwise the text centered). Slides stacked in one grid cell (`grid [&>*]:col-start-1 [&>*]:row-start-1`) so height = tallest slide — no layout shift; inactive slides `opacity-0 pointer-events-none` + `aria-hidden` + `inert`. Rotation: 6000 ms interval; pauses on `mouseenter`/`focusin` (resume on leave/`focusout` outside), and while `document.visibilityState === "hidden"`; crossfade via CSS `transition-opacity duration-500` disabled under `useReducedMotion()`; no timer when reduced motion or `slides.length < 2`. Dots below the card (only when ≥ 2): `<button aria-label="Show promotion N of M" aria-current={active}>`; region wrapper `role="region" aria-roledescription="carousel" aria-label="Current promotions"`.
- [ ] **Step 2: Wire into `SourceSpotlight`.** `const slides = await getLivePromotions();` right column renders `<PromotionCarousel slides={slides} />` when `slides.length > 0`; otherwise left column alone (existing `max-w-3xl` behaviour). Match the mockup's proportions at 1440: left and right columns roughly equal, card ~300 px tall, section vertically tight under the strip.
- [ ] **Step 3: Verify** `npx tsc --noEmit`, `npm run lint`. Dev server QA: screenshots at 1440×900 and 390×844 with (a) 0 live promotions, (b) 1, (c) the Task 2 set of 2 live + a third live one with a 60-char title and 160-char body. Check: card beside intro at 1440 above the fold like the mockup; rotation advances after ~6 s; hovering pauses; dots switch; with `reducedMotion: 'reduce'` context no advance after 8 s; no horizontal overflow at 390. Compare side-by-side with the mockup and fix spacing. Stop your server PID.
- [ ] **Step 4: `npm run build`** → succeeds (a Google Fonts fetch failure is transient — rerun once).
- [ ] **Step 5: Update `CLAUDE.md`, commit** `feat(home): rotating admin-managed promotion card in mockup layout`.
