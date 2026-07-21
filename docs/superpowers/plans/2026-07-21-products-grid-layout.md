# Products Catalog Grid Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the horizontal list-row layout on `/products/all` with a dense, Amazon-style card grid (image on top, title, meta, CTA), full-page scrolling, sticky filter sidebar.

**Architecture:** Rework the orphaned `components/products/ProductCard.tsx` into a dense card that consumes the same data shape `toRow()` already produces; render it in responsive grids on the page and inside `ProductSubsection`; delete `ProductRow.tsx`. No data-layer or motion changes.

**Tech Stack:** Next.js 16 App Router (server components), Tailwind v4, existing `AddToQuoteButton` client component.

**Spec:** `docs/superpowers/specs/2026-07-21-products-grid-layout-design.md`

**Verification model:** This repo has **no automated test suite** (per root `CLAUDE.md`). Each task verifies with `npx tsc --noEmit` (and lint/build in the final task) instead of unit tests. All commands run from `minott-web/`.

**Suggested agent models:** Task 1 → opus, Task 2 → sonnet, Task 3 → opus, Task 4 → sonnet.

**Important context for workers with zero codebase knowledge:**
- All components use **named exports** and the `@/` path alias. Server components by default — none of the files below need `"use client"`.
- Two *unrelated* components share names with ours: `app/admin/(protected)/products/page.tsx` has a local `ProductRow`, and `components/sections/ProductCategories.tsx` has a local `ProductCard`. **Do not touch those files.**
- Brand tokens: `mec-red`, `mec-ink`, `mec-mist`, `mec-pure`, `font-display-tight`, `rounded-pill` are existing Tailwind utilities from `app/globals.css` — use them as-is.

---

### Task 1: Rework `ProductCard` into the dense Amazon-style card

**Files:**
- Rewrite: `minott-web/components/products/ProductCard.tsx` (currently an orphaned older card — no other file imports it, safe to fully replace)

- [ ] **Step 1: Replace the entire contents of `components/products/ProductCard.tsx` with:**

```tsx
import Image from "next/image";
import Link from "next/link";
import { FileText, FlaskConical } from "lucide-react";
import { AddToQuoteButton } from "@/components/quote/AddToQuoteButton";

// Same shape ProductRowData had (and toRow() in app/products/all/page.tsx
// produces) so the page's mapper is reused unchanged. specLabel/specValue and
// packSize are only non-null for single-variant listings.
export type ProductCardData = {
  id: number;
  slug: string;
  name: string;
  shortDescription: string | null;
  imagePath: string;
  sku: string | null;
  packSize: string | null;
  specLabel: string | null;
  specValue: string | null;
  isChemical: boolean;
  sampleAvailable: boolean;
  sdsUrl: string | null;
  categorySlug: string;
  categoryName: string;
  variantCount: number;
  onlyVariant: { id: number; sku: string; label: string } | null;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const href = `/products/${product.categorySlug}/${product.slug}`;
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-black/10 bg-mec-pure">
      <Link
        href={href}
        className="relative block aspect-square bg-mec-mist"
        data-cursor="View"
      >
        <Image
          src={product.imagePath}
          alt={product.name}
          fill
          sizes="(min-width:1280px) 20vw, (min-width:768px) 30vw, 50vw"
          className="object-contain p-3"
        />
        {product.isChemical && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-pill bg-mec-ink/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-pure">
            <FileText className="h-3 w-3" aria-hidden /> SDS
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link
          href={href}
          className="line-clamp-2 font-display-tight text-lg uppercase leading-tight text-mec-ink hover:text-mec-red"
        >
          {product.name}
        </Link>
        {product.shortDescription && (
          <p className="mt-1 line-clamp-2 text-sm text-mec-ink/70">
            {product.shortDescription}
          </p>
        )}
        <div className="mt-2 space-y-0.5 text-xs">
          {product.sku && (
            <p>
              <span className="text-mec-ink/50">SKU: </span>
              <span className="font-mono text-mec-ink/90">{product.sku}</span>
            </p>
          )}
          {product.packSize && (
            <p>
              <span className="text-mec-ink/50">Pack Size: </span>
              <span className="text-mec-ink/80">{product.packSize}</span>
            </p>
          )}
          {product.specLabel && product.specValue && (
            <p>
              <span className="text-mec-ink/50">{product.specLabel}: </span>
              <span className="text-mec-ink/90">{product.specValue}</span>
            </p>
          )}
        </div>
        {product.isChemical && product.sampleAvailable && (
          <Link
            href={href}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-mec-ink/70 hover:text-mec-red"
            data-cursor="View"
          >
            <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Request Sample
          </Link>
        )}
        <div className="mt-auto pt-4">
          {product.variantCount > 1 || !product.onlyVariant ? (
            <Link
              href={href}
              data-cursor="View"
              className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-mec-red px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-mec-pure transition-all duration-200 hover:bg-mec-red-hover active:scale-[0.97]"
            >
              Select Options
            </Link>
          ) : (
            <AddToQuoteButton
              size="sm"
              className="w-full rounded-sm"
              product={{
                productId: product.id,
                variantId: product.onlyVariant.id,
                slug: product.slug,
                name: product.name,
                sku: product.onlyVariant.sku,
                variantLabel: product.onlyVariant.label,
                imagePath: product.imagePath,
                categorySlug: product.categorySlug,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run (from `minott-web/`): `npx tsc --noEmit`
Expected: exits 0, no output. (`ProductRow.tsx` still exists and is still used by the page at this point — that's intentional; it's removed in Task 3.)

- [ ] **Step 3: Commit**

```bash
git add components/products/ProductCard.tsx
git commit -m "feat(catalog): dense Amazon-style ProductCard for grid layout"
```

---

### Task 2: Render a card grid inside `ProductSubsection`

**Files:**
- Modify: `minott-web/components/products/ProductSubsection.tsx`

- [ ] **Step 1: Replace the entire contents of `components/products/ProductSubsection.tsx` with:**

```tsx
import { ProductCard, type ProductCardData } from "@/components/products/ProductCard";

