# Public API

Read-only HTTP endpoints that expose the Minott product catalog for integration
with the embedded **OneChat AI assistant widget** (loaded in `app/layout.tsx`
from `onechat.floproltd.com`). The widget uses these endpoints to look up
products, categories, and detail pages so it can answer customer questions and
link back into the site.

All endpoints live under `/api/*` in the Next.js app (`minott-web/`) and are
served by the same Node process as the site (`next start`). They are **public,
unauthenticated, and `GET`-only**. Mutations (quotes, samples, contact) are not
exposed over this API — they go through Server Actions on the site itself.

## Base URL

Relative to the deployed site origin, e.g.:

```
https://<your-domain>/api
```

Responses use the origin resolved from the incoming request's proxy headers
(`x-forwarded-host` / `x-forwarded-proto`, falling back to `host`) to build the
absolute `url` fields. Behind a reverse proxy these must be forwarded for the
`url` values to be correct; otherwise items fall back to relative `path` values.

## Conventions

### Response envelope

Success responses wrap the payload in a `data` key:

```json
{ "data": ... }
```

Errors return a `429`-style envelope with a machine code and a human message:

```json
{ "error": "not_found", "message": "No product with that slug." }
```

### Rate limiting

A per-IP fixed-window limiter applies to **every** endpoint:

- **60 requests per IP per 60-second window.**
- Over the limit returns `429` with body `{ "error": "rate_limited", "message": "Too many requests. Please slow down." }` and a `Retry-After` header (seconds until the window resets).
- The limiter is in-memory and per-process — adequate for the single-node
  deployment, not for horizontally-scaled instances.

Client IP is taken from `x-forwarded-for` (first entry) or `x-real-ip`.

### Caching & CORS

- Every route is `force-dynamic` (rendered per request) so results stay in sync
  with admin edits. No response caching.
- No CORS headers are set. The widget is served from the same origin / embedded
  via its own loader script, so cross-origin browser `fetch` calls are not
  currently supported. Call server-side if you need cross-origin access.

---

## Endpoints

### `GET /api/products`

List active products, with optional filtering and full-text-ish search.

**Query parameters** (all optional):

| Param             | Type    | Description                                                              |
| ----------------- | ------- | ------------------------------------------------------------------------ |
| `q`               | string  | Case-insensitive substring match against name, short description, & SKU. |
| `category`        | string  | Category **slug** to filter by.                                          |
| `form`            | string  | Matches products whose spec is `Form = <value>` (e.g. `Liquid`).         |
| `isChemical`      | boolean | `true` / `false`.                                                        |
| `sampleAvailable` | boolean | `true` / `false`.                                                        |
| `featured`        | boolean | `true` / `false`.                                                        |
| `limit`           | integer | Max items to return. Default `20`, capped at `50`. Invalid → default.    |

Boolean params only accept the literal strings `true` or `false`; any other
value is ignored (treated as "no filter").

Results are active products only, ordered by name ascending.

**Response** — `200`, array of product cards:

```json
{
  "data": [
    {
      "slug": "industrial-degreaser",
      "name": "Industrial Degreaser",
      "categorySlug": "degreasers",
      "categoryName": "Degreasers",
      "shortDescription": "Heavy-duty solvent for grease and oil.",
      "isChemical": true,
      "sampleAvailable": true,
      "packSize": "5 gal",
      "sku": "MEC-DG-005",
      "featured": false,
      "imagePath": "/images/product-placeholder.png",
      "path": "/products/degreasers/industrial-degreaser",
      "url": "https://<your-domain>/products/degreasers/industrial-degreaser"
    }
  ]
}
```

**Product card fields:**

| Field              | Type             | Notes                                                |
| ------------------ | ---------------- | ---------------------------------------------------- |
| `slug`             | string           | Unique product identifier.                           |
| `name`             | string           |                                                      |
| `categorySlug`     | string           | Parent category slug.                                |
| `categoryName`     | string           | Parent category display name.                        |
| `shortDescription` | string \| null   |                                                      |
| `isChemical`       | boolean          |                                                      |
| `sampleAvailable`  | boolean          |                                                      |
| `packSize`         | string \| null   |                                                      |
| `sku`              | string \| null   |                                                      |
| `featured`         | boolean          |                                                      |
| `imagePath`        | string           | Site-relative image path; placeholder by default.    |
| `path`             | string           | Site-relative product page path.                     |
| `url`              | string           | Absolute product page URL when origin is resolvable. |

