# Product Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the flat per-size product catalog into one listing per product with selectable Size + Pack-type variants (Amazon-style), feeding the exact variant into the quote cart.

**Architecture:** A new `ProductVariant` table holds size/pack/SKU; `Product` becomes the listing. A pure grouper (`lib/variants/group.ts`) turns the flat spreadsheet rows into listings+variants by SKU suffix; an idempotent, SKU-keyed importer (`scripts/import-catalog.ts`) applies them and preserves admin curation across re-imports. Reads, detail-page selector, cart, quote actions, and admin tooling are updated to be variant-aware.

**Tech Stack:** Next.js 16 / React 19 (App Router, Server Actions), Prisma 7 + SQLite (better-sqlite3 driver adapter), `tsx` for scripts, Tailwind v4. No test runner — pure logic is verified with `node:assert` via `npx tsx`; the rest via `npx tsc --noEmit`, `npm run lint`, `npm run build`, and manual click-through.

**Spec:** `docs/superpowers/specs/2026-06-22-product-variants-design.md`

> **Conventions reminder (from `minott-web/AGENTS.md` & `CLAUDE.md`):** Next.js 16 — `cookies()`/`headers()`/route `params`/`searchParams` are async; mutations are Server Actions; middleware is `proxy.ts`. Named exports only (except `page`/`layout`/`proxy`). Read `node_modules/next/dist/docs/` before writing framework code. All commands run from `minott-web/`.

---

## Phase 0 — Branch

Already on branch `feat/product-variants` (created during brainstorming; the spec is committed there). All tasks below commit to this branch.

---

## Task 1: Schema — add ProductVariant, move variant fields, wire InquiryItem/Inquiry

**Files:**
- Modify: `minott-web/prisma/schema.prisma`

- [ ] **Step 1: Edit the `Product` model** — remove the variant-level fields (`sku`, `packSize`, `specLabel`, `specValue`, `volume`) and add the `variants` relation. The model becomes:

```prisma
model Product {
  id               Int              @id @default(autoincrement())
  slug             String           @unique
  name             String
  category         Category         @relation(fields: [categoryId], references: [id])
  categoryId       Int
  shortDescription String?
  description      String?
  imagePath        String           @default("/images/product-placeholder.png")
  isChemical       Boolean          @default(false)
  sdsUrl           String?
  sampleAvailable  Boolean          @default(false)
  industry         String?
  color            String?
  featured         Boolean          @default(false)
  active           Boolean          @default(true)
  sortOrder        Int              @default(0)
  variants         ProductVariant[]
  inquiryItems     InquiryItem[]
  sampleInquiries  Inquiry[]        @relation("SampleInquiryProduct")
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
}
```

- [ ] **Step 2: Add the `ProductVariant` model** (place it directly after `Product`):

```prisma
model ProductVariant {
  id              Int           @id @default(autoincrement())
  product         Product       @relation(fields: [productId], references: [id], onDelete: Cascade)
  productId       Int
  sku             String        @unique
  size            String? // display, e.g. "4 L", "19 L", "11.5 kg"
  packType        String        @default("Each") // "Each" | "Case"
  label           String? // composed display, e.g. "4 L · Case"
  volume          String? // raw, e.g. "4L" (kept for filtering)
  packSize        String? // raw UOM from the sheet
  specLabel       String?
  specValue       String?
  imagePath       String? // overrides the listing hero when set
  active          Boolean       @default(true)
  sortOrder       Int           @default(0)
  inquiryItems    InquiryItem[]
  sampleInquiries Inquiry[]     @relation("SampleInquiryVariant")
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([productId])
}
```

- [ ] **Step 3: Add `variantId` to `InquiryItem`:**

```prisma
model InquiryItem {
  id          Int             @id @default(autoincrement())
  inquiry     Inquiry         @relation(fields: [inquiryId], references: [id], onDelete: Cascade)
  inquiryId   Int
  product     Product?        @relation(fields: [productId], references: [id], onDelete: SetNull)
  productId   Int?
  variant     ProductVariant? @relation(fields: [variantId], references: [id], onDelete: SetNull)
  variantId   Int?
  productName String
  quantity    Int             @default(1)
}
```

- [ ] **Step 4: Add `variantId` to `Inquiry`** (for sample requests). Add these two lines after the existing `product`/`productId` pair:

```prisma
  variant   ProductVariant? @relation("SampleInquiryVariant", fields: [variantId], references: [id], onDelete: SetNull)
  variantId Int?
```

- [ ] **Step 5: Create the migration**

Run: `npm run db:migrate -- --name product_variants`
Expected: Prisma creates `prisma/migrations/<ts>_product_variants/migration.sql` and applies it. Because moved columns are dropped from `Product`, Prisma will warn about data loss — acceptable (the importer in Task 4 repopulates). Confirm when prompted.

- [ ] **Step 6: Verify the client regenerates and types compile**

Run: `npx prisma generate && npx tsc --noEmit`
Expected: `prisma generate` succeeds. `tsc` will now report errors in files that reference the moved `Product.sku`/`volume`/`packSize`/`specLabel`/`specValue` fields — that is expected and those files are fixed in later tasks. Note the error list; it is the to-do surface for Tasks 5–9.

- [ ] **Step 7: Commit**

```bash
git add minott-web/prisma/schema.prisma minott-web/prisma/migrations
git commit -m "feat(db): add ProductVariant, move variant fields off Product"
```

---

## Task 2: Pure grouper module (`lib/variants/group.ts`)

The grouper is pure (no DB) so it is unit-testable. It turns flat rows into listings.

**Files:**
- Create: `minott-web/lib/variants/group.ts`

- [ ] **Step 1: Write the grouper**

