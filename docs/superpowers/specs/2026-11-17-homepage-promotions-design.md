# Homepage recreation + admin-managed rotating promotions — design

Date: 2026-11-17 · Status: approach A chosen; awaiting doc approval

## Intent

The client supplied a homepage mockup (`assets/client-review-2026-10/requested-homepage-mockup.png`:
hero → partner strip → intro section with a promotion card on the
right, "October Feature / Paper Products / Save 15% … / Shop the Promotions").
The live homepage matches the hero and strip, but the section below the strip
renders with an empty right half: the card today only appears when a single
product has a live `Deal`, and it shows that one product, not a campaign.

The client wants that card to be a **marketing campaign** that staff manage
themselves in the Accounts Portal, and when several are live the card
**rotates** through them.

## Goals

- Recreate the mockup's section under the partner strip faithfully: intro copy
  and pillars on the left, a promotion card on the right, on a light mist band.
- New **Promotions** admin page (admin role only) to create, edit, reorder,
  switch on/off and delete promotions.
- Homepage card rotates through every live promotion, in admin order.

## Non-goals

- No prices anywhere (unchanged rule).
- Promotions do not change product deals, quote lines, or `dealLabel` snapshots.
  `Deal` and the `FeaturedDeals` section stay exactly as they are.
- No per-promotion image upload — image comes from the chosen category
  (client decision).
- No auto-suggested badge from deals (offered, not taken).

## Anti-goals

- A carousel that shifts layout, hijacks scroll, or autoplays for
  reduced-motion users.
- Mockup copy that the client's later review overruled: keep "Since 1988", no
  Purell, current nav. Match the mockup's layout/look, not those words.

## Approaches considered

- **A. Admin-written promotions linked to a category (chosen).** Exact
  campaign wording; costs one admin step per campaign.
- B. Auto-generate one card per category with live deals. Zero admin work but
  generic wording, no "October Feature" label, can't promote non-deal things.
  Rejected: can't produce the mockup's card.
- C. Keep deal-driven card. Rejected: it is the cause of today's empty/one-product card.

## Data

New Prisma model `Promotion` (+ migration):

| field | type | notes |
|---|---|---|
| id | Int pk | |
| eyebrow | String | small label, e.g. "October Feature" (≤ 40) |
| title | String | e.g. "Paper Products" (≤ 60) |
| body | String | one line, e.g. "Save 15% on selected paper products through October 31." (≤ 160) |
| badgeText | String? | e.g. "Save 15%"; ≤ 14 chars; omitted = no badge |
| ctaLabel | String | default "Shop the Promotion" |
| category | Category, `onDelete: Cascade` | required; supplies image + link |
| startsAt | DateTime? | Jamaica start-of-day; null = immediately |
| endsAt | DateTime? | Jamaica end-of-day (same `T23:59:59-05:00` rule as deals); null = until switched off |
| active | Boolean | default true |
| sortOrder | Int | admin order (↑/↓ like deals) |
| createdAt/updatedAt | | |

"Live" = `active && (startsAt null or ≤ now) && (endsAt null or > now)`, one
helper in `lib/promotions.ts` (server-only, `cache()`d per request), mirroring
`liveDealWhere`.

Image: `category.imagePath` as it exists today (a single product packshot on
white, set at catalog import), falling back to the product placeholder. Client
decision: use these as-is — no category image upload, no staged photos. The card
therefore renders the image `object-contain` with padding on white (like the
current promo card), not full-bleed like the mockup's staged photo. Link:
`/products/[category.slug]`.

## Admin (portal)

Mirror the Deals admin (`app/portal/(protected)/deals/*`, `lib/actions/admin-deals.ts`,
`components/admin/DealForm.tsx`):

- `/portal/promotions` — table: badge, title, category, status (Scheduled /
  Live / Expired / Inactive) + dates, ↑/↓ reorder, Edit, Delete (confirm).
- `/portal/promotions/new`, `/portal/promotions/[id]` — `PromotionForm`:
  category select, eyebrow, title, body, badge, button label, start date, end
  date, active toggle; a live preview of the card beside the form is a nice-to-have
  (builder's call).
- Server Actions in `lib/actions/admin-promotions.ts`, admin-gated
  (`requireAdminSession` pattern), validated server-side, `revalidatePath("/")`.
- Sidebar link "Promotions" next to "Deals" in `app/portal/(protected)/layout.tsx`.

## Homepage

Section under the partner strip (`SourceSpotlight`, renamed only if helpful):

- Left: keep the client-review copy that is already there ("Cleaner Spaces.
  Healthier People." eyebrow, "Your #1 Source…" heading, Chemicals + Equipment
  pillars, "Explore our products" link), restyled to the mockup's proportions.
- Right: `PromotionCarousel` (client component) — mockup card: white card,
  text column (red hairline + eyebrow, big Bebas title, body, red
  "Shop the Promotion →" button), image column with the category image and a red
  circular badge top-right.
- Rotation: crossfade every ~6 s; pauses on hover and keyboard focus and when
  the tab is hidden; small dot buttons (labelled "Show promotion 2 of 3") to
  jump; fixed card height so nothing shifts. One promotion → no dots, no timer.
  Reduced motion → no autoplay, dots still work, no fade.
- No live promotions → card hidden; left column spans as today.
- Hero "See the Promotions" behaviour is unchanged (targets `#deals` /
  `/deals`).

## Constraints

- Next 16 / React 19 conventions in `CLAUDE.md` (Server Actions, async params,
  `useSyncExternalStore` for browser state, reduced-motion gating).
- Tokens from `globals.css`; no new colours.
- Update `CLAUDE.md` (Data & admin + component lists).

## Left to the builder

Exact spacing/typography to match the mockup at 1440 and on mobile, form
layout, whether to show a live preview, timer implementation details.
Verify with `tsc`, `lint`, `build`, and Playwright screenshots at 1440 and 390
with 0, 1 and 3 live promotions.
