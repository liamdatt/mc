# Products Catalog Grid Layout — Design

**Date:** 2026-07-21
**Status:** Approved by user

## Goal

Replace the horizontal list-row layout on the `/products/all` catalog with a
dense, Amazon-style card grid (image on top, title, meta, CTA button), per
client request.

## Context (current state)

- `/products/all` (`minott-web/app/products/all/page.tsx`) renders products as
  horizontal `ProductRow` components inside two fixed-height
  (`h-[46rem] overflow-y-auto`, `data-lenis-prevent`) scroll panes — one for the
  flat list, one for the subsection-grouped view.
- `components/products/ProductRow.tsx` — the list row: 80–100px thumbnail left,
  info + category/pack, SKU/spec column, action pills right.
- `components/products/ProductSubsection.tsx` — child-category heading bar +
  `ProductRow` list beneath.
- `components/products/ProductCard.tsx` — **orphaned** grid-style card from an
  earlier iteration; no longer imported anywhere.
- Name collisions that are NOT ours: `app/admin/(protected)/products/page.tsx`
  has a local `ProductRow`, and `components/sections/ProductCategories.tsx` has
  a local `ProductCard`. Both unrelated and untouched.

## Decisions (confirmed with user)

1. **Card content: dense, Amazon-like.** Image with SDS badge overlay, name,
   short description, SKU + pack-size meta lines, Request Sample link,
   Add to Quote / Select Options button pinned at the card bottom.
2. **Scrolling: full-page.** Remove the inner scroll panes; the grid flows
   naturally and the whole page scrolls. Filter sidebar becomes sticky on
   desktop.

## Chosen approach

Rework the orphaned `ProductCard` into the dense card, swap it in everywhere
`ProductRow` is used on the public catalog, delete `ProductRow`. (Rejected:
grid/list view toggle — YAGNI; restyling `ProductRow` responsively in place —
two layouts crammed into one component.)

## Design

### Card — `components/products/ProductCard.tsx` (reworked)

- Consumes the existing `ProductRowData` shape (moves to/exported alongside the
  card; the `toRow` mapper in `app/products/all/page.tsx` is reused unchanged).
- Layout, top to bottom:
  - Square image (`aspect-square`, `bg-mec-mist`, `object-contain`) linking to
    the product detail page; existing SDS badge overlaid top-left when
    `isChemical`.
  - Product name — `font-display-tight`, uppercase, `line-clamp-2`, links to
    detail, red hover.
  - Short description — `line-clamp-2`, muted.
  - Meta lines — SKU (mono) and Pack Size; pack size/spec only shown when the
    listing has a single variant (same rule as today's `toRow`).
  - "Request Sample" text link when `isChemical && sampleAvailable`, linking to
    the detail page.
  - Flexible spacer, then full-width CTA pinned at the bottom:
    `AddToQuoteButton` when exactly one variant, otherwise a red
    "Select Options" link to the detail page. Matches current button styling.
- Card chrome: `border border-black/10`, `bg-mec-pure`, rounded-md, tight
  padding.
- Server component, named export, no new client code.

### Page — `app/products/all/page.tsx`

- Replace both `h-[46rem] overflow-y-auto pr-2` panes (and their
  `data-lenis-prevent`) with plain grids:
  `grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4`.
- Sidebar wrapper gets `lg:sticky lg:top-24 lg:self-start` so filters stay
  reachable while the page scrolls (compatible with Lenis — it drives native
  scroll).

### Subsections — `components/products/ProductSubsection.tsx`

- Keeps its heading/count/description bar; renders the same card grid beneath
  it instead of the row list.

### Removal

- `components/products/ProductRow.tsx` deleted (no remaining importers after
  the swap).

## Motion / a11y

No new GSAP or Framer Motion work. Cards are server-rendered with existing
hover transitions only; no reduced-motion implications.

## Verification

- `npx tsc --noEmit`, `npm run lint`, `npm run build` (from `minott-web/`).
- Dev-server click-through of `/products/all`: flat list, category filter with
  subsections (e.g. Chemicals), search results, empty state, mobile width
  (2-col), desktop (4-col), sticky sidebar behavior, Add to Quote from a card.