```ts
// Pure, DB-free grouping of flat catalog rows into listings + variants.
// See docs/superpowers/specs/2026-06-22-product-variants-design.md.

export type RawProduct = {
  name: string;
  sku: string;
  categorySlug: string;
  shortDescription?: string | null;
  description?: string | null;
  imagePath?: string | null;
  volume?: string | null;
  packSize?: string | null;
  specLabel?: string | null;
  specValue?: string | null;
  color?: string | null;
  industry?: string | null;
  isChemical?: boolean;
  sampleAvailable?: boolean;
  sdsUrl?: string | null;
  featured?: boolean;
};

export type GroupedVariant = {
  sku: string;
  size: string | null;
  packType: "Each" | "Case";
  label: string | null;
  volume: string | null;
  packSize: string | null;
  specLabel: string | null;
  specValue: string | null;
  imagePath: string | null;
  sortOrder: number;
};

export type GroupedListing = {
  slug: string;
  name: string;
  categorySlug: string;
  shortDescription: string | null;
  description: string | null;
  imagePath: string;
  color: string | null;
  industry: string | null;
  isChemical: boolean;
  sampleAvailable: boolean;
  sdsUrl: string | null;
  featured: boolean;
  variants: GroupedVariant[];
};

const PLACEHOLDER = "/images/product-placeholder.png";

export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Listing key = SKU suffix with the leading "XXX-#### " code token dropped and
 *  any trailing pack-type token (EA/CS/CASE/EACH) stripped. Strength/scent stay. */
export function listingKey(sku: string): string {
  const space = sku.indexOf(" ");
  const suffix = space === -1 ? sku : sku.slice(space + 1);
  return suffix
    .replace(/\s+(EA|CS|CASE|EACH)$/i, "")
    .trim()
    .toUpperCase();
}

/** "4L" -> "4 L", "208.5L" -> "208.5 L", "11.5kg" -> "11.5 kg". */
export function formatSize(volume: string | null | undefined): string | null {
  if (!volume) return null;
  const m = volume.trim().match(/^([\d.]+)\s*(L|kg)$/i);
  if (!m) return volume.trim();
  const unit = m[2].toLowerCase() === "l" ? "L" : "kg";
  return `${m[1]} ${unit}`;
}

/** Numeric magnitude for sorting sizes ascending (kg and L sorted by value). */
export function sizeSortValue(volume: string | null | undefined): number {
  if (!volume) return Number.MAX_SAFE_INTEGER;
  const m = volume.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : Number.MAX_SAFE_INTEGER;
}

export function packTypeFromRaw(sku: string, packSize: string | null | undefined): "Each" | "Case" {
  if (/case/i.test(packSize ?? "")) return "Case";
  if (/\s+CS$/i.test(sku)) return "Case";
  return "Each";
}

/** Longest member name with a trailing "(...)" size parenthetical stripped. */
export function canonicalName(names: string[]): string {
  const cleaned = names
    .map((n) => n.replace(/\s*\([^)]*\)\s*$/, "").trim())
    .filter(Boolean);
  return cleaned.sort((a, b) => b.length - a.length)[0] ?? names[0];
}

export function groupProducts(raw: RawProduct[]): GroupedListing[] {
  const groups = new Map<string, RawProduct[]>();
  for (const p of raw) {
    const key = `${p.categorySlug}::${listingKey(p.sku)}`;
    const arr = groups.get(key) ?? [];
    arr.push(p);
    groups.set(key, arr);
  }

  const usedSlugs = new Set<string>();
  const listings: GroupedListing[] = [];

  for (const members of groups.values()) {
    const name = canonicalName(members.map((m) => m.name));
    let slug = slugify(name);
    if (usedSlugs.has(slug)) slug = `${slug}-${slugify(members[0].sku)}`;
    usedSlugs.add(slug);

    // Representative member = longest name (richest data) for listing-level fields.
    const rep = [...members].sort((a, b) => b.name.length - a.name.length)[0];

    const packTypes = new Set(members.map((m) => packTypeFromRaw(m.sku, m.packSize)));
    const multiPack = packTypes.size > 1;

    const variants: GroupedVariant[] = members
      .map((m) => {
        const size = formatSize(m.volume);
        const packType = packTypeFromRaw(m.sku, m.packSize);
        const label =
          size && multiPack ? `${size} · ${packType}` : size ?? (multiPack ? packType : null);
        return {
          sku: m.sku,
          size,
          packType,
          label,
          volume: m.volume ?? null,
          packSize: m.packSize ?? null,
          specLabel: m.specLabel ?? null,
          specValue: m.specValue ?? null,
          imagePath: m.imagePath ?? null,
          sortOrder: 0,
        };
      })
      .sort(
        (a, b) =>
          sizeSortValue(a.volume) - sizeSortValue(b.volume) ||
          a.packType.localeCompare(b.packType),
      )
      .map((v, i) => ({ ...v, sortOrder: i }));

    listings.push({
      slug,
      name,
      categorySlug: rep.categorySlug,
      shortDescription: rep.shortDescription ?? null,
      description: rep.description ?? null,
      imagePath: rep.imagePath ?? PLACEHOLDER,
      color: rep.color ?? null,
      industry: rep.industry ?? null,
      isChemical: rep.isChemical ?? false,
      sampleAvailable: rep.sampleAvailable ?? false,
      sdsUrl: rep.sdsUrl ?? null,
      featured: members.some((m) => m.featured),
      variants,
    });
  }

  return listings;
}
```

- [ ] **Step 2: Write the failing test** — `minott-web/scripts/test-grouper.ts`

