# Featured Deals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-managed deals (percent-off or free-text badge) on products or specific SKUs, surfaced on the homepage (top 4 + view-all), a `/deals` page, the catalog listing/detail, the quote cart, and snapshotted onto submitted quotes for sales reps.

**Architecture:** New `Deal` Prisma model joined to `Product`/`ProductVariant`; one shared read/label module `lib/deals.ts` used by every surface; admin CRUD via Server Actions + a `/portal/deals` page; public rendering in Server Components (the root layout is already `force-dynamic`); quote submission stamps a plain-text `dealLabel` onto `InquiryItem`.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, Prisma 7 + SQLite (better-sqlite3 adapter), Tailwind v4, better-auth, react-email/Resend, Framer Motion (`RevealOnScroll`).

**Spec:** `docs/superpowers/specs/2026-08-25-featured-deals-design.md` — read it first; it defines "live deal", badge precedence, and scope.

## Global Constraints

- All work happens in `minott-web/` — run every command from there.
- **No automated test suite in this repo.** Per project convention, each task's verification gate is: `npx tsc --noEmit` && `npm run lint` && (where stated) `npm run build`. Do not add a test framework.
- Next.js 16: `middleware.ts` is `proxy.ts`; `cookies()`/`headers()`/`params`/`searchParams` are async; mutations are Server Actions. Read `node_modules/next/dist/docs/` if unsure.
- Named exports everywhere except Next `page`/`layout` default exports. `@/` path alias.
- Server Components by default; `"use client"` only where interactive.
- **No prices anywhere.** Badges are text only.
- **Live deal** (single definition, used everywhere): `active && (endsAt == null || endsAt > now)`.
- **Badge precedence** where one badge must be chosen: variant-scoped live deal for the exact SKU first, then product-level, then lowest `sortOrder`.
- Brand tokens: `bg-mec-red`, `text-mec-pure`, `bg-mec-ink`, `font-display-tight`, `rounded-pill`, etc. Match neighboring components' classes; don't invent new tokens.
- Commit after each task from the repo root with the message given in the task.

---

### Task 1: Schema, migration, and `lib/deals.ts`

**Files:**
- Modify: `minott-web/prisma/schema.prisma`
- Create: `minott-web/lib/deals.ts`
- Generated: `minott-web/prisma/migrations/*_add_deals/` (via `npm run db:migrate`)

**Interfaces:**
- Consumes: existing `db` singleton (`@/lib/db`), Prisma types.
- Produces (later tasks rely on these exact names):
  - `type DealBadge = { productId: number; variantId: number | null; label: string; sortOrder: number }`
  - `dealLabel(deal: { type: string; percentOff: number | null; badgeText: string | null }): string`
  - `liveDealWhere(now?: Date): Prisma.DealWhereInput`
  - `getFeaturedDeals(): Promise<{ deals: DealCard[]; total: number }>` (top 4 by sortOrder + total live count)
  - `getAllLiveDeals(): Promise<DealCard[]>`
  - `getLiveDealBadges(): Promise<DealBadge[]>`
  - `pickBadge(badges: DealBadge[], productId: number, variantIds: number[]): string | null`
  - `pickBadgeForVariant(badges: DealBadge[], productId: number, variantId: number | null): string | null`
  - `DealCard` — deal row incl. `product` (with `category`) and `variant`.

- [ ] **Step 1: Add the `Deal` model and `InquiryItem.dealLabel` to `prisma/schema.prisma`**

Add this model (after `ProductVariant`):

```prisma
model Deal {
  id          Int             @id @default(autoincrement())
  type        String // "PERCENT" | "CUSTOM"
  percentOff  Int? // 1-99; required when type == "PERCENT"
  badgeText   String? // required when type == "CUSTOM"; rendered verbatim
  description String? // optional card copy; falls back to product.shortDescription
  product     Product         @relation(fields: [productId], references: [id], onDelete: Cascade)
  productId   Int
  // null = whole product. SetNull: a SKU deal whose variant is deleted
  // degrades to a product-level deal (admins can edit/remove it).
  variant     ProductVariant? @relation(fields: [variantId], references: [id], onDelete: SetNull)
  variantId   Int?
  active      Boolean         @default(true)
  endsAt      DateTime? // optional auto-expiry; null = until deactivated
  sortOrder   Int             @default(0)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([productId])
}
```

