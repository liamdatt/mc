# Product Variants — Design Spec

**Date:** 2026-06-22
**Status:** Approved (pending spec review)
**Topic:** One product listing with selectable size + pack type (Amazon-style), replacing one-flat-product-per-size.

## Problem

The catalog currently has one `Product` row per size/pack permutation. The
2026 chemicals import produced **209 flat products** where many are the same
product in different sizes (e.g. 2% Sunbrite Bleach in 1 L / 4 L / 19 L) or
different pack types (11 oz sanitizer sold **Each** vs **Case of 6**).

The client wants:

- **Sizes and pack types collapsed under one listing**, selectable like Amazon
  (different litres / each-vs-case are *variants*, not separate listings).
- **Strength and colorway/scent remain separate listings** (2% vs 4% vs 5%
  bleach; Floral vs Lemon vs Baby Powder Conquer are distinct products).

This is a quote-builder site (no checkout, no prices). Selecting a variant
determines exactly which SKU/size/pack is added to the quote.

## Key data finding

The client's SKU encodes almost everything we need:

```
{CATEGORY-PREFIX}-{SIZE-CODE} {PRODUCT-SUFFIX}

BLH-0004 BLEACH 2 SP   → suffix "BLEACH 2 SP"  (2% strength listing), size 4 L
BLH-0019 BLEACH 2 SP   → same listing, 19 L variant
BLH-0004 BLEACH 4      → suffix "BLEACH 4"     → SEPARATE listing (4% strength)
CHM-0004 CONQ FLR      → suffix "CONQ FLR"     (Floral listing)
CHM-0004 CONQ LEM      → suffix "CONQ LEM"     → SEPARATE listing (Lemon scent)
```

Grouping by **SKU suffix** collapses 209 products into **~111 listings**
(54 multi-size, 57 singletons) and *already* keeps strength and scent/colorway
separate — exactly the client's rules.

**Caveats requiring a human review pass (~90% automatable):**
- **Each vs Case** is a trailing `EA`/`CS` token (`INSTA CLN EA` vs
  `INSTA CLN CS`) — those land in separate suffix groups and must be merged
  back as a pack-type variant.
- Variant names drift ("Brite **Porcelain**" vs "Brite **Porchelain**";
  "Conquer Disinfectant Floral" vs "Conquer Floral") → the listing's canonical
  name must be chosen from one representative variant.
- A few cross-prefix oddities (powder vs liquid grouped together).

## Decisions (locked)

| Decision | Choice |
| --- | --- |
| Grouping source | **Auto-group at import + admin review** (merge/split/rename) |
| What variant selection drives | **Feeds the quote cart** with the exact variant (SKU + size + pack); no prices |
| Data model | **Separate `ProductVariant` table** (Product = listing) |
| Variant axes | **Size + Pack type** (two selectors) |
| 208.5 L drum | Treated as a **size**, not a pack type |
| SDS | **Per-listing** (one formulation = one SDS) |

## Data model

```
Product  (= LISTING, ~111 rows)            ProductVariant (= buyable option, ~209 rows)
  id, slug, name (canonical)                 id
  description, shortDescription              productId  → Product (FK, onDelete Cascade)
  categoryId  → Category                     sku          "CHM-0004 CONQ FLR"
  imagePath (hero)                           size         "1 L" | "19 L" | "11.5 kg"
  isChemical, sampleAvailable, sdsUrl        packType     "Each" | "Case"
  color (colorway), industry                 label        "4 L · Case of 6" (display)
  featured, active, sortOrder                imagePath?   overrides hero when set
  createdAt, updatedAt                       volume, packSize
                                             sortOrder, active
                                             createdAt, updatedAt
                                             @@unique([sku])
```

**Field moves** (off `Product`, onto `ProductVariant`):
`sku`, `volume`, `packSize`, `specLabel`, `specValue`.

**Stay on `Product`** (listing-level): `color`, `industry`, `sdsUrl`,
`isChemical`, `sampleAvailable`, `featured`.

**Uniform rule:** every listing has **≥1 variant**. Singletons get exactly one
variant (no selector rendered). This keeps a single code path through detail,
cart, and quote. Applies app-wide — non-chemical categories (Garbage Bins,
etc.) each become a listing with one auto-created variant.

### Derived attributes (during import)

- `size` ← formatted from the existing parsed `volume` ("4L" → "4 L",
  "208.5L" → "208.5 L", "11.5kg" → "11.5 kg").
- `packType` ← from UOM: `CASE` → "Case", otherwise "Each".
- `label` ← `size` plus `" · " + packType` only when the listing has >1 pack
  type (avoids noisy "4 L · Each" when Each is the only option).

## Auto-grouper (import logic)

Reads `prisma/data/chemicals-2026.ts` (remains the raw source of truth; the
extractor script is unchanged).

1. `listingKey` = SKU suffix **with trailing pack tokens (`EA`, `CS`, `CASE`,
   `EACH`) stripped**. Strength/scent tokens are part of the suffix and are
   **kept**, so they stay separate listings.
2. Group members by `listingKey`.
3. Each group → one `Product`. Canonical `name` = the **longest** member name
   with a trailing `(size)` parenthetical stripped (longest wins so
   "Conquer Disinfectant Floral" beats "Conquer Floral"). `description` and
   hero `imagePath` taken from the same representative member. `categoryId`,
   `isChemical`, `color` carried from members (flagged if members disagree).