```ts
import assert from "node:assert/strict";
import { groupProducts, listingKey, canonicalName, formatSize, type RawProduct } from "../lib/variants/group";

const raw = (over: Partial<RawProduct> & Pick<RawProduct, "name" | "sku">): RawProduct => ({
  categorySlug: "industrial-and-household-chemicals",
  isChemical: true,
  ...over,
});

// listingKey strips the code token and trailing pack token; keeps strength/scent.
assert.equal(listingKey("BLH-0004 BLEACH 2 SP"), "BLEACH 2 SP");
assert.equal(listingKey("BLH-0004 BLEACH 4"), "BLEACH 4");
assert.equal(listingKey("CHM-11OZ INSTA CLN CS"), "INSTA CLN");
assert.equal(listingKey("CHM-11OZ INSTA CLN EA"), "INSTA CLN");
assert.equal(listingKey("BIN-001"), "BIN-001");

assert.equal(formatSize("208.5L"), "208.5 L");
assert.equal(formatSize("11.5kg"), "11.5 kg");
assert.equal(canonicalName(["Conquer Floral (4L)", "Conquer Disinfectant Floral (1L)"]), "Conquer Disinfectant Floral");

const listings = groupProducts([
  raw({ name: "2% Sunbrite Bleach (1L)", sku: "BLH-0001 BLEACH 2 SP", volume: "1L", packSize: "EACH" }),
  raw({ name: "2% Sunbrite Bleach (4L)", sku: "BLH-0004 BLEACH 2 SP", volume: "4L", packSize: "EACH" }),
  raw({ name: "2% Sunbrite Bleach (19L)", sku: "BLH-0019 BLEACH 2 SP", volume: "19L", packSize: "EACH" }),
  raw({ name: "4% Sun Brite Bleach (4L)", sku: "BLH-0004 BLEACH 4", volume: "4L", packSize: "EACH" }),
  raw({ name: "11oz Insta Clean Sanitizer", sku: "CHM-11OZ INSTA CLN EA", volume: null, packSize: "EACH" }),
  raw({ name: "11oz Sanitizer (6 per case)", sku: "CHM-11OZ INSTA CLN CS", volume: null, packSize: "CASE" }),
  raw({ name: "Rubbermaid Brute (32 Gal)", sku: "BIN-001", categorySlug: "garbage-bins", isChemical: false }),
]);

const byName = (n: string) => listings.find((l) => l.name === n)!;

// Sizes merge under one listing; strengths stay separate.
const b2 = byName("2% Sunbrite Bleach");
assert.equal(b2.variants.length, 3, "2% bleach should have 3 size variants");
assert.deepEqual(b2.variants.map((v) => v.size), ["1 L", "4 L", "19 L"], "variants sorted ascending");
assert.ok(byName("4% Sun Brite Bleach"), "4% strength is a separate listing");

// EA + CS merge into one listing with two pack types and pack-suffixed labels.
const insta = byName("11oz Insta Clean Sanitizer");
assert.equal(insta.variants.length, 2);
assert.deepEqual(new Set(insta.variants.map((v) => v.packType)), new Set(["Each", "Case"]));
assert.ok(insta.variants.every((v) => v.label?.includes(v.packType)), "multi-pack labels include pack type");

// Non-chemical product becomes its own 1-variant listing.
const bin = byName("Rubbermaid Brute");
assert.equal(bin.variants.length, 1);
assert.equal(bin.categorySlug, "garbage-bins");

console.log(`OK — ${listings.length} listings from 7 rows`);
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx tsx scripts/test-grouper.ts`
Expected: FAIL initially only if `group.ts` is absent/incorrect. Since Step 1 wrote it, this should actually PASS. If it FAILS, fix `group.ts` until the assertions pass — do not change the test to match a bug.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx scripts/test-grouper.ts`
Expected: `OK — 5 listings from 7 rows`

- [ ] **Step 5: Typecheck & commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "lib/variants/group|scripts/test-grouper" || echo "grouper clean"
git add minott-web/lib/variants/group.ts minott-web/scripts/test-grouper.ts
git commit -m "feat(catalog): pure SKU-suffix grouper with tests"
```

---

## Task 3: Refactor seed to expose raw products; categories-only seeding

The importer (Task 4) needs the category metadata and the non-chemical products. We expose them from `seed.ts` and stop seeding flat products there.

**Files:**
- Modify: `minott-web/prisma/seed.ts`

- [ ] **Step 1: Export the data structures.** Change `const CATEGORIES` to `export const CATEGORIES`, and confirm `SeedProduct` and `slugify` are exported (`SeedProduct` already is). Add an `export` to `slugify` if not present:

```ts
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
```

- [ ] **Step 2: Remove the inline chemicals products** so the chemicals category carries no inline `products` (the importer builds them from `CHEMICALS_2026`). Replace the chemicals category's products line:

```ts
    // Real 2026 catalog (209 products) extracted from the client spreadsheet.
    products: CHEMICALS_2026,
```

with:

```ts
    // Products (listings + variants) are built by scripts/import-catalog.ts.
    products: [],
```

Also remove the now-unused `import { CHEMICALS_2026 } ...` line at the top of `seed.ts` (the importer owns it now).

- [ ] **Step 3: Reduce `main()` to category-only seeding.** Replace the product-writing portions of `main()` so it only upserts categories (parents + children) and prunes stale categories. Delete the product upserts and the `keepSlugs`/product-prune logic. The category upsert loop and `keepCategorySlugs` prune stay. The final log becomes:

```ts
  console.log(
    `Category seed complete. ${keepCategorySlugs.length} categories seeded, ${removedCategories.count} stale categories removed.`,
  );
```

- [ ] **Step 4: Verify it still runs (categories only)**

Run: `npm run db:seed`
Expected: `Category seed complete. N categories seeded, ...`. No product errors.

- [ ] **Step 5: Typecheck & commit**

```bash
npx tsc --noEmit 2>&1 | grep "prisma/seed" || echo "seed clean"
git add minott-web/prisma/seed.ts
git commit -m "refactor(seed): categories-only; expose CATEGORIES for importer"
```

