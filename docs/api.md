# Public API

Read-only HTTP endpoints that expose the Minott product catalog for integration
with the embedded **OneChat AI assistant widget** (loaded in `app/layout.tsx`
from `onechat.floproltd.com`). The widget uses these endpoints to look up
products, categories, and detail pages so it can answer customer questions and
link back into the site.

All endpoints live under `/api/*` in the Next.js app (`minott-web/`) and are
served by the same Node process as the site (`next start`). The catalogue
endpoints are **public, unauthenticated, and `GET`-only**. A separate set of
**integration endpoints** (below) is bearer-authenticated and can create quote
requests.

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

## Integration endpoints (authenticated)

Used by the OneChat WhatsApp and voice agents. Every request must carry
`Authorization: Bearer <INTEGRATION_API_KEY>`; a wrong/missing key returns `401`
`{ "error": "unauthorized" }`. When `INTEGRATION_API_KEY` is unset on the server every
integration endpoint returns `503 { "error": "integration_disabled" }`. The per-IP
limiter above still applies.

### `POST /api/customers/verify`

Body `{ "mecAccountNumber": string, "companyName"?: string }` — only
`mecAccountNumber` is required (otherwise `400 bad_request`). The account number is
the credential (it is printed on every MEC invoice) and is normalised (uppercase,
spaces/dashes removed): **a correct account number alone verifies.** `companyName` is
optional — speech-to-text mangles company names on voice calls — but when it IS
supplied it must match the account's company (same normalised comparison as portal
account recovery), otherwise the result is `verified: false`.

`200 { "data": { "verified": true, "companyName": "…", "salesRep": { "name": "…" } | null } }`
or `200 { "data": { "verified": false } }`. A miss never says which field failed. Only
the company display name and the rep's name are ever returned.

Extra limiters (both on top of the global per-IP limiter):

- **10 attempts per (IP, account number) per 15 min** → `429`. The same bucket also
  applies to `POST /api/quotes` whenever `mecAccountNumber` is sent, so the two doors
  cannot be used to work around each other.
- **100 failed verifications per IP per 15 min** → `429` (enumeration guard, checked
  before the lookup). Only misses count, and **any successful verification clears the
  caller's accumulated misses**, restarting the counter — a real customer verifying
  proves the caller is the legitimate agent rather than an enumerator. A
  `verification_failed` result from `POST /api/quotes` counts against the same bucket,
  and a `VERIFIED` quote clears it. The ceiling is high, and resets on success, because
  agent traffic arrives from a single egress IP: a per-IP counter is effectively a
  per-fleet counter, so a low cap would let one caller's mistyped account numbers `429`
  every other customer.

Both return the standard `429` envelope
(`{ "error": "rate_limited", "message": "Too many verification attempts. Please try again later." }`)
with a `Retry-After` header.

### `POST /api/quotes`

```json
{
  "source": "whatsapp" | "voice",
  "contactName": "Andre Brown",
  "phone": "+18765551234",
  "email": "andre@example.com",
  "mecAccountNumber": "MEC-10442",
  "companyName": "Blue Mountain Hotels Ltd",
  "industry": "Hospitality & Tourism",
  "location": "Kingston",
  "items": [ { "slug": "industrial-degreaser", "quantity": 4, "note": "5 gal" } ],
  "notes": "Needs delivery before Friday"
}
```

- `contactName`, `items` (1–50, each `slug` must be an active product) and at least one
  of `email`/`phone` are required.
- Per-item `quantity` must be a positive integer ≤ 100000; larger or non-numeric values
  return `400 bad_request`.
- With `mecAccountNumber`: verified as above → the quote is linked to the company
  (`matchStatus: "VERIFIED"`) and the company's canonical name is stored. `companyName`
  is **optional** on this path; when supplied it must match. A miss returns
  `400 { "error": "verification_failed", "message": "Account number did not match an MEC account." }`
  — resubmit without the account number to file it as a guest quote.
- Without it (guest): `companyName`, `phone`, `industry` (approved list) and `location`
  are required; the existing customer matcher sets `POTENTIAL_MATCH` / `NO_MATCH`.
- `contactName`, `companyName`, `location`, `phone` and `email` are truncated to
  200 characters; over-long values are accepted and stored capped, not rejected.
- Sending `mecAccountNumber` also consumes the verification limiters described under
  `POST /api/customers/verify` (10 attempts per IP + account number per 15 min, and the
  100-misses-per-IP-per-15-min enumeration guard → `429`); a `verification_failed`
  result records a miss, and a `VERIFIED` result clears the caller's miss counter.
- Per-item `note` is appended to the product name in the portal. `notes` and the
  channel land in the inquiry message as `[via whatsapp] …`.
- A `ref` is issued on every quote (including verified ones) and is the capability
  used to fetch it via `GET /api/quotes/{ref}`; only a `NO_MATCH` quote's `ref` opens
  the New Customer Form.

`201 { "data": { "ref", "matchStatus", "itemCount", "salesRep"?: { "name" } | null, "newCustomerFormUrl"? } }`
— `salesRep` is present only when `VERIFIED`, and is then `{ "name" }` or `null` when the
company has no active rep (same shape as `GET /api/quotes/{ref}`); the key is absent
otherwise. `newCustomerFormUrl` only when `NO_MATCH`, and is always an absolute URL.
Errors: `400 bad_request` / `400 verification_failed` / `404 unknown_product` /
`500 internal_error`.

### `GET /api/quotes/{ref}`

`200 { "data": { "status": "NEW"|"IN_PROGRESS"|"CLOSED", "matchStatus", "submittedAt", "itemCount", "salesRep": { "name" } | null } }`
or `404 not_found`. No items, contact details or company name are returned.

## Not part of the widget integration

These endpoints exist in the app but are **not** general integration surfaces:

- **`/api/auth/[...all]`** — better-auth handler for the customer **portal**
  (sign-in/session). Internal to the portal UI; not for widget use.
- **`/portal/history/export`** — CSV export of a signed-in customer's inquiry
  history. Requires a valid portal session cookie; returns `401 Unauthorized`
  otherwise.

## Notes & limitations

- **Catalogue is read-only.** Quote creation is only available through the
  authenticated integration endpoints; sample requests and contact submissions
  still run through on-site Server Actions.
- Only **active** products and their categories are exposed; inactive products
  return `404` and don't appear in lists or counts.
- The `form` filter is a convenience over the single key spec field
  (`specLabel = "Form"`); products model only one spec label/value pair.
