# Admin Analytics — Design

**Date:** 2026-07-31
**Status:** Approved for implementation (autonomous session — decisions recorded here for review)

## Goal

Give admins a read-only analytics page showing which products and categories drive
demand, plus overall request activity. The site takes no orders — demand signals are
**quote line items** (`InquiryItem`), **sample requests** (`Inquiry` with
`type="SAMPLE"` + `productId`), and **contact messages**. "Most frequently ordered
products" therefore means "most frequently quoted/sampled products."

## Approach chosen

Server-rendered analytics page at `/admin/analytics` — plain Server Component +
Prisma reads, charts drawn with Tailwind-styled divs (no chart library, no client
JS). Alternatives considered and rejected:

- **Recharts/Chart.js client charts** — a new heavy dependency and client-side
  hydration for a low-traffic admin page; unnecessary for bars and stacked columns.
- **Materialized stats tables** — premature; inquiry volume is small (SQLite,
  single-tenant marketing site). We aggregate on read: fetch inquiries + line items
  for the selected window, aggregate in JS. Revisit only if volume ever hurts.

## Page contents (top to bottom)

1. **Time-range filter** — pill tabs like `/admin/requests`: Last 30 days / Last 90
   days / Last 12 months / All time (`?range=30d|90d|12m|all`, default `90d`).
   Scopes everything below. Window starts are aligned to the trend's bucket
   boundary (Monday of the week for 30d/90d, first of the month for 12m) so the
   trend never opens on a partial bucket masquerading as a full one; the delta
   compares against the equal-length window immediately before. All bucketing and
   date display use business time (`America/Jamaica`, fixed UTC−05:00 — no DST,
   so boundaries are derived with a constant shift).
2. **KPI row** — stat tiles: Quote requests, Sample requests, Contact messages,
   Units quoted (Σ `InquiryItem.quantity`), Unique requesters (distinct email).
   Each tile (except in All time) shows a signed delta vs. the previous
   equal-length period.
3. **Top products** — horizontal bar chart, top 8 by number of quote requests
   containing the product (sample requests counted in and shown in the row detail);
   total units quoted shown per row. Keyed by the live product name when the
   product still exists (so renames merge with sample counts), falling back to the
   denormalized `productName` snapshot so deleted products keep their quote
   history (orphaned sample requests are dropped — no snapshot exists for them).
4. **Top categories** — horizontal bar chart, counted like products: once per
   quote/sample request touching the category (not per line item), rolled up via
   each item's current `product.category`. Items whose product was deleted fall
   into "Removed products."
5. **Requests over time** — stacked columns bucketed by ISO week (30d/90d) or
   month (12m/all), one segment per inquiry type. CSS-only hover/focus tooltip
   gives per-type values; totals labeled on column caps.
6. **Pipeline snapshot** — single stacked horizontal bar of inquiry status
   (New / In progress / Closed) for the window, with counts labeled.
7. **Top companies** — table (top 8): company (fallback contact name), quote count,
   units, last request date. This is the "other important analytics" pick — it tells
   sales who to call.

## Dataviz decisions (per dataviz skill)

- Nominal single-series bars (products, categories) use one hue — `mec-red` — with
  the value at the bar tip; no legend (title names the series). Bars ≤ 24px thick,
  4px rounded data-end, square baseline.
- The 3-series trend uses a validated categorical palette:
  Quotes `#E10600`, Samples `#2a78d6`, Contact `#b45309` — passes all six checks of
  `validate_palette.js` on `#FFFFFF` (worst adjacent CVD ΔE 27.2, all ≥ 3:1
  contrast). Legend always shown; 2px surface gaps between stacked segments; color
  follows the type, never the rank.
- Status bar uses an ordinal one-hue ink ramp (light→dark), not the categorical
  palette, with inline count labels + legend.
- Text never wears the data color; values/labels use ink text tokens.
- Admin is light-mode only (existing chrome), so no dark-mode variant.

## Architecture

- `lib/analytics.ts` — `getAdminAnalytics(range)`: resolves the window, runs two
  same-shape fetches (inquiries with items+product+category for the current and
  previous windows — the previous one feeds the KPI deltas), aggregates in JS,
  returns one typed payload. Server-only, mirrors `lib/products.ts` style.
- `components/admin/AnalyticsCharts.tsx` — presentational server components:
  `StatTile`, `HBarList`, `StackedTrend`, `StatusBar`. No `"use client"`; hover
  tooltips are CSS (`group-hover` / `focus-within`, `tabindex=0`).
- `app/admin/(protected)/analytics/page.tsx` — reads `searchParams.range`
  (async, Next 16), calls `getAdminAnalytics`, lays out sections. Inherits the
  admin auth gate from the `(protected)` layout and `force-dynamic` from the root
  layout.
- Nav: add "Analytics" to `NAV` in `app/admin/(protected)/layout.tsx` (after
  Dashboard). Dashboard cards untouched.

## Edge cases

- Empty window → each section renders a quiet "No data in this period." line;
  tiles show 0 with no delta when the previous period is also empty.
- Deleted products: product bars key off `productName` (denormalized, survives);
  category rollup uses live relation and buckets orphans as "Removed products."
- Division by zero in bar widths guarded (max ≥ 1).

## Testing

No test suite exists. Verification: `npx tsc --noEmit`, `npm run lint`,
`npm run build`, plus a browser click-through of `/admin/analytics` across all four
ranges with seeded/dev data.