---

## Task 4: Idempotent catalog importer (`scripts/import-catalog.ts`)

**Files:**
- Create: `minott-web/scripts/import-catalog.ts`
- Modify: `minott-web/package.json` (scripts)

- [ ] **Step 1: Write the importer.** Bootstrap (empty DB) builds all listings from the grouper. Incremental runs refresh existing variants' sheet facts by SKU and route brand-new SKUs to an "Unsorted" listing — never rewriting listing names or moving curated variants.

```ts
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { CHEMICALS_2026 } from "../prisma/data/chemicals-2026";
import { CATEGORIES, type SeedProduct } from "../prisma/seed";
import { groupProducts, type RawProduct } from "../lib/variants/group";

const dbUrl =
  process.env.DATABASE_URL?.replace("file:", "") ?? path.join(process.cwd(), "prisma/app.db");
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const db = new PrismaClient({ adapter, log: ["error"] });

const CHEM_SLUG = "industrial-and-household-chemicals";
const UNSORTED_SLUG = "unsorted-imports";

function collectRaw(): RawProduct[] {
  const rows: RawProduct[] = [];
  // Chemicals (variant-heavy) from the extracted spreadsheet data.
  for (const p of CHEMICALS_2026) {
    rows.push({
      name: p.name,
      sku: p.sku,
      categorySlug: CHEM_SLUG,
      shortDescription: p.shortDescription,
      description: p.description ?? null,
      imagePath: p.imagePath ?? null,
      volume: p.volume ?? null,
      packSize: p.packSize ?? null,
      specLabel: p.specLabel ?? null,
      specValue: p.specValue ?? null,
      isChemical: true,
      sampleAvailable: true,
    });
  }
  // Non-chemical products defined inline in CATEGORIES → 1 listing + 1 variant each.
  const pushCat = (slug: string, products: SeedProduct[]) => {
    for (const p of products) {
      rows.push({
        name: p.name,
        sku: p.sku,
        categorySlug: slug,
        shortDescription: p.shortDescription,
        imagePath: p.imagePath ?? null,
        volume: p.volume ?? null,
        packSize: p.packSize ?? null,
        specLabel: p.specLabel ?? null,
        specValue: p.specValue ?? null,
        color: p.color ?? null,
        industry: p.industry ?? null,
        isChemical: p.isChemical ?? false,
        sampleAvailable: p.isChemical ?? false,
        featured: p.featured ?? false,
      });
    }
  };
  for (const cat of CATEGORIES) {
    const slug = slugifyName(cat.name);
    pushCat(slug, cat.products);
    for (const child of cat.children ?? []) pushCat(slugifyName(child.name), child.products);
  }
  return rows;
}

const slugifyName = (s: string) =>
  s.toLowerCase().trim().replace(/['"]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function ensureUnsortedListing(): Promise<number> {
  // Hidden holding listing under the chemicals category for new imports to land in.
  const cat = await db.category.findUnique({ where: { slug: CHEM_SLUG } });
  if (!cat) throw new Error(`Run 'npm run db:seed' first — category ${CHEM_SLUG} missing.`);
  const listing = await db.product.upsert({
    where: { slug: UNSORTED_SLUG },
    update: {},
    create: {
      slug: UNSORTED_SLUG,
      name: "Unsorted Imports",
      categoryId: cat.id,
      shortDescription: "Newly imported items awaiting grouping. Hidden from the catalog.",
      active: false,
      sortOrder: 9999,
    },
  });
  return listing.id;
}

async function main() {
  const raw = collectRaw();
  const listings = groupProducts(raw);
  const existingCount = await db.productVariant.count();
  const bootstrap = existingCount === 0;
  const unsortedId = await ensureUnsortedListing();

  let createdListings = 0;
  let createdVariants = 0;
  let refreshedVariants = 0;
  let routedToUnsorted = 0;

  // Map categorySlug -> id once.
  const cats = await db.category.findMany({ select: { id: true, slug: true } });
  const catId = new Map(cats.map((c) => [c.slug, c.id]));

  for (const L of listings) {
    const categoryId = catId.get(L.categorySlug);
    if (!categoryId) {
      console.warn(`Skipping listing ${L.slug}: unknown category ${L.categorySlug}`);
      continue;
    }

    for (const V of L.variants) {
      const existing = await db.productVariant.findUnique({ where: { sku: V.sku } });
      if (existing) {
        // Refresh sheet-owned facts only. Never touch productId / active / sortOrder.
        await db.productVariant.update({
          where: { sku: V.sku },
          data: {
            size: V.size,
            packType: V.packType,
            label: V.label,
            volume: V.volume,
            packSize: V.packSize,
            specLabel: V.specLabel,
            specValue: V.specValue,
            imagePath: V.imagePath,
          },
        });
        refreshedVariants++;
        continue;
      }

      let productId: number;
      if (bootstrap) {
        // Create/find the listing this variant belongs to.
        const listing = await db.product.upsert({
          where: { slug: L.slug },
          update: {},
          create: {
            slug: L.slug,
            name: L.name,
            categoryId,
            shortDescription: L.shortDescription,
            description: L.description,
            imagePath: L.imagePath,
            color: L.color,
            industry: L.industry,
            isChemical: L.isChemical,
            sampleAvailable: L.sampleAvailable,
            sdsUrl: L.sdsUrl,
            featured: L.featured,
          },
        });
        if (listing.createdAt.getTime() === listing.updatedAt.getTime()) createdListings++;
        productId = listing.id;
      } else {
        // Incremental: brand-new SKU → Unsorted for an admin to place.
        productId = unsortedId;
        routedToUnsorted++;
      }

      await db.productVariant.create({
        data: {
          productId,
          sku: V.sku,
          size: V.size,
          packType: V.packType,
          label: V.label,
          volume: V.volume,
          packSize: V.packSize,
          specLabel: V.specLabel,
          specValue: V.specValue,
          imagePath: V.imagePath,
          sortOrder: V.sortOrder,
        },
      });
      createdVariants++;
    }
  }

  console.log(
    `Import (${bootstrap ? "bootstrap" : "incremental"}): +${createdListings} listings, ` +
      `+${createdVariants} variants (${routedToUnsorted} → Unsorted), ${refreshedVariants} refreshed.`,
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
```