Add back-relations: `deals Deal[]` on **both** `Product` and `ProductVariant`. Add to `InquiryItem`:

```prisma
  // Badge text of the deal live at submission time (e.g. "15% OFF"). Plain
  // snapshot, no FK — survives deal edits/expiry/deletion.
  dealLabel   String?
```

- [ ] **Step 2: Create and apply the migration**

Run: `npm run db:migrate -- --name add_deals`
Expected: migration folder created, applied cleanly, `prisma generate` run. If the shell prompts for a name, enter `add_deals`.

- [ ] **Step 3: Create `lib/deals.ts`**

```ts
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const DEAL_TYPE = { PERCENT: "PERCENT", CUSTOM: "CUSTOM" } as const;

/** Lightweight badge rows for listing/cart lookups. */
export type DealBadge = {
  productId: number;
  variantId: number | null;
  label: string;
  sortOrder: number;
};

/** Render a deal's badge text. The ONLY place label formatting lives. */
export function dealLabel(deal: {
  type: string;
  percentOff: number | null;
  badgeText: string | null;
}): string {
  if (deal.type === DEAL_TYPE.PERCENT && deal.percentOff != null) {
    return `${deal.percentOff}% OFF`;
  }
  return (deal.badgeText ?? "").trim();
}

/** The single "live deal" definition: active and not yet expired. */
export function liveDealWhere(now: Date = new Date()): Prisma.DealWhereInput {
  return { active: true, OR: [{ endsAt: null }, { endsAt: { gt: now } }] };
}

const cardInclude = {
  product: { include: { category: true } },
  variant: true,
} satisfies Prisma.DealInclude;

export type DealCard = Prisma.DealGetPayload<{ include: typeof cardInclude }>;

/** Top-4 live deals for the homepage, plus the total live count (for the
 *  "View all deals" threshold). Only deals on active products are shown. */
export async function getFeaturedDeals(): Promise<{
  deals: DealCard[];
  total: number;
}> {
  const where: Prisma.DealWhereInput = {
    ...liveDealWhere(),
    product: { is: { active: true } },
  };
  const [deals, total] = await Promise.all([
    db.deal.findMany({
      where,
      include: cardInclude,
      orderBy: { sortOrder: "asc" },
      take: 4,
    }),
    db.deal.count({ where }),
  ]);
  return { deals, total };
}

/** Every live deal (active products only), for the /deals page. */
export function getAllLiveDeals(): Promise<DealCard[]> {
  return db.deal.findMany({
    where: { ...liveDealWhere(), product: { is: { active: true } } },
    include: cardInclude,
    orderBy: { sortOrder: "asc" },
  });
}

/** All live deals as lightweight badges, for listing/cart/submission lookups. */
export async function getLiveDealBadges(): Promise<DealBadge[]> {
  const rows = await db.deal.findMany({
    where: liveDealWhere(),
    select: {
      productId: true,
      variantId: true,
      type: true,
      percentOff: true,
      badgeText: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((d) => ({
    productId: d.productId,
    variantId: d.variantId,
    label: dealLabel(d),
    sortOrder: d.sortOrder,
  }));
}

/**
 * Badge for a product card: precedence is variant-scoped deal on any of the
 * card's SKUs first, then product-level, then lowest sortOrder (rows arrive
 * sorted, so first match wins).
 */
export function pickBadge(
  badges: DealBadge[],
  productId: number,
  variantIds: number[],
): string | null {
  const mine = badges.filter((b) => b.productId === productId);
  const variantHit = mine.find(
    (b) => b.variantId != null && variantIds.includes(b.variantId),
  );
  const hit = variantHit ?? mine.find((b) => b.variantId == null);
  return hit && hit.label ? hit.label : null;
}

/** Badge for one exact SKU (or product-level fallback). */
export function pickBadgeForVariant(
  badges: DealBadge[],
  productId: number,
  variantId: number | null,
): string | null {
  const mine = badges.filter((b) => b.productId === productId);
  const hit =
    (variantId != null &&
      mine.find((b) => b.variantId === variantId)) ||
    mine.find((b) => b.variantId == null);
  return hit && hit.label ? hit.label : null;
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean. Also run `npm run db:seed` once to confirm the seed still works against the new schema.

- [ ] **Step 5: Commit**

```bash
git add minott-web/prisma minott-web/lib/deals.ts
git commit -m "feat(deals): Deal model, InquiryItem.dealLabel, shared deals read module"
```

---

### Task 2: Admin server actions (`lib/actions/admin-deals.ts`)

**Files:**
- Create: `minott-web/lib/actions/admin-deals.ts`
- Reference (read first): `minott-web/lib/actions/admin-products.ts`, `minott-web/lib/actions/admin-variants.ts` (for the sort-order move pattern, if one exists there — otherwise mirror products)

**Interfaces:**
- Consumes: `requireAdmin` (`@/lib/auth/require-admin`), `db`, `DEAL_TYPE` from Task 1.
- Produces: `type DealFormState = { error?: string }`; `createDeal(prev, formData)`, `updateDeal(prev, formData)` (useActionState-shaped), `deleteDeal(formData)`, `moveDeal(formData)` (direction `up`/`down` sort swap), all `"use server"`.

- [ ] **Step 1: Write `lib/actions/admin-deals.ts`**

Follow `admin-products.ts` conventions exactly (helpers `num`/`bool`/`str`, `requireAdmin()` first line, `revalidatePath`, `redirect` on success). Validation and parsing:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { DEAL_TYPE } from "@/lib/deals";

export type DealFormState = { error?: string };

function num(formData: FormData, key: string, fallback = 0): number {
  const n = Number(formData.get(key));
  return Number.isFinite(n) ? n : fallback;
}
function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

type DealData = {
  type: string;
  percentOff: number | null;
  badgeText: string | null;
  description: string | null;
  productId: number;
  variantId: number | null;
  active: boolean;
  endsAt: Date | null;
  sortOrder: number;
};

/** Parse + validate the deal form. Returns an error string or the data. */
async function buildData(
  formData: FormData,
): Promise<{ error: string } | { data: DealData }> {
  const type =
    str(formData, "type") === DEAL_TYPE.CUSTOM
      ? DEAL_TYPE.CUSTOM
      : DEAL_TYPE.PERCENT;
  const percentOff = num(formData, "percentOff", NaN);
  const badgeText = str(formData, "badgeText");
  if (type === DEAL_TYPE.PERCENT) {
    if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 99)
      return { error: "Percent off must be a whole number from 1 to 99." };
  } else if (!badgeText) {
    return { error: "Badge text is required for a custom deal." };
  }

  const productId = num(formData, "productId", NaN);
  const product = Number.isFinite(productId)
    ? await db.product.findUnique({ where: { id: productId } })
    : null;
  if (!product) return { error: "Please choose a valid product." };

  const variantRaw = str(formData, "variantId"); // "" = whole product
  let variantId: number | null = null;
  if (variantRaw) {
    const v = await db.productVariant.findUnique({
      where: { id: Number(variantRaw) },
    });
    if (!v || v.productId !== product.id)
      return { error: "That SKU does not belong to the chosen product." };
    variantId = v.id;
  }

  const endsAtRaw = str(formData, "endsAt"); // <input type="date"> — "" = none
  let endsAt: Date | null = null;
  if (endsAtRaw) {
    // End of the given day, so "ends Aug 30" includes Aug 30.
    const d = new Date(`${endsAtRaw}T23:59:59`);
    if (Number.isNaN(d.getTime())) return { error: "Invalid end date." };
    endsAt = d;
  }

  return {
    data: {
      type,
      percentOff: type === DEAL_TYPE.PERCENT ? percentOff : null,
      badgeText: type === DEAL_TYPE.CUSTOM ? badgeText : null,
      description: str(formData, "description") || null,
      productId: product.id,
      variantId,
      active: formData.get("active") === "on" || formData.get("active") === "true",
      endsAt,
      sortOrder: num(formData, "sortOrder"),
    },
  };
}

function revalidateDealSurfaces() {
  revalidatePath("/");
  revalidatePath("/deals");
  revalidatePath("/products");
  revalidatePath("/portal/deals");
}
```

