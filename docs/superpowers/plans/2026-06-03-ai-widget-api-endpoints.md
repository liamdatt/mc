# AI Widget API Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three public, read-only JSON endpoints (`/api/categories`, `/api/products`, `/api/products/[slug]`) that the OneChat AI widget calls as agent tools to retrieve catalog data.

**Architecture:** Next.js 16 App Router Route Handlers under `app/api/`. Data reads go through new helpers in `lib/products.ts` (mirroring existing Prisma read patterns). Cross-cutting concerns are isolated into small modules: `lib/rate-limit.ts` (in-memory per-IP limiter), `lib/api/serialize.ts` (response shaping + deep-link URLs), and `lib/api/http.ts` (JSON envelope + rate-limit guard). No DB schema changes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 7 + better-sqlite3 adapter.

> **Testing note — read before starting.** This repo has **no automated test runner** (see `CLAUDE.md`: verification is `npx tsc --noEmit`, `npm run lint`, `npm run build`, and manual click-through). Do **not** add Jest/Vitest. This plan keeps a tight verify-after-every-change loop using the project's actual tools: `npx tsc --noEmit` after each code unit, and `curl` against `npm run dev` to prove runtime behavior. All commands run from `minott-web/`.

> **Before you start:** open a terminal and run `npm run dev` (from `minott-web/`) in the background, OR start it when the first curl step needs it. Keep it running through the route tasks. The DB must be seeded (`npm run db:migrate && npm run db:seed`) so there is data to query.

---

## File Structure

**New files:**
- `minott-web/lib/rate-limit.ts` — in-memory fixed-window per-IP limiter + client-IP extraction. One responsibility: throttling.
- `minott-web/lib/api/serialize.ts` — request-origin resolution, path builders, and the category/product serializers (compact + detail). One responsibility: shaping data into the AI-friendly wire format.
- `minott-web/lib/api/http.ts` — JSON success/error envelope helpers + the rate-limit guard that composes `lib/rate-limit.ts`. One responsibility: HTTP transport concerns.
- `minott-web/app/api/categories/route.ts` — `GET /api/categories`.
- `minott-web/app/api/products/route.ts` — `GET /api/products`.
- `minott-web/app/api/products/[slug]/route.ts` — `GET /api/products/[slug]`.

**Modified files:**
- `minott-web/lib/products.ts` — add `getCategoriesForApi()`, `getProductsForApi(opts)`, `getProductForApi(slug)`.

---

## Task 1: In-memory rate limiter

**Files:**
- Create: `minott-web/lib/rate-limit.ts`

- [ ] **Step 1: Write the module**

Create `minott-web/lib/rate-limit.ts`:

```ts
import type { NextRequest } from "next/server";

/**
 * Tiny in-memory fixed-window rate limiter. Acceptable because the site is
 * deployed as a single long-running Node server (`next start`), so this Map is
 * shared across all requests in the one process. Not suitable for multi-instance
 * deployments — revisit if the app is ever horizontally scaled.
 */
type Bucket = { count: number; resetAt: number };

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60; // per IP per window
const MAX_BUCKETS = 10_000; // hard cap so the Map can't grow unbounded

const buckets = new Map<string, Bucket>();

function prune(now: number): void {
  for (const [ip, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(ip);
  }
}

export function checkRateLimit(ip: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const existing = buckets.get(ip);

  if (!existing || now >= existing.resetAt) {
    if (buckets.size >= MAX_BUCKETS) prune(now);
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (existing.count >= MAX_REQUESTS) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { ok: true };
}

/** Best-effort client IP from proxy headers; falls back to a constant. */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add lib/rate-limit.ts
git commit -m "feat(api): add in-memory per-IP rate limiter"
```

---

## Task 2: Serializers + origin/path helpers

**Files:**
- Create: `minott-web/lib/api/serialize.ts`

- [ ] **Step 1: Write the module**

Create `minott-web/lib/api/serialize.ts`:

```ts
import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

/** A product joined with its category, as returned by the API read helpers. */
type ProductWithCategory = Prisma.ProductGetPayload<{ include: { category: true } }>;

/** The shape returned by `getCategoriesForApi()`. */
type CategoryForApi = {
  slug: string;
  name: string;
  description: string | null;
  productCount: number;
};

/** Resolve the public origin from proxy headers; null if it can't be determined. */
export function getOrigin(req: NextRequest): string | null {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return null;
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export function categoryPath(slug: string): string {
  return `/products/${slug}`;
}

export function productPath(categorySlug: string, slug: string): string {
  return `/products/${categorySlug}/${slug}`;
}

/** Absolute URL when origin is known, otherwise the relative path. */
function absoluteUrl(origin: string | null, path: string): string {
  return origin ? `${origin}${path}` : path;
}

export function serializeCategory(c: CategoryForApi, origin: string | null) {
  const path = categoryPath(c.slug);
  return {
    slug: c.slug,
    name: c.name,
    description: c.description,
    productCount: c.productCount,
    path,
    url: absoluteUrl(origin, path),
  };
}

export function serializeProductCard(p: ProductWithCategory, origin: string | null) {
  const path = productPath(p.category.slug, p.slug);
  return {
    slug: p.slug,
    name: p.name,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
    shortDescription: p.shortDescription,
    isChemical: p.isChemical,
    sampleAvailable: p.sampleAvailable,
    packSize: p.packSize,
    sku: p.sku,
    featured: p.featured,
    imagePath: p.imagePath,
    path,
    url: absoluteUrl(origin, path),
  };
}

export function serializeProductDetail(p: ProductWithCategory, origin: string | null) {
  return {
    ...serializeProductCard(p, origin),
    description: p.description,
    sdsUrl: p.sdsUrl,
    specLabel: p.specLabel,
    specValue: p.specValue,
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. (If `Prisma.ProductGetPayload` errors, confirm `@prisma/client` was generated via `npm install` / `npx prisma generate`.)

- [ ] **Step 3: Commit**

```bash
git add lib/api/serialize.ts
git commit -m "feat(api): add response serializers and deep-link helpers"
```

---

## Task 3: HTTP envelope + rate-limit guard

**Files:**
- Create: `minott-web/lib/api/http.ts`

- [ ] **Step 1: Write the module**

Create `minott-web/lib/api/http.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

/** Success envelope: `{ data: ... }`. */
export function jsonData(data: unknown): NextResponse {
  return NextResponse.json({ data });
}

/** Error envelope: `{ error, message }` with a status code. */
export function jsonError(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: code, message }, { status });
}

/**
 * Returns a 429 response if the caller is over the limit, otherwise null.
 * Call at the top of every route handler: `const limited = enforceRateLimit(req); if (limited) return limited;`
 */
export function enforceRateLimit(req: NextRequest): NextResponse | null {
  const ip = clientIp(req);
  const { ok, retryAfter } = checkRateLimit(ip);
  if (ok) return null;
  console.warn(`[api] rate limit exceeded for ${ip}`);
  return NextResponse.json(
    { error: "rate_limited", message: "Too many requests. Please slow down." },
    { status: 429, headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined },
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/api/http.ts
git commit -m "feat(api): add JSON envelope helpers and rate-limit guard"
```

---

## Task 4: Read helpers in lib/products.ts

**Files:**
- Modify: `minott-web/lib/products.ts` (append new functions; the file already imports `Prisma` and `db`)

- [ ] **Step 1: Add the three read helpers**

Append to `minott-web/lib/products.ts` (the existing `import { Prisma } from "@prisma/client"` and `import { db } from "@/lib/db"` at the top already cover these):

```ts
/** All categories with active-product counts, for the public API. */
export async function getCategoriesForApi() {
  const cats = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { products: { where: { active: true }, select: { id: true } } },
  });
  return cats.map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    productCount: c.products.length,
  }));
}