**Example:**

```bash
curl "https://<your-domain>/api/products?q=degreaser&isChemical=true&limit=5"
```

---

### `GET /api/products/{slug}`

Fetch a single active product by slug, including the detail-only fields.

**Path parameter:**

| Param  | Type   | Description                  |
| ------ | ------ | ---------------------------- |
| `slug` | string | The product's unique `slug`. |

**Response** — `200`, a single product with all card fields **plus**:

| Field         | Type           | Notes                                            |
| ------------- | -------------- | ------------------------------------------------ |
| `description` | string \| null | Full long-form description.                      |
| `sdsUrl`      | string \| null | Link to the Safety Data Sheet, if any.           |
| `specLabel`   | string \| null | Key spec label (e.g. `Form`).                    |
| `specValue`   | string \| null | Key spec value (e.g. `Liquid`).                  |

```json
{
  "data": {
    "slug": "industrial-degreaser",
    "name": "Industrial Degreaser",
    "categorySlug": "degreasers",
    "categoryName": "Degreasers",
    "shortDescription": "Heavy-duty solvent for grease and oil.",
    "isChemical": true,
    "sampleAvailable": true,
    "packSize": "5 gal",
    "sku": "MEC-DG-005",
    "featured": false,
    "imagePath": "/images/product-placeholder.png",
    "path": "/products/degreasers/industrial-degreaser",
    "url": "https://<your-domain>/products/degreasers/industrial-degreaser",
    "description": "A concentrated industrial-grade degreaser...",
    "sdsUrl": "https://<your-domain>/sds/industrial-degreaser.pdf",
    "specLabel": "Form",
    "specValue": "Liquid"
  }
}
```

**Errors:**

| Status | Body                                                          | When                               |
| ------ | ------------------------------------------------------------- | ---------------------------------- |
| `404`  | `{ "error": "not_found", "message": "No product with that slug." }` | Slug missing or product inactive.  |

**Example:**

```bash
curl "https://<your-domain>/api/products/industrial-degreaser"
```

---

### `GET /api/categories`

List all product categories with active-product counts. Ordered by the
admin-defined `sortOrder`.

**Query parameters:** none.

**Response** — `200`, array of categories:

```json
{
  "data": [
    {
      "slug": "degreasers",
      "name": "Degreasers",
      "description": "Solvents and degreasing agents.",
      "productCount": 12,
      "path": "/products/degreasers",
      "url": "https://<your-domain>/products/degreasers"
    }
  ]
}
```

**Category fields:**

| Field          | Type           | Notes                                        |
| -------------- | -------------- | -------------------------------------------- |
| `slug`         | string         | Unique category identifier.                  |
| `name`         | string         |                                              |
| `description`  | string \| null |                                              |
| `productCount` | integer        | Count of **active** products in the category. |
| `path`         | string         | Site-relative category page path.            |
| `url`          | string         | Absolute category page URL when resolvable.  |

**Example:**

```bash
curl "https://<your-domain>/api/categories"
```

---

## Not part of the widget integration

These endpoints exist in the app but are **not** general integration surfaces:

- **`/api/auth/[...all]`** — better-auth handler for the customer **portal**
  (sign-in/session). Internal to the portal UI; not for widget use.
- **`/portal/history/export`** — CSV export of a signed-in customer's inquiry
  history. Requires a valid portal session cookie; returns `401 Unauthorized`
  otherwise.

## Notes & limitations

- **Read-only.** There is no public API to create quotes, sample requests, or
  contact submissions; those run through on-site Server Actions.
- Only **active** products and their categories are exposed; inactive products
  return `404` and don't appear in lists or counts.
- The `form` filter is a convenience over the single key spec field
  (`specLabel = "Form"`); products model only one spec label/value pair.