Then `createDeal` / `updateDeal` (same shape as `createProduct`/`updateProduct`: call `buildData`, on `error` return it, else `db.deal.create`/`update`, `revalidateDealSurfaces()`, `redirect("/portal/deals")`), `deleteDeal` (`db.deal.delete`, revalidate, no redirect), and `moveDeal`:

```ts
/** Swap sortOrder with the neighbor in the given direction. */
export async function moveDeal(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = num(formData, "id", NaN);
  const dir = str(formData, "direction") === "up" ? "up" : "down";
  const all = await db.deal.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  const idx = all.findIndex((d) => d.id === id);
  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapWith < 0 || swapWith >= all.length) return;
  // Rewrite sortOrder as the array index so duplicate values self-heal.
  const reordered = [...all];
  [reordered[idx], reordered[swapWith]] = [reordered[swapWith], reordered[idx]];
  await db.$transaction(
    reordered.map((d, i) =>
      db.deal.update({ where: { id: d.id }, data: { sortOrder: i } }),
    ),
  );
  revalidateDealSurfaces();
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add minott-web/lib/actions/admin-deals.ts
git commit -m "feat(deals): admin server actions for deal CRUD and reordering"
```

---

### Task 3: Admin UI — `/portal/deals` list, form, nav link

**Files:**
- Create: `minott-web/app/portal/(protected)/deals/page.tsx`
- Create: `minott-web/app/portal/(protected)/deals/new/page.tsx`
- Create: `minott-web/app/portal/(protected)/deals/[id]/page.tsx`
- Create: `minott-web/components/admin/DealForm.tsx` (client)
- Create: `minott-web/components/admin/DeleteDealButton.tsx` (client; copy the `DeleteCategoryButton` pattern with a `confirm()`)
- Modify: `minott-web/app/portal/(protected)/layout.tsx` (add `{ href: "/portal/deals", label: "Deals" }` to `NAV_BY_ROLE.admin` after `Categories`)
- Reference (read first): `minott-web/app/portal/(protected)/products/page.tsx` + `products/new/page.tsx` + `products/[id]/page.tsx`, `minott-web/components/admin/ProductForm.tsx`, `minott-web/components/admin/DeleteCategoryButton.tsx`