/** Filtered active-product list for the public API. */
export function getProductsForApi(opts: {
  q?: string;
  categorySlug?: string;
  form?: string;
  isChemical?: boolean;
  sampleAvailable?: boolean;
  featured?: boolean;
  limit: number;
}) {
  const where: Prisma.ProductWhereInput = { active: true };
  if (opts.categorySlug) where.category = { slug: opts.categorySlug };
  if (opts.form) {
    where.specLabel = "Form";
    where.specValue = opts.form;
  }
  if (opts.isChemical !== undefined) where.isChemical = opts.isChemical;
  if (opts.sampleAvailable !== undefined) where.sampleAvailable = opts.sampleAvailable;
  if (opts.featured !== undefined) where.featured = opts.featured;
  if (opts.q) {
    // SQLite LIKE (Prisma `contains`) is case-insensitive for ASCII.
    where.OR = [
      { name: { contains: opts.q } },
      { shortDescription: { contains: opts.q } },
      { sku: { contains: opts.q } },
    ];
  }
  return db.product.findMany({
    where,
    include: { category: true },
    orderBy: { name: "asc" },
    take: opts.limit,
  });
}

/** Single active product by slug (with category), or null if missing/inactive. */
export async function getProductForApi(slug: string) {
  const product = await db.product.findUnique({
    where: { slug },
    include: { category: true },
  });
  if (!product || !product.active) return null;
  return product;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/products.ts
git commit -m "feat(api): add catalog read helpers for public API"
```

---

## Task 5: GET /api/categories

**Files:**
- Create: `minott-web/app/api/categories/route.ts`

- [ ] **Step 1: Write the route handler**

Create `minott-web/app/api/categories/route.ts`:

```ts
import type { NextRequest } from "next/server";
import { getCategoriesForApi } from "@/lib/products";
import { getOrigin, serializeCategory } from "@/lib/api/serialize";
import { jsonData, enforceRateLimit } from "@/lib/api/http";

// Prisma reads are not auto-dynamic; force per-request rendering so the catalog
// stays in sync with admin edits (matches the site-wide convention).
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;

  const origin = getOrigin(req);
  const categories = await getCategoriesForApi();
  return jsonData(categories.map((c) => serializeCategory(c, origin)));
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Verify at runtime with curl**

Ensure `npm run dev` is running. Run:
`curl -s localhost:3000/api/categories | head -c 600; echo`
Expected: JSON `{"data":[ ... ]}` with category objects that each have `slug`, `name`, `description`, `productCount`, `path` (e.g. `/products/<slug>`), and `url` (absolute, e.g. `http://localhost:3000/products/<slug>`).

- [ ] **Step 4: Commit**

```bash
git add app/api/categories/route.ts
git commit -m "feat(api): add GET /api/categories endpoint"
```

---

## Task 6: GET /api/products

**Files:**
- Create: `minott-web/app/api/products/route.ts`

- [ ] **Step 1: Write the route handler**

Create `minott-web/app/api/products/route.ts`:

```ts
import type { NextRequest } from "next/server";
import { getProductsForApi } from "@/lib/products";
import { getOrigin, serializeProductCard } from "@/lib/api/serialize";
import { jsonData, enforceRateLimit } from "@/lib/api/http";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function parseBool(v: string | null): boolean | undefined {
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);

  const rawLimit = Number(searchParams.get("limit"));
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
      : DEFAULT_LIMIT;

  const products = await getProductsForApi({
    q: searchParams.get("q") ?? undefined,
    categorySlug: searchParams.get("category") ?? undefined,
    form: searchParams.get("form") ?? undefined,
    isChemical: parseBool(searchParams.get("isChemical")),
    sampleAvailable: parseBool(searchParams.get("sampleAvailable")),
    featured: parseBool(searchParams.get("featured")),
    limit,
  });

  const origin = getOrigin(req);
  return jsonData(products.map((p) => serializeProductCard(p, origin)));
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Verify at runtime with curl**

With `npm run dev` running:

1. Unfiltered: `curl -s 'localhost:3000/api/products?limit=3' | head -c 800; echo`
   Expected: `{"data":[ ... ]}`, at most 3 compact product cards, each with `slug`, `name`, `categorySlug`, `categoryName`, `path`, `url`.
2. Keyword search: `curl -s 'localhost:3000/api/products?q=clean&limit=5' | head -c 800; echo`
   Expected: only products whose name/shortDescription/sku contain "clean" (case-insensitive). If your seed has no such match, try a substring you know exists from step 1's output.
3. Featured filter: `curl -s 'localhost:3000/api/products?featured=true' | head -c 400; echo`
   Expected: only featured products (or empty `{"data":[]}` if none seeded).

- [ ] **Step 4: Commit**

```bash
git add app/api/products/route.ts
git commit -m "feat(api): add GET /api/products search endpoint"
```

---

## Task 7: GET /api/products/[slug]

**Files:**
- Create: `minott-web/app/api/products/[slug]/route.ts`

- [ ] **Step 1: Write the route handler**

Create `minott-web/app/api/products/[slug]/route.ts`:

```ts
import type { NextRequest } from "next/server";
import { getProductForApi } from "@/lib/products";
import { getOrigin, serializeProductDetail } from "@/lib/api/serialize";
import { jsonData, jsonError, enforceRateLimit } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;

  const { slug } = await params;
  const product = await getProductForApi(slug);
  if (!product) {
    return jsonError("not_found", "No product with that slug.", 404);
  }

  const origin = getOrigin(req);
  return jsonData(serializeProductDetail(product, origin));
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Verify at runtime with curl**

With `npm run dev` running:

1. Grab a real slug from the list endpoint:
   `SLUG=$(curl -s 'localhost:3000/api/products?limit=1' | grep -o '"slug":"[^"]*"' | head -1 | cut -d'"' -f4); echo "$SLUG"`
2. Detail: `curl -s "localhost:3000/api/products/$SLUG" | head -c 900; echo`
   Expected: `{"data":{ ... }}` with all compact-card fields **plus** `description`, `sdsUrl`, `specLabel`, `specValue`.
3. Not found: `curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/api/products/definitely-not-a-real-slug`
   Expected: `404`.

- [ ] **Step 4: Commit**

```bash
git add app/api/products/[slug]/route.ts
git commit -m "feat(api): add GET /api/products/[slug] detail endpoint"
```

---

## Task 8: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: PASS, no errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors (warnings acceptable if pre-existing).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds. The three `/api/*` routes appear in the route list, marked dynamic (ƒ), not static.

- [ ] **Step 4: Rate-limit smoke test**

With `npm run dev` running, fire >60 requests in one window and confirm a 429 appears:
`for i in $(seq 1 70); do curl -s -o /dev/null -w "%{http_code} " localhost:3000/api/categories; done; echo`
Expected: a run of `200` codes followed by `429` once the per-minute limit is crossed. (A `Retry-After` header is sent on the 429.)

- [ ] **Step 5: Final commit (if anything outstanding)**

```bash
git add -A
git commit -m "chore(api): verify AI widget endpoints (tsc, lint, build, curl)" || echo "nothing to commit"
```

---

## Post-implementation: wiring OneChat tools

Not a code task in this repo, but record for the implementer/handoff. In the OneChat agent config, register three tools pointing at the deployed origin:

- `list_categories` → `GET {ORIGIN}/api/categories`
- `search_products` → `GET {ORIGIN}/api/products` with optional query params `q`, `category`, `form`, `isChemical`, `sampleAvailable`, `featured`, `limit`
- `get_product` → `GET {ORIGIN}/api/products/{slug}`

Instruct the agent to surface the returned `url` field as a clickable link when recommending a product or category.

---

## Spec Coverage Check

- `/api/categories` (`list_categories`) → Task 5 ✅
- `/api/products` (`search_products`) with all 7 params → Task 4 (`getProductsForApi`) + Task 6 ✅
- `/api/products/[slug]` (`get_product`) incl. 404 → Task 4 (`getProductForApi`) + Task 7 ✅
- `path` + absolute `url` on every item → `serialize.ts` (Task 2), used in Tasks 5–7 ✅
- `{ data }` / `{ error, message }` envelope → `http.ts` (Task 3) ✅
- Simple substring `q` over name/shortDescription/sku → Task 4 ✅
- In-memory per-IP rate limit, 429 + log, not silent → Tasks 1, 3; verified Task 8 ✅
- No DB schema changes → confirmed (only `lib/products.ts` read helpers) ✅
- Out-of-scope items (writes, company endpoint, auth, full-text) → not implemented ✅
