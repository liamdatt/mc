# AI Widget API Endpoints — Design

**Date:** 2026-06-03
**Status:** Approved, ready for implementation plan
**Scope:** Public, read-only REST endpoints that the OneChat AI assistant widget calls as agent tools.

## Background

The site embeds a third-party AI assistant, **OneChat**, loaded via `<Script>` in
`app/layout.tsx` (`https://onechat.floproltd.com/widget/loader?key=…`). The agent's
tools live in OneChat's own configuration; each tool makes an HTTP request to this
site. Today `app/api/` is empty — these are the site's first API routes.

The goal: give the agent read access to the catalog so it can answer product questions
accurately and link users to real pages, instead of guessing.

## Decisions (locked)

- **Read-only.** No writes/mutations in this iteration. Submitting quotes/samples/contact
  inquiries via the agent is explicitly deferred.
- **Public, no auth.** The data is identical to what the public catalog already renders.
  Defense is light rate-limiting, not a key.
- **Simple substring search** for the `q` param — no full-text engine, no extra deps.
- **No DB schema changes.** Reuses existing Prisma models and `lib/products.ts` patterns.

## Endpoints

All endpoints are `GET`, return JSON, and live under `app/api/`. Every category or
product object in a response carries **both** a relative `path` and an absolute `url`
(built from the incoming request's origin) so the agent can deep-link users.

Response envelope:

- Success (list): `{ "data": [ … ] }`
- Success (single): `{ "data": { … } }`
- Error: `{ "error": "<code>", "message": "<human readable>" }` with an appropriate status.

### 1. `GET /api/categories` — tool `list_categories`

Lists all product categories with counts.

- **Source:** existing `getCategoriesWithCounts()` in `lib/products.ts`.
- **Item shape:**
  ```json
  {
    "slug": "cleaning-chemicals",
    "name": "Cleaning Chemicals",
    "description": "…",
    "productCount": 12,
    "path": "/products/cleaning-chemicals",
    "url": "https://example.com/products/cleaning-chemicals"
  }
  ```
- **No params.**

### 2. `GET /api/products` — tool `search_products`

The workhorse. Searches and filters active products. This single endpoint covers
keyword search, category/attribute filtering, and "what's featured/recommended."

- **Query params (all optional):**
  | Param | Type | Behavior |
  |---|---|---|
  | `q` | string | Case-insensitive substring match across `name`, `shortDescription`, and `sku`. |
  | `category` | string (slug) | Restrict to one category. |
  | `form` | string | Match `specLabel = "Form"` and `specValue = <value>` (e.g. `Liquid`). |
  | `isChemical` | `true`/`false` | Filter by chemical flag. |
  | `sampleAvailable` | `true`/`false` | Filter by sample availability. |
  | `featured` | `true`/`false` | Filter featured products. |
  | `limit` | int | Default **20**, clamped to max **50**. |
- Only `active: true` products are ever returned.
- **Source:** new helper `getProductsForApi(opts)` in `lib/products.ts`, mirroring the
  existing `getProductsForListing` style. The `q` substring filtering is applied with
  Prisma `contains` (SQLite is case-insensitive for ASCII by default); combine the
  three fields with `OR`.
- **Item shape (compact card):**
  ```json
  {
    "slug": "multi-surface-cleaner",
    "name": "Multi-Surface Cleaner",
    "categorySlug": "cleaning-chemicals",
    "categoryName": "Cleaning Chemicals",
    "shortDescription": "…",
    "isChemical": true,
    "sampleAvailable": true,
    "packSize": "5L",
    "sku": "MSC-5L",
    "featured": false,
    "imagePath": "/images/product-placeholder.png",
    "path": "/products/cleaning-chemicals/multi-surface-cleaner",
    "url": "https://example.com/products/cleaning-chemicals/multi-surface-cleaner"
  }
  ```

### 3. `GET /api/products/[slug]` — tool `get_product`

Full detail for one product by slug.

- **Source:** new helper `getProductForApi(slug)` (or reuse a slug lookup), returning the
  product with its category. Must be `active: true`, else treated as not found.
- **Returns** every field from the compact card **plus**: `description`, `sdsUrl`,
  `specLabel`, `specValue`.
- **Not found:** status `404`, body `{ "error": "not_found", "message": "No product with that slug." }`.

## Cross-cutting concerns

### Absolute URL construction

Build `url` from the incoming request's origin (`new URL(req.url).origin`, or the
`Host`/`X-Forwarded-Host` + proto headers). The relative `path` is always present even
if origin resolution fails. No new env var required.

### Rate limiting

- New `lib/rate-limit.ts`: a small in-memory per-IP fixed-window (or token-bucket)
  limiter. Acceptable because deployment is a single long-running Node server
  (`next start`), so process memory is shared across requests.
- Suggested default: ~60 requests/minute/IP (tune during implementation).
- Client IP from `X-Forwarded-For` (first hop) falling back to a sane default.
- Over-limit → status `429`, body `{ "error": "rate_limited", "message": "…" }`, and a
  `console.warn` log so drops are visible, not silent.
- Applied at the top of each route handler via a shared helper.

### Response/altitude conventions

- Flat, descriptively-named fields; no leaking of Prisma internals (`categoryId`,
  `sortOrder`, timestamps) unless useful to the agent.
- Field names chosen for an LLM consumer (e.g. `sampleAvailable`, not `sample_avail`).
- Consistent envelope and error codes across all three endpoints.

## Files

**New:**
- `app/api/categories/route.ts`
- `app/api/products/route.ts`
- `app/api/products/[slug]/route.ts`
- `lib/rate-limit.ts`
- A small shared serializer/origin helper (e.g. `lib/api/serialize.ts`) if it reduces
  duplication across the three handlers — decide during implementation.

**Modified:**
- `lib/products.ts` — add `getProductsForApi(opts)` and `getProductForApi(slug)` (or a
  reused slug lookup).

**No schema or migration changes.**

## Out of scope (deferred, not rejected)

- Write endpoints: submitting quote/sample/contact inquiries via the agent.
- Quote-cart building/sync via the agent.
- A static `GET /api/company` business-info endpoint (address, hours, brands, how-to-quote).
- API-key / header auth.
- Full-text search.

## Verification

No automated test suite in this repo. Verify via:
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Manual `curl` against `npm run dev`:
  - `curl localhost:3000/api/categories`
  - `curl 'localhost:3000/api/products?q=cleaner&limit=5'`
  - `curl localhost:3000/api/products/<known-slug>`
  - `curl localhost:3000/api/products/does-not-exist` → 404
  - Rapid repeated calls → eventually 429.