**Interfaces:**
- Consumes: Task 2 actions; `dealLabel`, `DEAL_TYPE` from `@/lib/deals`; `requireAdminSession` from `@/lib/portal` (page gate — same as `requests/page.tsx`).
- Produces: `DealForm` props: `{ deal?: SerializedDeal; products: ProductOption[] }` where `ProductOption = { id: number; name: string; variants: { id: number; sku: string; label: string | null; size: string | null }[] }` — pages pass **all** products (active and not) with **all** their variants, ordered by name.

- [ ] **Step 1: List page `deals/page.tsx`**

Server Component. `await requireAdminSession();` then `db.deal.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], include: { product: true, variant: true } })`. Render a heading row with a "New deal" link (`/portal/deals/new`, styled like the products page's create button), then a table/card list where each row shows:
- badge chip: `dealLabel(deal)` in `bg-mec-red text-mec-pure rounded-pill px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]`
- target: `deal.product.name` + (deal.variant ? ` — ${deal.variant.label ?? deal.variant.sku}` : " (all SKUs)")
- status chip: `Expired` if `deal.endsAt && deal.endsAt <= new Date()`, else `Active`/`Inactive` from `deal.active`; plus `ends <date>` when set (`toLocaleDateString("en-JM", { timeZone: "America/Jamaica" })`)
- move up/down: two inline `<form action={moveDeal}>` buttons with hidden `id` + `direction` inputs
- Edit link → `/portal/deals/${deal.id}`; `DeleteDealButton` with the id.
Empty state: `No deals yet.` like other admin pages.

- [ ] **Step 2: `DealForm.tsx`**

`"use client"`. Mirror `ProductForm.tsx` structure (`useActionState(deal ? updateDeal : createDeal, {})`, same input classes). Fields:
- Product `<select name="productId">` (required) — options from props; `useState` for the selected product id so the variant select re-filters client-side.
- SKU `<select name="variantId">`: first option `value=""` label "Whole product — all SKUs", then the selected product's variants (`sku — label ?? size`). Reset to `""` when the product changes.
- Type: radio pair `name="type"` values `PERCENT` / `CUSTOM` (state-controlled). When PERCENT: `<input name="percentOff" type="number" min={1} max={99}>`; when CUSTOM: `<input name="badgeText" maxLength={40} placeholder="BUY 1 GET 1 FREE">`. Render only the relevant input (the server ignores the other).
- `description` textarea (optional, "Falls back to the product's short description"), `endsAt` `<input type="date">` (optional), `active` checkbox (`defaultChecked={deal?.active ?? true}`), `sortOrder` number (`defaultValue={deal?.sortOrder ?? 0}`).
- Hidden `id` input when editing. Error `<p>` from state, submit button per ProductForm.

- [ ] **Step 3: `new/page.tsx` and `[id]/page.tsx`**

Both `await requireAdminSession();`. Load `products` via `db.product.findMany({ orderBy: { name: "asc" }, include: { variants: { orderBy: { sortOrder: "asc" }, select: { id: true, sku: true, label: true, size: true } } } })` mapped to `ProductOption[]`. `[id]` page: `const { id } = await params;` (async params!), `db.deal.findUnique`, `notFound()` if missing; serialize `endsAt` to `YYYY-MM-DD` string for the date input. Mirror the products new/edit pages' headings/layout.

- [ ] **Step 4: Nav link + verify**

Add the Deals nav item to the admin array in `layout.tsx`. Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: clean build.

- [ ] **Step 5: Manual smoke (dev server)**

Run `npm run dev`, sign in as `admin@example.com` / `test123`, create one PERCENT deal (whole product) and one CUSTOM deal (specific SKU), edit one, reorder, verify status chips. Then delete nothing — leave both deals for later tasks' verification.

- [ ] **Step 6: Commit**

```bash
git add minott-web/app/portal minott-web/components/admin
git commit -m "feat(deals): admin deals page — list, create/edit form, reorder, nav"
```

---

### Task 4: Homepage `FeaturedDeals` section + `/deals` page

**Files:**
- Create: `minott-web/components/sections/FeaturedDeals.tsx`
- Create: `minott-web/components/deals/DealCardView.tsx` (shared card, server component)
- Create: `minott-web/app/deals/page.tsx`
- Modify: `minott-web/app/page.tsx` (render `<FeaturedDeals />` between `<TrustBar />` and `<NumbersBar />`)
- Reference (read first): `minott-web/components/sections/TrustBar.tsx` and `LegacyBanner.tsx` (dark-section styling), `minott-web/components/motion/RevealOnScroll.tsx` (or wherever `RevealOnScroll` lives — grep), `minott-web/components/primitives/Section.tsx`/`Container.tsx`/`Eyebrow.tsx`

**Interfaces:**
- Consumes: `getFeaturedDeals`, `getAllLiveDeals`, `dealLabel`, `DealCard` from `@/lib/deals`.
- Produces: `DealCardView({ deal }: { deal: DealCard })` — used by both the section and `/deals`.

- [ ] **Step 1: `DealCardView.tsx`**

Server component, dark-card styling per the approved mock (no prices): outer `div` `rounded-md border border-white/10 bg-white/[0.03] p-0 overflow-hidden flex flex-col`; red badge chip absolutely positioned top-left over the image (`absolute left-3 top-3 rounded-pill bg-mec-red px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-pure`) showing `dealLabel(deal)`; square image area (`relative aspect-square bg-white/5`, `next/image` `fill object-contain p-4`, src `deal.variant?.imagePath ?? deal.product.imagePath`); body: category eyebrow (`deal.product.category.name`, red rule + tiny uppercase like the mock), product name in `font-display-tight text-xl uppercase text-mec-pure`, variant line when SKU-scoped (`deal.variant.label ?? deal.variant.sku`, `text-sm text-mec-pure/60`), copy `deal.description ?? deal.product.shortDescription` (`text-sm text-mec-pure/70 line-clamp-3`), then `View Deal →` link at the bottom (`border border-white/25 hover:border-mec-red` uppercase button) to `/products/${deal.product.category.slug}/${deal.product.slug}`.

- [ ] **Step 2: `FeaturedDeals.tsx`**

Server component (async). `const { deals, total } = await getFeaturedDeals(); if (deals.length === 0) return null;` Dark `Section` (match how TrustBar/LegacyBanner set their dark tone — likely `tone="dark"` or `bg-mec-ink`): centered `Eyebrow` "Exclusive Offers" (red), `h2` "FEATURED DEALS" in `font-display` per the mock with the short red underline treatment used elsewhere if one exists, sub-line `Premium products. Limited-time savings. Built for performance.` in `text-mec-pure/70`. Grid `grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4`, each card wrapped in `RevealOnScroll` (match its existing usage signature — grep for `<RevealOnScroll` first). Below, only when `total > 4`: centered `View All Deals →` link to `/deals` (`border border-mec-red text-mec-red hover:bg-mec-red hover:text-mec-pure` uppercase button).

- [ ] **Step 3: `/deals` page**

`app/deals/page.tsx` — default export, `Metadata` (`title: "Deals — Minott Chemicals"`), dark `Section` with `pt-40` top clearance (match `/quote`'s page structure), `Eyebrow` "Exclusive Offers", `h1` "All deals.", grid of `DealCardView` for `await getAllLiveDeals()`; empty state `No active deals right now — check back soon.` with a `Browse Products` link. Public chrome is automatic (PublicChrome only hides on `/preview`).

- [ ] **Step 4: Wire into `app/page.tsx`** — insert `<FeaturedDeals />` after `<TrustBar />`, with the import.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npm run lint && npm run build`. Then `npm run dev`: homepage shows the two deals from Task 3 (section renders; with ≤4 live deals the View-all button must be absent), `/deals` lists both. Deactivate one deal in the portal → it disappears from both.

- [ ] **Step 6: Commit**

```bash
git add minott-web/components minott-web/app
git commit -m "feat(deals): homepage featured-deals section and /deals page"
```

---

### Task 5: Catalog badges — listing cards, product detail, variant selector

**Files:**
- Modify: `minott-web/components/products/ProductCard.tsx` (add `dealLabel: string | null` to `ProductCardData`; render chip)
- Modify: every page that builds `ProductCardData` — grep `toRow\|ProductCardData` under `minott-web/app/products/` (at minimum `app/products/all/page.tsx` and the `[category]` pages) and `minott-web/components/products/ProductSubsection.tsx` if it maps rows
- Modify: `minott-web/components/products/VariantSelector.tsx`, `ProductDetailView.tsx` (and `ProductDetailActions.tsx` if it owns the selected-variant state — read them first to find the owner)
- Modify: `minott-web/app/products/[category]/[slug]/page.tsx` (fetch badges, pass down)

**Interfaces:**
- Consumes: `getLiveDealBadges`, `pickBadge`, `pickBadgeForVariant`, `DealBadge` from `@/lib/deals`.
- Produces: `ProductCardData.dealLabel: string | null`; `VariantSelector` gains optional prop `dealBadges?: { variantId: number | null; label: string }[]` (pre-filtered to this product by the server page).

- [ ] **Step 1: `ProductCard` chip**

Add `dealLabel: string | null` to `ProductCardData`. In the image `<Link>` block, render when set — top-**right** so it never collides with the existing SDS chip at top-left:

```tsx
{product.dealLabel && (
  <span className="absolute right-3 top-3 inline-flex items-center rounded-pill bg-mec-red px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-pure">
    {product.dealLabel}
  </span>
)}
```

- [ ] **Step 2: Listing pages**

In each page that maps products to `ProductCardData`: fetch `const badges = await getLiveDealBadges();` once alongside the existing queries (`Promise.all` where one exists) and set `dealLabel: pickBadge(badges, p.id, p.variants.map(v => v.id))` in the row mapper. Every `ProductCardData` construction site must set the field (tsc will find them all — build the union by fixing every type error).

- [ ] **Step 3: Product detail page**

In `app/products/[category]/[slug]/page.tsx`: fetch badges, compute `const productBadges = badges.filter(b => b.productId === product.id).map(b => ({ variantId: b.variantId, label: b.label }));` and pass into the detail view. In the component that renders the title + owns the selected variant: show a badge chip next to/under the title using `pickBadgeForVariant`-equivalent logic client-side — product-level badge always; when a variant is selected and a variant-scoped badge matches it, show that instead. Keep it simple: compute `const badge = productBadges.find(b => b.variantId === selected.id) ?? productBadges.find(b => b.variantId === null) ?? null;` in the client component. Chip styling identical to Step 1 (inline, not absolute: `inline-flex rounded-pill bg-mec-red px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-pure`).

- [ ] **Step 4: `VariantSelector` pill badges**

Add optional `dealBadges` prop (default `[]`). In the size-pill map, when the variant a size resolves to (`variantFor(s, packType)` — or any variant of that size) has a matching `variantId` in `dealBadges`, append a small dot/asterisk-free marker: wrap pill text with a tiny `%` chip — simplest faithful approach: after the pill label, render `<span className="ml-1.5 rounded-pill bg-mec-pure/20 px-1.5 text-[9px] font-bold">DEAL</span>` when `dealBadges.some(b => b.variantId != null && variantsOfThisSize.some(v => v.id === b.variantId))`. Also show the resolved badge chip next to the SKU line for the currently selected variant. Do NOT restructure the selector.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npm run lint && npm run build`. Dev server: listing shows chips on both deal products (SKU-scoped deal chips appear on the card too — any-SKU rule); detail page shows the product-level chip always and swaps to the SKU chip when that variant is selected; non-deal products unchanged.

- [ ] **Step 6: Commit**

```bash
git add minott-web/components/products minott-web/app/products
git commit -m "feat(deals): deal badges on catalog cards, product detail and variant selector"
```

---

### Task 6: Quote flow — cart chips, submission snapshot, portal views, emails

**Files:**
- Modify: `minott-web/app/quote/page.tsx`, `minott-web/components/quote/QuotePageClient.tsx`
- Modify: `minott-web/lib/actions/inquiries.ts` (`submitQuote`)
- Modify: `minott-web/app/portal/(protected)/requests/page.tsx`
- Modify: rep quote detail `minott-web/app/portal/(protected)/quotes/[id]/page.tsx` (read first; render `dealLabel` on line items) — also check `quotes/page.tsx` and customer `history/` if they list items, add the chip wherever `productName`/items render
- Modify: `minott-web/lib/email/send-inquiry-emails.tsx`, `minott-web/emails/inquiry-notification.tsx`, `minott-web/emails/inquiry-confirmation.tsx`

**Interfaces:**
- Consumes: `getLiveDealBadges`, `pickBadgeForVariant` from `@/lib/deals`; `InquiryItem.dealLabel` from Task 1.
- Produces: `QuotePageClient` prop `deals: { byVariant: Record<number, string>; byProduct: Record<number, string> }`; `NotificationItem` gains `dealLabel: string | null`.

- [ ] **Step 1: Cart chips**

`app/quote/page.tsx`: fetch `const badges = await getLiveDealBadges();` and build the lookup (nothing stored client-side):

```ts
const deals = {
  byVariant: Object.fromEntries(
    badges.filter((b) => b.variantId != null).map((b) => [b.variantId as number, b.label]),
  ),
  byProduct: Object.fromEntries(
    // later (higher sortOrder) rows must not overwrite earlier ones
    [...badges].reverse().filter((b) => b.variantId == null).map((b) => [b.productId, b.label]),
  ),
};
```

Pass `deals` to `QuotePageClient`; add the prop there and in each line item render, after the variant label:

```tsx
{(deals.byVariant[it.variantId] ?? deals.byProduct[it.productId]) && (
  <span className="mt-1 inline-flex rounded-pill bg-mec-red px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-pure">
    {deals.byVariant[it.variantId] ?? deals.byProduct[it.productId]}
  </span>
)}
```

- [ ] **Step 2: Submission snapshot**

In `submitQuote` (`lib/actions/inquiries.ts`), before `db.inquiry.create`: `const badges = await getLiveDealBadges();` and in the items mapper add:

```ts
dealLabel: pickBadgeForVariant(
  badges,
  typeof i.productId === "number" ? i.productId : -1,
  typeof i.variantId === "number" ? i.variantId : null,
),
```

- [ ] **Step 3: Portal views**

`requests/page.tsx` line items: append the chip inside the `<li>` when `it.dealLabel` is set (same chip classes as Step 1). Do the same in the rep quote detail page (and any other page that renders `inquiry.items` — grep `items.map` under `app/portal/`). Customer history included if it renders items.

- [ ] **Step 4: Emails**

`send-inquiry-emails.tsx`: add `dealLabel: i.dealLabel ?? null` when mapping `inquiry.items` to `NotificationItem[]` (and `dealLabel: null` in the sample-product fallback branch). In `emails/inquiry-notification.tsx` and `inquiry-confirmation.tsx`: extend `NotificationItem`/item type with `dealLabel: string | null` and render ` · <deal>` after the item line, e.g. `{item.dealLabel ? ` — ${item.dealLabel}` : ""}` in the existing text (keep it plain-text-render safe: no absolutely-positioned styling, just inline text or a simple styled `<span>`).

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npm run lint && npm run build`. Dev server end-to-end: add a deal SKU + a non-deal SKU to the cart → chip on the deal line only; submit the quote → `/portal/requests` shows the chip on that line item; console shows the `[email] RESEND_API_KEY unset` warning path (no crash); deactivate the deal → cart chip disappears but the submitted request still shows its snapshot.

- [ ] **Step 6: Commit**

```bash
git add minott-web/app minott-web/components/quote minott-web/lib minott-web/emails
git commit -m "feat(deals): live deal chips in quote cart, submission snapshot, portal + email display"
```

---

## Final verification (after all tasks)

- [ ] `npx tsc --noEmit && npm run lint && npm run build` from `minott-web/` — all clean.
- [ ] Full manual click-through per the spec's Verification section (homepage 4-cap + >4 View-all threshold — create a 5th deal temporarily to see the button, then delete it; expiry via a past `endsAt`; SetNull degrade is schema-level, no UI check needed).
- [ ] Update `CLAUDE.md` (repo root) Architecture/Data sections with one or two sentences on deals (model, `/portal/deals`, surfaces, `InquiryItem.dealLabel` snapshot).
