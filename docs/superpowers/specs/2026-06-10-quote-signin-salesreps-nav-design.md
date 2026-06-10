# Quote sign-in, sales reps, navbar de-dupe — design

**Date:** 2026-06-10
**Status:** Approved

Three changes to the Minott site (`minott-web/`):

1. Let portal customers sign in from the quote page so submitted quotes attach to their account history; show a personalized message when already signed in.
2. Add a "Sales Reps" tab to the admin and let admins assign a sales rep to each portal customer.
3. Remove the duplicate Contact entry from the desktop navbar.

## Context

The customer portal already exists (BetterAuth, `/portal`, quote/inquiry history at `/portal/history`), and `Inquiry.userId` already exists in the Prisma schema. But `/quote` never reads the session and `submitQuote` never sets `userId`, so quotes are never attached to accounts. Sales reps have no model or UI at all. The desktop navbar renders Contact twice: a plain text link in the middle nav (`LINKS`) and a red CTA `Button` on the right.

## 1. Quote page ↔ portal sign-in

### Quote page (`app/quote/page.tsx`)

The server component calls `getPortalSession()` (existing, `lib/portal.ts`) and passes either `null` or a plain object `{ name, email, companyName, phone }` to `QuotePageClient`.

### `QuotePageClient` (`components/quote/QuotePageClient.tsx`)

- **Signed out:** a small banner above the contact form — "Have a portal account? **Sign in** to attach this quote to your history." — linking to `/portal/sign-in?next=/quote`. Submission works exactly as today (anonymous inquiry, lands in `/admin/requests`).
- **Signed in:** the banner instead reads "Signed in as **{name}** — this quote will be saved to your account history." The name/email/company/phone fields are prefilled from the account but remain editable (a colleague may be placing the order). The quote is attached to the account regardless of edits.
- **Success state:** when signed in, the confirmation panel adds a "View quote history" link to `/portal/history`.

### Sign-in redirect (`app/portal/sign-in/page.tsx`, `components/portal/SignInForm.tsx`)

- The sign-in page reads `searchParams.next` (async, Next 16) and passes it to `SignInForm` as an optional `next` prop.
- `next` is honored only if it is a same-site relative path (starts with a single `/`, not `//`); otherwise fall back to `/portal`.
- After successful sign-in: `router.push(next ?? "/portal"); router.refresh()`.

### Attachment (`lib/actions/inquiries.ts` → `submitQuote`)

`submitQuote` calls `getPortalSession()` server-side and sets `userId` from the session when present. The user ID is **never** read from form data. Scope is quote only — `submitContact` and `submitSample` are unchanged (YAGNI).

## 2. Sales reps

### Schema (`prisma/schema.prisma`, one migration)

```prisma
model SalesRep {
  id        Int      @id @default(autoincrement())
  name      String
  email     String?
  phone     String?
  active    Boolean  @default(true)
  clients   User[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

`User` gains `salesRep SalesRep? @relation(fields: [salesRepId], references: [id], onDelete: SetNull)` and `salesRepId Int?`.

### Admin tab (`/admin/sales-reps`)

- "Sales Reps" added to the admin sidebar `NAV` (`app/admin/(protected)/layout.tsx`).
- Page lists reps in a table: name, email, phone, # assigned clients, active state — following the existing admin table style (customers/categories pages).
- Add/edit via forms following the existing Categories pages' pattern; delete with a confirm (deleting un-assigns clients via `SetNull`). An inactive rep keeps existing assignments but is hidden from the assignment dropdown.
- Server Actions in `lib/actions/admin-sales-reps.ts` (create/update/delete), all gated by `requireAdmin()`.

### Assignment to customers

- `CustomerForm` (`components/admin/CustomerForm.tsx`, used by new + edit pages) gains a "Sales rep" `<select>` listing active reps plus "Unassigned". Edit page also includes the customer's currently assigned rep in the options even if that rep is now inactive.
- `createCustomer` / `updateCustomer` (`lib/actions/customers.ts`) persist `salesRepId` with a direct `db.user.update` after the BetterAuth call — BetterAuth's `additionalFields` doesn't manage relational FKs.
- `/admin/customers` list gains a "Sales rep" column.
- Admin-only: nothing about reps is shown in the customer portal.

## 3. Navbar de-dupe (`components/layout/Nav.tsx`)

The desktop middle nav filters out `/contact` alongside the existing `/` filter; the red Contact CTA button on the right stays. The mobile overlay is unchanged (it renders Contact once already).

## Error handling

- Quote submission with an expired/invalid session: `getPortalSession()` returns `null`, quote submits anonymously — no error surfaced.
- `next` param validation prevents open redirects (relative paths only).
- Sales-rep actions return `{ error }` state objects consistent with existing admin actions; empty name rejected.

## Verification

No automated test suite (per project convention). Verify with:

- `npx tsc --noEmit`, `npm run lint`, `npm run build` (all from `minott-web/`)
- Manual click-through:
  - Signed out: quote page shows sign-in banner → sign in via banner → lands back on `/quote` → submit → quote appears in `/portal/history` and `/admin/requests`.
  - Signed in: quote page greets by name, fields prefilled; success panel links to history.
  - Anonymous submit still lands in `/admin/requests` with no user attached.
  - Admin: create rep → assign to customer → rep shows in customers list; delete rep → customer becomes Unassigned.
  - Desktop nav shows Contact only once (red button); mobile menu unchanged.

## Out of scope

- Attaching `userId` to contact/sample inquiries.
- Showing the assigned rep in the customer portal.
- Sales-rep logins or per-rep admin permissions.
- Email/notification delivery (existing known gap).