4. Each member → one `ProductVariant` (`size`, `packType`, `sku`, `volume`,
   `packSize`, `imagePath`), sorted by ascending size.

Canonical name and groupings are heuristic → **admin can correct** (see Admin).

## Re-import safety

This **replaces the current "seed overwrites admin edits" behavior** (the seed
presently runs on every `start:prod` and would wipe the admin's grouping work).

- Catalog population moves **out of `start:prod`** into an explicit, idempotent
  `npm run import:catalog`. `start:prod` keeps only `prisma migrate deploy`.
- The importer is **SKU-keyed**:
  - Upserts variant-level facts (size, packSize, image) from the sheet by `sku`.
  - **Never rewrites an existing listing's canonical name/description.**
  - New/unmatched SKUs are attached to an **"Unsorted" holding listing** for an
    admin to place — never auto-merged into a curated listing.
  - Never deletes listings/variants implicitly; removals are an explicit admin
    action or a reported (not executed) diff.

Net effect: admin grouping, renames, and splits **survive every re-import**.

## Catalog / reads (`lib/products.ts`)

- Listing queries select `Product` directly (no group-by, no `parentId`
  filtering). `getProductsForListing`, `getCategoryWithChildren`,
  `getFeaturedProducts`, etc. return listing-shaped rows.
- **Volume filter** matches a listing if **any** of its variants has the
  volume (`where: { variants: { some: { volume } } }`).
- **Colorway filter** stays on the listing (`Product.color`).
- Detail fetch (`getProductBySlugInCategory`) includes ordered active variants.
- Distinct-option helpers (`getVolumeOptions`) read from `ProductVariant`.

## Detail page + selector

- Two pill control groups: **Size** and **Pack**. The Pack group is hidden when
  the listing has only one pack type.
- Selecting updates the displayed SKU/image and the add-to-quote target.
- Size × pack combinations that don't exist as a variant are **disabled**.
- Single-variant listings render no selector — just the add-to-quote button.

## Cart (`components/quote/*`)

`QuoteItem` gains:

```ts
{
  productId: number;     // listing (for the detail link)
  variantId: number;     // NEW — dedup key
  sku: string;           // NEW
  variantLabel: string;  // NEW — e.g. "4 L · Each"
  slug, name, imagePath, categorySlug, quantity
}
```

- Dedup key becomes `variantId` (not `productId`), so two sizes of the same
  listing are distinct cart lines.
- `AddToQuoteButton` on the detail page adds the **selected** variant.
- Catalog card: single-variant → "Add to Quote" (adds the lone variant);
  multi-variant → **"Select options"** → links to detail page.

## Quote / inquiry (`lib/actions/*`, schema)

- `InquiryItem` gains `variantId Int?` (FK → `ProductVariant`,
  `onDelete: SetNull`). `productId` (listing) is retained.
- `productName` is **denormalized with the variant label baked in**
  (e.g. `"Conquer Floral — 4 L · Case (CHM-0004 CONQ FLR)"`) so the inquiry the
  client receives names the exact variant and survives variant deletion.
- `submitQuote` reads `variantId` per cart item; `submitSample` references the
  selected variant.
- Portal history / reorder: use `variantId` when the variant is still active;
  fall back to the denormalized `productName` string otherwise.

## Admin

- New **Listings** view (also fills the current gap where `volume`/`packSize`/
  `specLabel`/`specValue` had no admin UI at all):
  - Edit canonical name, description, hero image, colorway, flags.
  - Add / remove / reorder variants; edit variant `size`, `packType`, `sku`,
    image, `active`.
  - **Reassign a variant to another listing** (= merge) via a listing picker.
  - **Split a variant into its own new listing.**
  - Surface the **"Unsorted"** holding listing prominently so newly imported
    SKUs get placed.

## Rollout order

1. Schema: add `ProductVariant`, add `InquiryItem.variantId`, move variant
   fields off `Product`; create migration.
2. `npm run import:catalog`: flat 209 → listings + variants; other categories →
   1 variant each; create the "Unsorted" listing.
3. `lib/products.ts` reads → listing-shaped + variants; fix filters.
4. Detail selector + cart (`QuoteItem`) + `submitQuote`/`submitSample` +
   `lib/api/serialize.ts`.
5. Admin Listings tooling.
6. Remove `prisma db seed` from `start:prod` (keep base category seed as a
   manual/create-only step).

## Out of scope

- Per-variant pricing / checkout (stays a quote builder).
- Changing the client's spreadsheet format or adding a parent-code column
  (auto-group + admin review was chosen instead).
- Image uploads in admin (image remains a text path, as today).
- A full size × pack matrix where every combination must exist — combinations
  are sparse and unavailable ones are simply disabled.

## Risks / open notes

- Auto-grouper canonical names are heuristic; the admin review pass is required
  before the catalog is customer-ready. The ~12 known data-quality gaps from the
  import (missing images, the `INK KLEEN`/`361` junk row) carry forward and
  should be cleaned during review.
- Moving variant fields off `Product` is a one-way migration; the
  `import:catalog` step is the data-migration path and must run before the new
  reads go live.