/**
 * A subsection heading (a child category) with its products beneath it.
 * Rendered when a parent category like Chemicals has child categories so the
 * listing groups products under subsection headings instead of a flat list.
 */
export function ProductSubsection({
  title,
  description,
  products,
}: {
  title: string;
  description?: string | null;
  products: ProductCardData[];
}) {
  if (products.length === 0) return null;
  return (
    <section className="mb-10 last:mb-0">
      <div className="flex items-baseline gap-4 border-b-2 border-mec-red/30 pb-2">
        <h2 className="font-display-tight text-2xl uppercase leading-tight text-mec-ink">
          {title}
        </h2>
        <span className="text-xs text-mec-ink/50">
          {products.length} {products.length === 1 ? "item" : "items"}
        </span>
      </div>
      {description && (
        <p className="mt-2 text-sm text-mec-ink/70">{description}</p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run (from `minott-web/`): `npx tsc --noEmit`
Expected: exits 0. The page still passes `ProductRowData[]` here — it is structurally identical to `ProductCardData[]`, so TypeScript accepts it. (Page migrates in Task 3.)

- [ ] **Step 3: Commit**

```bash
git add components/products/ProductSubsection.tsx
git commit -m "feat(catalog): ProductSubsection renders card grid"
```

---

### Task 3: Switch `/products/all` to grids, sticky sidebar; delete `ProductRow`

**Files:**
- Modify: `minott-web/app/products/all/page.tsx`
- Delete: `minott-web/components/products/ProductRow.tsx`

- [ ] **Step 1: Update imports and types in `app/products/all/page.tsx`**

Replace the import line:

```tsx
import { ProductRow, type ProductRowData } from "@/components/products/ProductRow";
```

with:

```tsx
import { ProductCard, type ProductCardData } from "@/components/products/ProductCard";
```

Then replace the two remaining `ProductRowData` type references in the same file:
- In `toRow`, change the return type annotation `function toRow(p: ProductWithCategory): ProductRowData {` → `function toRow(p: ProductWithCategory): ProductCardData {`
- In the `subsectionBuckets` declaration, change `rows: ProductRowData[];` → `rows: ProductCardData[];`
- The doc comment above `toRow` says "the shape ProductRow expects" — change to "the shape ProductCard expects".

- [ ] **Step 2: Make the sidebar sticky**

In the same file, the two-column wrapper currently renders the sidebar directly:

```tsx
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <ProductFilterSidebar
```

Wrap the sidebar in a sticky container (closing `</div>` goes right after `<ProductFilterSidebar ... />`'s self-closing tag):

```tsx
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductFilterSidebar
              categories={categories}
              forms={forms}
              industries={industries}
              volumes={volumes}
              colors={colors}
              active={{
                category: sp.category,
                form: sp.form,
                industry: sp.industry,
                volume: sp.volume,
                color: sp.color,
                sort: sp.sort,
                q,
              }}
            />
          </div>
```

- [ ] **Step 3: Replace the two scroll panes with grids**

Still in `app/products/all/page.tsx`, replace this block:

```tsx
            {totalCount === 0 ? (
              <p className="py-16 text-center text-mec-ink/60">
                No products match these filters.
              </p>
            ) : useSubsections ? (
              <div data-lenis-prevent className="h-[46rem] overflow-y-auto pr-2">
                {subsectionBuckets.map((b) => (
                  <ProductSubsection
                    key={b.slug}
                    title={b.name}
                    description={b.description}
                    products={b.rows}
                  />
                ))}
                {ungrouped.length > 0 && (
                  <ProductSubsection title="Other" products={ungrouped} />
                )}
              </div>
            ) : (
              <div data-lenis-prevent className="h-[46rem] overflow-y-auto pr-2">
                {products.map((p) => (
                  <ProductRow key={p.id} product={toRow(p)} />
                ))}
              </div>
            )}
```

with:

```tsx
            {totalCount === 0 ? (
              <p className="py-16 text-center text-mec-ink/60">
                No products match these filters.
              </p>
            ) : useSubsections ? (
              <div className="mt-6">
                {subsectionBuckets.map((b) => (
                  <ProductSubsection
                    key={b.slug}
                    title={b.name}
                    description={b.description}
                    products={b.rows}
                  />
                ))}
                {ungrouped.length > 0 && (
                  <ProductSubsection title="Other" products={ungrouped} />
                )}
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={toRow(p)} />
                ))}
              </div>
            )}
```

- [ ] **Step 4: Delete the row component**

```bash
git rm components/products/ProductRow.tsx
```

- [ ] **Step 5: Typecheck and confirm no stray imports**

Run (from `minott-web/`):
```bash
npx tsc --noEmit
grep -rn "products/ProductRow" app components lib
```
Expected: tsc exits 0; grep finds nothing (exit 1).

- [ ] **Step 6: Commit**

```bash
git add -A app/products/all/page.tsx components/products
git commit -m "feat(catalog): Amazon-style card grid on /products/all, sticky filter sidebar, drop ProductRow"
```

---

### Task 4: Full verification

**Files:** none modified — verification only. Run everything from `minott-web/`.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no errors (warnings acceptable only if pre-existing).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: completes successfully (Prisma generate + migrate deploy + next build all pass).

- [ ] **Step 3: Report**

Report back: lint result, build result, and confirmation that `ProductRow.tsx` no longer exists. Do NOT start the dev server (the orchestrating session does the visual click-through).