> Note: `createdListings` counts via the create/update timestamp heuristic; it is informational only.

- [ ] **Step 2: Add the npm script.** In `minott-web/package.json` `scripts`, add:

```json
    "import:catalog": "tsx scripts/import-catalog.ts",
```

- [ ] **Step 3: Bootstrap-run the importer**

Run: `npm run db:seed && npm run import:catalog`
Expected: `Import (bootstrap): +N listings, +209... variants (0 → Unsorted), 0 refreshed.`

- [ ] **Step 4: Verify counts in the DB**

Run:
```bash
node -e '
const {PrismaClient}=require("@prisma/client");
const {PrismaBetterSqlite3}=require("@prisma/adapter-better-sqlite3");
const path=require("path");
const url=(process.env.DATABASE_URL||"file:prisma/app.db").replace("file:","");
const db=new PrismaClient({adapter:new PrismaBetterSqlite3({url:path.resolve(url)})});
(async()=>{
  const cat=await db.category.findUnique({where:{slug:"industrial-and-household-chemicals"}});
  const listings=await db.product.count({where:{categoryId:cat.id,active:true}});
  const variants=await db.productVariant.count();
  const multi=await db.product.findMany({where:{categoryId:cat.id},include:{_count:{select:{variants:true}}}});
  console.log("active chem listings:",listings,"| total variants:",variants);
  console.log("multi-variant listings:",multi.filter(m=>m._count.variants>1).length);
  await db.$disconnect();
})();'
```
Expected: ~110 active chem listings, 209 chem variants, ~54 multi-variant listings.

- [ ] **Step 5: Re-run to prove idempotency**

Run: `npm run import:catalog`
Expected: `Import (incremental): +0 listings, +0 variants (0 → Unsorted), 262 refreshed.` (No duplicates created.)

- [ ] **Step 6: Commit**

```bash
git add minott-web/scripts/import-catalog.ts minott-web/package.json
git commit -m "feat(catalog): idempotent SKU-keyed importer (bootstrap + incremental)"
```

---

## Task 5: Variant-aware reads (`lib/products.ts`)

**Files:**
- Modify: `minott-web/lib/products.ts`

Use the `tsc` error list from Task 1 Step 6 to find every reference. Apply these changes:

- [ ] **Step 1: Include variants on detail + listing reads.** In `getProductBySlugInCategory`, add a variants include (active, ordered):

```ts
    include: {
      category: true,
      variants: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
```

- [ ] **Step 2: Add a variant summary to listing reads.** In `getProductsForListing`, `getCategoryWithChildren`, and `getFeaturedProducts`, add to each product query:

```ts
      include: {
        category: true,
        variants: { where: { active: true }, orderBy: { sortOrder: "asc" } },
      },
```

- [ ] **Step 3: Fix the volume filter** to match across variants. Where the listing query currently filters `volume`, replace the `volume` clause with:

```ts
        ...(volume ? { variants: { some: { active: true, volume } } } : {}),
```

Remove any top-level `volume:` / `packSize:` / `sku:`-on-Product filters (those fields no longer exist on `Product`). For search (`q`), change the SKU sub-clause from `{ sku: { contains: q } }` to:

```ts
          { variants: { some: { sku: { contains: q } } } },
```

- [ ] **Step 4: Fix the distinct-option helpers.** Rewrite `getVolumeOptions` to read from variants:

```ts
export async function getVolumeOptions(categorySlug?: string) {
  const rows = await db.productVariant.findMany({
    where: {
      active: true,
      volume: { not: null },
      product: {
        active: true,
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      },
    },
    distinct: ["volume"],
    select: { volume: true },
    orderBy: { volume: "asc" },
  });
  return rows.map((r) => r.volume!).filter(Boolean);
}
```

`getFormOptions` referenced `specLabel`/`specValue` on Product — repoint it to `db.productVariant` the same way (filter `specLabel: "Form"`, distinct `specValue`). `getColorOptions`/`getIndustryOptions` stay on `Product` (those fields remain on the listing).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "lib/products" || echo "products.ts clean"`
Expected: `products.ts clean`

- [ ] **Step 6: Commit**

```bash
git add minott-web/lib/products.ts
git commit -m "feat(catalog): variant-aware product reads and filters"
```

---

## Task 6: Cart model — variant-keyed `QuoteItem`

**Files:**
- Modify: `minott-web/components/quote/QuoteCartProvider.tsx`
- Modify: `minott-web/components/quote/AddToQuoteButton.tsx`
- Modify: `minott-web/components/quote/QuotePageClient.tsx`

- [ ] **Step 1: Extend `QuoteItem` and dedupe by `variantId`.** In `QuoteCartProvider.tsx`, update the type and every operation to key on `variantId` instead of `productId`:

```ts
export type QuoteItem = {
  productId: number; // listing id (detail link)
  variantId: number; // dedup key
  slug: string;
  name: string;
  sku: string;
  variantLabel: string; // "" when the listing has a single, unlabeled variant
  imagePath: string;
  categorySlug: string;
  quantity: number;
};
```

Update `addItem` to find existing by `variantId`; `removeItem(variantId)` and `setQuantity(variantId, qty)` take a `variantId`. Bump the storage key to invalidate stale carts: change `mec_quote_cart` to `mec_quote_cart_v2`.

- [ ] **Step 2: Update `AddToQuoteButton`** to accept the new shape — it already accepts `Omit<QuoteItem, "quantity">`, so no signature change is needed, but confirm callers pass `variantId`/`sku`/`variantLabel`. No code change if it spreads the product prop.

- [ ] **Step 3: Update `QuotePageClient`** to render `variantLabel` under the name and key list rows / remove / quantity handlers on `variantId`. Where each line item is serialized into the hidden form field, include `variantId` and a composed `productName`:

```ts
const payload = items.map((it) => ({
  productId: it.productId,
  variantId: it.variantId,
  productName: it.variantLabel ? `${it.name} — ${it.variantLabel} (${it.sku})` : `${it.name} (${it.sku})`,
  quantity: it.quantity,
}));
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "components/quote" || echo "quote clean"`
Expected: `quote clean`

- [ ] **Step 5: Commit**

```bash
git add minott-web/components/quote
git commit -m "feat(quote): variant-keyed cart items"
```

---

## Task 7: Detail page variant selector

**Files:**
- Create: `minott-web/components/products/VariantSelector.tsx`
- Modify: `minott-web/components/products/ProductDetailActions.tsx`
- Modify: `minott-web/app/products/[category]/[slug]/page.tsx`

- [ ] **Step 1: Create `VariantSelector`** (client component). Two pill groups (Size, Pack); Pack hidden when one pack type; impossible combos disabled; selection drives the `AddToQuoteButton` target and the displayed image/SKU.

```tsx
"use client";

