# Featured Deals — Design

**Date:** 2026-08-25
**Status:** Approved (brainstorm with Liam)

## Summary

Admin-managed "Featured Deals" for the Minott site. Admins create deals against a
product or a specific SKU (variant); deals render as badge chips ("15% OFF" or
free-text, e.g. "BUY 1 GET 1 FREE") — **no prices anywhere** (the site has none).
Deals surface on the homepage (top 4 + "View all deals"), a `/deals` page, the
products listing, product detail, the quote-builder cart, and on submitted quotes
seen by sales reps/admins (snapshotted at submission time).

## Data model

New `Deal` model (`prisma/schema.prisma`):

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `type` | String | `"PERCENT"` \| `"CUSTOM"` |
| `percentOff` | Int? | 1–99; required when `PERCENT`. Badge renders `"{n}% OFF"` |
| `badgeText` | String? | required when `CUSTOM`; rendered verbatim (uppercased in UI) |
| `description` | String? | optional card copy; falls back to product `shortDescription` |
| `productId` | Int | required; `onDelete: Cascade` |
| `variantId` | Int? | null = whole product; set = that SKU only; `onDelete: SetNull` — **a SKU deal whose variant is deleted degrades to a product-level deal** (acceptable; admins can edit/delete it) |
| `active` | Boolean | default true; admin toggle |
| `endsAt` | DateTime? | optional auto-expiry |
| `sortOrder` | Int | admin curation; homepage shows top 4 |
| `createdAt` / `updatedAt` | DateTime | |

**Live deal** (the single definition used everywhere):
`active && (endsAt == null || endsAt > now)`.

No uniqueness constraint. Where one badge must be chosen (product card, line
item), precedence is: **variant-scoped live deal for the exact SKU first, then
product-level live deal, then lowest `sortOrder` wins** among remaining ties.

`InquiryItem` gains `dealLabel String?` — a plain-text snapshot (no FK) of the
badge text live at quote submission. Survives deal edits/expiry/deletion.

Badge-label rendering (`PERCENT` → `"15% OFF"`, `CUSTOM` → text) is one shared
helper (e.g. `lib/deals.ts`) used by every surface including the submission
snapshot, so labels can never diverge.

## Admin (portal)

- New admin-gated page **`/portal/deals`** under `app/portal/(protected)/deals/`,
  role-gated like products/categories.
- **List:** badge preview, target ("Product" or "Product — SKU label"), status
  (Active / Inactive / Expired), sort-order controls (same up/down pattern as
  products), edit, delete.
- **Form (create/edit):** product select → optional variant select (options load
  from the chosen product), type toggle Percent ↔ Custom text (percent number
  input vs. free-text input), optional description, optional end date, active
  checkbox.
- Mutations in `lib/actions/admin-deals.ts`, following `admin-products.ts`
  conventions (session gate, zod-style validation as done elsewhere,
  `revalidatePath`).
- "Deals" link added to the portal admin nav.

## Public display

All reads via `lib/products.ts` / a small `lib/deals.ts` read module, in Server
Components (root layout is already `force-dynamic`, so no staleness).

- **Homepage:** new `FeaturedDeals` section in `components/sections/`, placed
  below the hero, styled per the approved mock minus prices: dark section,
  "EXCLUSIVE OFFERS" eyebrow + "FEATURED DEALS" display heading, 4-card grid.
  Card = red badge chip (top-left), product/variant image, category eyebrow,
  product name (+ variant label line when SKU-scoped), description (deal
  `description` or product `shortDescription`), "View deal →" linking to the
  product detail page. Shows the top-4 live deals by `sortOrder`; renders
  nothing when there are none; "View all deals" button only when > 4. Uses the
  existing `RevealOnScroll` / motion conventions (reduced-motion respected).
- **`/deals` page:** all live deals, same cards, public chrome, standard reveal
  motion. Linked from the homepage button.
- **Products listing:** `ProductCard` shows the precedence-selected badge chip
  when the product or any of its SKUs has a live deal. Listing queries in
  `lib/products.ts` include live deals so no client fetching is added.
- **Product detail:** product-level deal badge near the title. SKU-level deals
  badge the matching option in `VariantSelector` and appear in the header while
  that variant is selected.

## Quote flow

- **Cart (`/quote`):** the quote page Server Component fetches all live deals
  and passes a lookup map (`productId`/`variantId` → badge label) to
  `QuotePageClient`; each cart line renders its chip from the map. Labels are
  always live — they vanish if the deal ends while items sit in the cart and
  always match what submission will stamp. Nothing deal-related is stored in
  the localStorage cart.
- **Submission:** the quote server action (`lib/actions/inquiries.ts`) resolves
  the live deal per line item (variant first, then product) and stamps
  `InquiryItem.dealLabel`.
- **Rep/admin views:** line items in `/portal/requests/[id]` and the rep's
  `/portal/quotes/[id]` render `dealLabel` as a chip next to the product name.
- **Emails:** internal notification (rep + general inbox) and the customer
  confirmation list the deal label on affected line items.

## Out of scope

Prices/savings amounts, deal start-date scheduling, stacking rules, per-deal
landing pages, customer-facing deal history.

## Verification

No automated test suite exists; verification is:

1. `npx tsc --noEmit`, `npm run lint`, `npm run build`.
2. Migration applies cleanly to an existing dev DB (`npm run db:migrate`);
   empty `Deal` table → homepage section and `/deals` render nothing/empty
   state; no bootstrap/seed changes needed.
3. Manual click-through: create a percent deal (product-level) and a custom
   deal (SKU-level); verify homepage (4-card cap + View-all threshold),
   `/deals`, listing badge, detail + variant badge, cart chip, submit a quote
   and confirm `dealLabel` on the request in the portal and in emails
   (`RESEND_API_KEY` unset → console warning path); expire one deal and
   deactivate another and confirm all surfaces drop them while the submitted
   quote keeps its snapshot.
