# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This repo is a marketing-site project for **Minott Equipment & Chemicals Limited** (a Jamaican chemicals/janitorial supplier). Two distinct zones:

- **Repo root** — source design materials, not code: `Minott_Chemicals_*.md/.docx` (design prompt, knowledge base, image-asset manifest), `Minott Brand Kit.png`, `assets/*.png` (original AI-generated source images), `docs/` (specs, plans, handoff). Read these for brand/content intent; don't ship them.
- **`minott-web/`** — the actual Next.js application. **All build/lint/dev commands and code work happen here.** `cd minott-web` first.

## Commands (run from `minott-web/`)

```bash
npm install         # also runs `prisma generate` (postinstall)
npm run dev         # next dev — http://localhost:3000
npm run build       # prisma generate && prisma migrate deploy && next build
npm run start       # serve the production build (Node server — NOT static)
npm run lint        # eslint (flat config, eslint-config-next)
npm run db:migrate  # prisma migrate dev (create/apply migrations in dev)
npm run db:seed     # populate categories + products (idempotent)
npm run db:studio   # browse the SQLite DB
```

After cloning: copy `.env.example` → `.env`, then `npm run db:migrate && npm run db:seed`.

There is no automated test suite. Verification is done via `npx tsc --noEmit`, `npm run build`, `npm run lint`, and manual click-through (see `docs/handoff/` and the plan in `docs/superpowers/plans/`).

## ⚠️ Next.js version

This is **Next.js 16 / React 19**, which has breaking changes vs. older training data. Per `minott-web/AGENTS.md`: read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code, and heed deprecation notices. `minott-web/CLAUDE.md` just re-exports `@AGENTS.md`. Specifics already adopted here:
- **Middleware is `proxy.ts`** (the `middleware.ts` convention is deprecated): `export function proxy(req)` + `export const config = { matcher }`.
- `cookies()`, `headers()`, and route `params`/`searchParams` are **async** (await them).
- Server mutations are **Server Actions** (`"use server"`); forms use them via `<form action={fn}>` or `useActionState`.

## Architecture

Multi-page App Router site backed by **SQLite via Prisma**. Public pages: Home (`app/page.tsx`), About, Solutions, Contact, plus a DB-driven Products catalog (`/products`, `/products/[category]`, `/products/[category]/[slug]`) and a quote builder (`/quote`). A single unified **Accounts Portal** (`/portal/*`) serves all three roles — admins, customers, and sales reps — behind one better-auth login, role-branched per page: admins manage products/categories, the inquiry inbox (`/portal/requests`), sales reps and other admin accounts (`/portal/admins`), and a read-only analytics page (`/portal/analytics`: demand by product/category, request trend, pipeline, top companies — aggregation in `lib/analytics.ts`, server-rendered chart primitives in `components/admin/AnalyticsCharts.tsx`, all bucketing in `America/Jamaica` time); sales reps get a CRM-lite view of their own customers and quotes; customers manage their own quote requests. Reads run in Server Components via `lib/products.ts`; mutations run through Server Actions in `lib/actions/`. The marketing **sections** in `components/sections/` are reused and redistributed across the public pages.

The root layout sets `export const dynamic = "force-dynamic"` so every route renders on demand — this keeps the nav category dropdown and catalog in sync with admin edits (Prisma reads are not auto-dynamic, so without this they would be prerendered stale).

Component folders:
- `components/sections/` — marketing page sections
- `components/products/` — `ProductCard`, `ProductDetailActions`, `SampleRequestForm`
- `components/quote/` — `QuoteCartProvider` (localStorage cart), `AddToQuoteButton`, `QuotePageClient`
- `components/admin/` — admin forms + controls
- `components/primitives/` — atoms: `Button`, `Card`, `Eyebrow`, `Container`, `Section`, `AnimatedNumber`
- `components/layout/` — `Nav`, `Footer`, `PublicChrome` (hides Nav/Footer only on `/preview`; the portal shares the public chrome), `PageTransition`
- `components/motion/` — global motion infra (see below)
- `lib/` — `db` (Prisma singleton), `products` (reads), `actions/*` (writes), `auth/session`, `constants`, `slug`, `cn`, `tokens`, `motion`, `use-reduced-motion`

All components use **named exports** (except Next.js `page`/`layout`/`proxy` which need default exports) and the `@/` path alias. Server components by default; add `"use client"` only for interactive/animated components.

## Data & admin