import { useMemo, useState } from "react";
import { AddToQuoteButton } from "@/components/quote/AddToQuoteButton";

export type SelectableVariant = {
  id: number;
  sku: string;
  size: string | null;
  packType: string;
  label: string | null;
  imagePath: string | null;
};

type Props = {
  listing: { id: number; slug: string; name: string; imagePath: string; categorySlug: string };
  variants: SelectableVariant[];
  onImageChange?: (src: string) => void;
};

export function VariantSelector({ listing, variants }: Props) {
  const sizes = useMemo(
    () => [...new Set(variants.map((v) => v.size).filter((s): s is string => !!s))],
    [variants],
  );
  const packTypes = useMemo(() => [...new Set(variants.map((v) => v.packType))], [variants]);

  const [size, setSize] = useState<string | null>(sizes[0] ?? null);
  const [packType, setPackType] = useState<string>(packTypes[0] ?? "Each");

  const selected =
    variants.find((v) => (v.size ?? null) === size && v.packType === packType) ??
    variants.find((v) => (v.size ?? null) === size) ??
    variants[0];

  const comboExists = (s: string | null, p: string) =>
    variants.some((v) => (v.size ?? null) === s && v.packType === p);

  return (
    <div className="flex flex-col gap-5">
      {sizes.length > 1 && (
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wide text-mec-graphite">Size</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                aria-pressed={size === s}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${
                  size === s ? "border-mec-red bg-mec-red text-mec-pure" : "border-mec-mist text-mec-ink hover:border-mec-ink"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {packTypes.length > 1 && (
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wide text-mec-graphite">Pack</p>
          <div className="flex flex-wrap gap-2">
            {packTypes.map((p) => {
              const disabled = !comboExists(size, p);
              return (
                <button
                  key={p}
                  type="button"
                  disabled={disabled}
                  onClick={() => setPackType(p)}
                  aria-pressed={packType === p}
                  className={`rounded-full border px-4 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    packType === p ? "border-mec-red bg-mec-red text-mec-pure" : "border-mec-mist text-mec-ink hover:border-mec-ink"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <p className="font-mono text-xs text-mec-graphite">
          SKU: {selected.sku}
          {selected.label ? ` · ${selected.label}` : ""}
        </p>
      )}

      {selected && (
        <AddToQuoteButton
          product={{
            productId: listing.id,
            variantId: selected.id,
            slug: listing.slug,
            name: listing.name,
            sku: selected.sku,
            variantLabel: selected.label ?? "",
            imagePath: selected.imagePath ?? listing.imagePath,
            categorySlug: listing.categorySlug,
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `ProductDetailActions`.** Replace its standalone `AddToQuoteButton` with `<VariantSelector listing={...} variants={...} />`, passing the listing's variants. Keep the SDS / Request-Sample controls. Pass the selected variant id into `SampleRequestForm` (lift the `selected` state or render the sample form inside `VariantSelector`; simplest: move the SDS/sample buttons into `VariantSelector` so they share `selected`). For this task, render `VariantSelector` and keep SDS/sample referencing the listing; sample variant wiring lands in Task 9.

- [ ] **Step 3: Pass variants from the page.** In `app/products/[category]/[slug]/page.tsx`, the product now carries `variants` (Task 5). Map them to `SelectableVariant[]` and pass to `ProductDetailActions`. Remove the now-removed `product.sku` direct render in the page header; show `selected.sku` via the selector instead (or show the first variant's SKU as a fallback label).

- [ ] **Step 4: Typecheck + manual check**

Run: `npx tsc --noEmit 2>&1 | grep -E "VariantSelector|ProductDetailActions|\[slug\]" || echo "detail clean"`
Then: `npm run dev`, open a multi-size product (e.g. `/products/industrial-and-household-chemicals/2-sunbrite-bleach`), confirm Size pills switch the SKU and Add-to-Quote adds the selected size.
Expected: selector works; cart shows the chosen size.

- [ ] **Step 5: Commit**

```bash
git add minott-web/components/products/VariantSelector.tsx minott-web/components/products/ProductDetailActions.tsx "minott-web/app/products/[category]/[slug]/page.tsx"
git commit -m "feat(products): variant selector on detail page"
```

---

## Task 8: Catalog cards — "Select options" vs "Add to Quote"

**Files:**
- Modify: `minott-web/components/products/ProductCard.tsx`
- Modify: `minott-web/components/products/ProductRow.tsx`
- Modify: `minott-web/app/products/all/page.tsx` (mapping)

- [ ] **Step 1: Pass a variant summary to cards.** In `app/products/all/page.tsx`, extend the `ProductRowData`/`ProductCardData` mapping with `variantCount` and the single variant's fields when `variantCount === 1`:

```ts
const variantCount = p.variants.length;
const only = variantCount === 1 ? p.variants[0] : null;
// ...add to the mapped object:
variantCount,
onlyVariant: only ? { id: only.id, sku: only.sku, label: only.label ?? "" } : null,
```

- [ ] **Step 2: Branch the card button.** In `ProductCard.tsx` (and `ProductRow.tsx`), when `variantCount > 1` render a link styled as a button to the detail page labelled **"Select options"**; when `variantCount === 1` render `AddToQuoteButton` with the lone variant:

```tsx
{variantCount > 1 || !onlyVariant ? (
  <Link href={`/products/${categorySlug}/${slug}`} className="<existing button classes>">
    Select options
  </Link>
) : (
  <AddToQuoteButton
    product={{
      productId: id,
      variantId: onlyVariant.id,
      slug,
      name,
      sku: onlyVariant.sku,
      variantLabel: onlyVariant.label,
      imagePath,
      categorySlug,
    }}
  />
)}
```

- [ ] **Step 3: Typecheck + manual check**

Run: `npx tsc --noEmit 2>&1 | grep -E "ProductCard|ProductRow|products/all" || echo "cards clean"`
Then in `npm run dev`: a multi-size product shows "Select options"; a singleton shows "Add to Quote".

- [ ] **Step 4: Commit**

```bash
git add minott-web/components/products/ProductCard.tsx minott-web/components/products/ProductRow.tsx minott-web/app/products/all/page.tsx
git commit -m "feat(products): Select-options vs Add-to-Quote on cards"
```

---

## Task 9: Quote/sample actions, serialize, portal history

**Files:**
- Modify: `minott-web/lib/actions/inquiries.ts`
- Modify: `minott-web/components/products/SampleRequestForm.tsx`
- Modify: `minott-web/lib/api/serialize.ts`
- Modify: `minott-web/lib/portal.ts` and `minott-web/app/portal/(protected)/history/[id]/page.tsx`

- [ ] **Step 1: `submitQuote` — persist `variantId`.** Where it parses the `items` JSON and builds `items.create`, read `variantId` and store it:

```ts
items: {
  create: parsed.map((it) => ({
    productId: typeof it.productId === "number" ? it.productId : null,
    variantId: typeof it.variantId === "number" ? it.variantId : null,
    productName: String(it.productName).slice(0, 200),
    quantity: Math.max(1, Number(it.quantity) || 1),
  })),
},
```

- [ ] **Step 2: `submitSample` — capture the selected variant.** Read a `variantId` hidden field and set it on the `Inquiry.create`:

```ts
const variantId = Number(formData.get("variantId")) || null;
// ...in data:
variantId,
```

- [ ] **Step 3: `SampleRequestForm`** — add a hidden `variantId` input and a `variantId: number` prop; render the selected variant's SKU in the heading. Caller (`VariantSelector`/`ProductDetailActions`) passes the selected variant id.

- [ ] **Step 4: Serialize variants for the API.** In `serializeProductDetail`, replace the single `sku`/`packSize`/`specLabel`/`specValue` fields with a `variants` array:

```ts
variants: p.variants.map((v) => ({
  sku: v.sku,
  size: v.size,
  packType: v.packType,
  label: v.label,
})),
```

In `serializeProductCard`, replace `sku`/`packSize` with `variantCount: p.variants.length`.

- [ ] **Step 5: Portal history.** In `lib/portal.ts` includes, add `variant: true` to inquiry items (and to the sample `variant`). In the history detail page, show `it.productName` (already variant-labelled); for reorder, gate on `it.variant?.active` and add the variant to the cart.

- [ ] **Step 6: Typecheck + manual**

Run: `npx tsc --noEmit 2>&1 | grep -E "inquiries|serialize|portal|SampleRequestForm" || echo "actions clean"`
Then in `npm run dev`: add two sizes of one product to the quote, submit; check `/admin/requests` shows both lines with size/SKU in the name.

- [ ] **Step 7: Commit**

```bash
git add minott-web/lib/actions/inquiries.ts minott-web/components/products/SampleRequestForm.tsx minott-web/lib/api/serialize.ts minott-web/lib/portal.ts "minott-web/app/portal/(protected)/history/[id]/page.tsx"
git commit -m "feat(quote): persist variant on quotes and samples; variant-aware history/api"
```

---

## Task 10: Admin — listing & variant management

**Files:**
- Modify: `minott-web/components/admin/ProductForm.tsx`
- Create: `minott-web/components/admin/VariantManager.tsx`
- Create: `minott-web/lib/actions/admin-variants.ts`
- Modify: `minott-web/lib/actions/admin-products.ts`
- Modify: `minott-web/app/admin/(protected)/products/page.tsx` and the product edit page

- [ ] **Step 1: Admin variant Server Actions.** Create `lib/actions/admin-variants.ts` with `"use server"` actions: `updateVariant`, `createVariant`, `deleteVariant`, `reassignVariant(variantId, targetProductId)` (merge), and `splitVariantToNewListing(variantId)`:

```ts
"use server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function reassignVariant(variantId: number, targetProductId: number) {
  await requireAdmin();
  await db.productVariant.update({ where: { id: variantId }, data: { productId: targetProductId } });
  revalidatePath("/admin/products");
}

export async function splitVariantToNewListing(variantId: number) {
  await requireAdmin();
  const v = await db.productVariant.findUniqueOrThrow({ where: { id: variantId }, include: { product: true } });
  const base = v.product;
  const slug = `${base.slug}-${v.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const listing = await db.product.create({
    data: {
      slug, name: `${base.name} (${v.size ?? v.sku})`, categoryId: base.categoryId,
      shortDescription: base.shortDescription, description: base.description,
      imagePath: v.imagePath ?? base.imagePath, isChemical: base.isChemical,
      sampleAvailable: base.sampleAvailable, color: base.color, industry: base.industry,
    },
  });
  await db.productVariant.update({ where: { id: variantId }, data: { productId: listing.id } });
  revalidatePath("/admin/products");
}
```

(`updateVariant`/`createVariant`/`deleteVariant` follow the same `requireAdmin` + `db.productVariant.*` + `revalidatePath` shape; show editable `size`, `packType`, `sku`, `label`, `active`, `sortOrder`.)

> Confirm the exact admin auth guard name in `lib/auth/session.ts` (e.g. `requireAdmin`); use whatever the existing admin actions already call.

- [ ] **Step 2: `VariantManager` component** — lists a listing's variants with inline edit, an "Add variant" row, a "Move to listing…" picker (calls `reassignVariant`), and a "Split out" button (calls `splitVariantToNewListing`).

- [ ] **Step 3: Update `ProductForm`/`admin-products.ts`** — the product (listing) form now manages listing-level fields only (it already does, minus the moved fields). Add `color`/`industry`/`sdsUrl` inputs (previously missing). Render `<VariantManager>` below the form on the edit page. Remove any references to `product.sku`/`packSize` in the admin list page; show `_count.variants` instead.

- [ ] **Step 4: Surface "Unsorted Imports".** On `app/admin/(protected)/products/page.tsx`, pin the `unsorted-imports` listing at the top with a badge when it has variants, so new imports get placed.

- [ ] **Step 5: Typecheck + manual**

Run: `npx tsc --noEmit 2>&1 | grep -E "admin" || echo "admin clean"`
Then in `npm run dev`, as admin: edit a listing, move a variant to another listing (merge), split a variant out, confirm the catalog reflects it.

- [ ] **Step 6: Commit**

```bash
git add minott-web/components/admin minott-web/lib/actions/admin-variants.ts minott-web/lib/actions/admin-products.ts "minott-web/app/admin/(protected)/products"
git commit -m "feat(admin): listing + variant management (edit, merge, split, unsorted)"
```

---

## Task 11: Production start — drop seed; final verification

**Files:**
- Modify: `minott-web/package.json`

- [ ] **Step 1: Remove auto-seed from `start:prod`.** Change:

```json
"start:prod": "prisma migrate deploy && prisma db seed && next start",
```

to:

```json
"start:prod": "prisma migrate deploy && next start",
```

Document the one-time/after-import setup in the README/handoff: `npm run db:seed && npm run import:catalog`.

- [ ] **Step 2: Full verification sweep**

Run, in order:
```bash
npx tsx scripts/test-grouper.ts        # OK — grouper
npx tsc --noEmit                        # exit 0
npm run lint                            # clean
npm run build                           # succeeds (runs prisma generate + next build)
```
Expected: all pass. `npm run build` will run `prisma migrate deploy` against the dev DB — fine.

- [ ] **Step 3: Manual click-through checklist** (in `npm run dev`):
  - Catalog: multi-size product shows "Select options"; singleton shows "Add to Quote".
  - Detail: Size/Pack pills switch SKU/image; disabled combos correct; singleton shows no selector.
  - Quote: two sizes of one product are separate cart lines; submit; `/admin/requests` shows both with size/SKU.
  - Volume filter on `/products/all` still narrows listings.
  - Admin: edit listing, merge a variant, split a variant, place an Unsorted item.

- [ ] **Step 4: Commit**

```bash
git add minott-web/package.json
git commit -m "chore(prod): remove auto-seed from start:prod (use import:catalog)"
```

---

## Self-Review (completed by plan author)

**Spec coverage:**
- Data model (ProductVariant, field moves, InquiryItem.variantId) → Task 1. ✓
- Auto-grouper (SKU suffix, pack-token strip, canonical longest name) → Task 2. ✓
- Re-import safety (out of start:prod, SKU-keyed, Unsorted, no name rewrite) → Tasks 4 & 11. ✓
- Catalog/reads + volume filter across variants → Task 5. ✓
- Detail selector (Size+Pack, disabled combos, hidden single pack) → Task 7. ✓
- Cart variant-keyed + Select-options card behavior → Tasks 6 & 8. ✓
- Quote/inquiry variant persistence + denormalized name + history/api → Task 9. ✓
- Admin merge/split/rename/Unsorted → Task 10. ✓
- Uniform "every listing ≥1 variant", non-chemical 1:1 → Tasks 2 & 4. ✓

**Placeholder scan:** Tasks 7/8/9/10 reference "existing button classes"/existing guard names rather than inlining them — intentional, because the executor must match the surrounding file's real classes/imports (inventing them would be wrong). Each such step names the exact file and the exact change. No `TBD`/`TODO`/"handle edge cases" left.

**Type consistency:** `QuoteItem` (Task 6) fields — `productId`, `variantId`, `sku`, `variantLabel` — are the same shape consumed by `VariantSelector` (Task 7), card buttons (Task 8), and the `submitQuote` payload (Task 9). `GroupedVariant`/`GroupedListing` (Task 2) are consumed unchanged by the importer (Task 4). `RawProduct` fields produced in `collectRaw` (Task 4) match the `RawProduct` type (Task 2).

**Note on testing:** Only the pure grouper has an automated assertion test (project has no test runner). All other tasks rely on `tsc`/`lint`/`build`/manual checks, per the project's documented verification approach.