- **DB:** SQLite via **Prisma 7**, which has non-obvious requirements: a driver adapter is mandatory (`@prisma/adapter-better-sqlite3` in `lib/db.ts` + `prisma/seed.ts`), the datasource URL lives in `prisma.config.ts` (not `schema.prisma`), the seed command is configured there too (`migrations.seed`), and `next.config.ts` must externalize the native module (`serverExternalPackages`). Schema in `prisma/schema.prisma`; client singleton in `lib/db.ts`; seed in `prisma/seed.ts`.
- **Inquiries** (quote / sample / contact) are one unified `Inquiry` model with a `type` discriminator; quote line items live in `InquiryItem`; sales reps' per-quote notes live in `InquiryNote`. All inbound messages land in `/portal/requests` (which also shows rep notes read-only).
- **Admin auth:** the entire Accounts Portal runs on one DB-backed **better-auth** system (email/password, `disableSignUp`) — there is no separate `ADMIN_PASSWORD` gate. `User.role` selects behavior: `admin`, `customer`, or `rep` (reps are additionally one-to-one to a `SalesRep` record via `SalesRep.userId`). All three roles sign in at `/portal/sign-in` and land on the same `/portal` tree; each page under `app/portal/(protected)/` gates itself by role rather than by a per-portal layout. `getSalesSession()` (`lib/sales.ts`) additionally gates rep-only reads/mutations on an `active` linked rep and scopes them to that rep's own customers/quotes. A seed script creates one bootstrap admin (`admin@example.com` / `test123`); admins manage further admin accounts at `/portal/admins`.
- **Account onboarding (no admin-typed passwords):** admins provision customers/reps in the portal UI with a random password; the system emails a token-gated set-password link via better-auth's password-reset flow (`sendResetPassword` → `emails/account-invite.tsx`, 72h expiry, `lib/auth/provision.ts`). Invitees activate at `/set-password?portal=…&token=…`; `onPasswordReset` stamps `User.activatedAt` (drives the admin Pending/Active badge). Admins can "Resend invite". Provisioning is best-effort on email (succeeds with a console warning when `RESEND_API_KEY` is unset).
- **Env:** copy `.env.example` → `.env`. Required: `DATABASE_URL`, `SESSION_SECRET`. Optional: `RESEND_API_KEY` (email sending is skipped with a console warning when unset), `SITE_PASSWORD` (when set, public pages require a preview password at `/preview` — session cookie with a 4-hour signed expiry, the effective re-prompt interval since browsers restore session cookies; portal/set-password and the catalog JSON APIs keep their own auth and stay reachable; unset = public site).
- **Deployment:** Node server (`next start`) with the SQLite file persisted on disk — no longer static/Vercel-serverless.

## Motion system (the defining feature)

This site is animation-heavy. Three layers, all mounted in `layout.tsx`:

1. **Lenis smooth scroll** (`LenisProvider`) — owns scrolling (`html { scroll-behavior: auto }`). Its RAF loop is manually synced with GSAP's ticker so `ScrollTrigger` stays in lockstep. **When reduced-motion is on, Lenis is bypassed entirely** (returns plain children).
2. **GSAP** — used for imperative timelines (Hero SplitText reveal, pinned horizontal scroll in ProductCategories, count-ups, draw-SVG). Uses premium plugins (`SplitText`, `DrawSVGPlugin`, `ScrollTrigger`) that are free in modern GSAP.
3. **Framer Motion** (`MotionRoot` with `reducedMotion="user"`) — declarative reveals via the `RevealOnScroll` wrapper and shared variants in `lib/motion.ts`.

### Conventions you must follow

- **Register GSAP plugins guarded by SSR**, at module top:
  `if (typeof window !== "undefined") gsap.registerPlugin(SplitText, DrawSVGPlugin);`
- **Every `useGSAP` block must gate on reduced motion**: `const reduced = useReducedMotion(); ... if (reduced) return;` inside the callback, with `dependencies: [reduced]`. Framer animations are covered globally by `MotionRoot`, but raw GSAP is not. This is a hard project requirement (a11y).
- **Media-query / browser-state hooks use `useSyncExternalStore`** with a server snapshot, to avoid hydration mismatches — see `lib/use-reduced-motion.ts`. Don't read `window`/`matchMedia` during render any other way.
- SplitText splits a node and adds `aria-label` to it; that element then needs an explicit `role="text"`.

## Design tokens — kept in two synced places

Tailwind v4 is CSS-first: tokens live in the `@theme` block of `app/globals.css` and surface as utilities (`bg-mec-red`, `text-mec-ink`, `font-display`, `py-[var(--spacing-section-y)]`, etc.). There is **no `tailwind.config.js`**.

The same palette/easing/duration values are mirrored in `lib/tokens.ts` (plain JS) for use inside Framer Motion variants and GSAP, which can't read Tailwind classes. **If you change a color, easing curve, or duration, update both `globals.css` `@theme` and `lib/tokens.ts`.**

Brand palette: `mec-red #E10600`, `mec-ink #0D0D0D`, `mec-graphite`, `mec-mist`, `mec-pure`. Fonts: Bebas Neue (`font-display`), Montserrat (`font-body`), JetBrains Mono (`font-mono`), loaded via `next/font` in `layout.tsx`.

## Known open items

Placeholders awaiting real client assets: founder photo, official brand-logo SVGs, `public/og.jpg`, and a single product placeholder image (`public/images/product-placeholder.png`, used for all seeded products). Inquiry emails send via Resend (best-effort): internal notifications route to the assigned sales rep (CC general inbox) or the general inbox, and customers get confirmations. Configure addresses in `/portal/settings`; `RESEND_API_KEY` in `.env`. Sales reps get a CRM-lite view within `/portal` (their customers, quote history, latest-quotes dashboard, quote-status updates, and per-quote notes — quotes only). Note: any legacy `SalesRep` rows migrated with a `rep-<id>@placeholder.invalid` email need a real address (edit + Resend invite) before they can be onboarded. Out of scope for now: rep-facing forgot-password self-service, reps creating/reassigning customers, admin image uploads (image is a text path), sitemap.
