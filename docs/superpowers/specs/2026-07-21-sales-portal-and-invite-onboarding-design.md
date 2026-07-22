# Sales Rep Portal & Email-Based Account Onboarding — Design

**Date:** 2026-07-21
**Status:** Approved (brainstorming) — pending implementation plan

## Summary

Two related pieces of work:

1. **Account-creation revamp** — Replace admin-typed temporary passwords with an
   email-based onboarding flow. When an admin creates any portal account (a
   customer **or** a sales rep), the system emails that person a secure,
   token-gated "set your password" link. Only the holder of the emailed token can
   set the password. Built on better-auth's existing password-reset
   infrastructure (Approach A).

2. **Sales rep portal at `/sales`** — Give sales reps real login accounts and a
   CRM-lite portal where they can view their assigned customers, view those
   customers' quote history, see a latest-quotes feed on the dashboard, update
   quote status, edit customer profiles, and add notes to quotes. **Quotes only**
   (sample/contact inquiries stay admin-only).

Both build directly on the existing better-auth customer portal (`/portal`) and
reuse its conventions (layout-gated auth, `role` discriminator, scoped read
modules, ownership-checked server actions, Resend + `Setting`-table email
config).

## Decisions (from brainstorming)

- **Rep capabilities:** Full CRM-lite — view + edit their customers' profiles,
  update quote status, add notes to quotes.
- **Rep accounts:** Every sales rep gets a `/sales` login. Creating a rep always
  provisions an account + sends an invite. `SalesRep.email` becomes required.
- **Inquiry visibility for reps:** Quotes only.
- **Password-set mechanism:** Approach A — reuse better-auth's built-in
  `requestPasswordReset` / `resetPassword` flow, branded as an activation/invite
  email. Global reset-token expiry set to **72h**.

## Context: what already exists

- **Two auth systems:** a shared-password admin gate (`mec_admin` HMAC cookie,
  `proxy.ts` matcher `/admin/:path*`) and a full **better-auth** customer portal
  at `/portal` (DB-backed email/password; public sign-up disabled via
  `disableSignUp: true`; provisioning via the `admin` plugin's headerless
  `auth.api.createUser`).
- **`User`** (better-auth, String id): has `role` (default `"customer"`),
  `salesRepId → SalesRep` (relation "ClientRep" = this customer's assigned rep),
  and B2B profile fields (`companyName`, `phone`, `whatsapp`).
- **`SalesRep`** (Int id): auth-less directory record (`name`, `email?`, `phone?`,
  `active`, `clients User[]`). Used only for email routing + customer assignment.
- **`Inquiry`** (Int id): unified quote/sample/contact model (`type`
  discriminator, `status`, denormalized contact snapshot, optional `userId →
  User`, `items InquiryItem[]`). No direct `Inquiry.salesRepId` — rep routing is
  indirect via `Inquiry.userId → User.salesRepId`.
- **Email:** Resend (`lib/email/resend.ts`, null when key unset), orchestrated in
  `lib/email/send-inquiry-emails.tsx` (best-effort, never throws). From-address /
  from-name / general inbox live in the `Setting` key/value table, edited at
  `/admin/settings`. React Email templates in `emails/` share `EmailLayout`.
- **Provisioning today** (`lib/actions/customers.ts`): `createCustomer` calls
  headerless `auth.api.createUser` with an admin-typed password, then sets
  `salesRepId` via Prisma.
- **Portal conventions:** reads in `lib/portal.ts` (all scoped by `userId`,
  ownership-checked), mutations in `lib/actions/portal.ts`, gate in
  `app/portal/(protected)/layout.tsx` via `getPortalSession()`. `PublicChrome`
  hides the public Nav/Footer under `/admin`.

## Data model changes

One Prisma migration.

### `SalesRep`
- Add `userId String? @unique` + relation `user User? @relation("RepAccount")` →
  the rep's better-auth login `User`.
- `email` becomes **required** (needed for the invite).
- `active` continues to gate portal access (checked in the `/sales` layout gate).

### `User`
- Rep logins get `role = "rep"`; customers stay `role = "customer"`.
- Add `activatedAt DateTime?` — `null` = "invite sent, password not yet set";
  stamped when the person completes set-password. Drives the admin
  "Pending / Active" badge and lets sign-in cleanly reject un-activated accounts.
  (We cannot infer this from `Account.password`, which is seeded with a random
  value at creation.)
- The two `User ↔ SalesRep` relations stay distinct and named:
  - `User.salesRepId → SalesRep` — relation `"ClientRep"` (a **customer's**
    assigned rep). Unchanged.
  - `SalesRep.userId → User` — relation `"RepAccount"` (a **rep's** login).

### `InquiryNote` (new)
- `id Int @id`, `inquiryId Int` → `Inquiry` (`onDelete: Cascade`),
  `body String`, `authorLabel String` (e.g. the rep's name), `createdAt
  DateTime @default(now())`.
- Written from the rep portal; surfaced read-only in `/admin/requests`.

### Migration notes
- Stamp `activatedAt = now()` for all **existing** users in the migration so they
  don't display as "Pending". Existing customers keep their current passwords.
- Making `SalesRep.email` required: existing rep rows with a null/blank email must
  be handled before the `NOT NULL` constraint applies. The migration backfills a
  placeholder (e.g. `rep-<id>@placeholder.invalid`) for any such rows; the admin
  then edits them to a real address and hits "Resend invite" to provision the
  login. (In practice this DB likely has no email-less reps, but the migration
  must not fail if it does.)
- Existing `SalesRep` rows have no linked login (`userId` null). They become
  directory-only until an admin opens the rep and re-saves/invites — acceptable,
  since portal access is provisioned going forward.

## Account creation & invite flow (the revamp)

### better-auth config (`lib/auth/portal.ts`)
- Add `emailAndPassword.sendResetPassword({ user, url })` → delegates to a new
  `sendInviteOrResetEmail(...)` that renders the branded invite template and
  sends via Resend (best-effort; never throws, mirroring `sendInquiryEmails`).
- Set `resetPasswordTokenExpiresIn` to **72h** (259200 seconds).
- Stamp `User.activatedAt` when a reset/set completes — via better-auth's
  `onPasswordReset` hook if available, else inside the set-password success path.

### Provisioning (`lib/auth/provision.ts` — new shared helper; refactor `lib/actions/customers.ts`)
1. `auth.api.createUser({ body: { email, name, password: <random>, role, data } })`
   — headerless admin escape hatch. No admin-typed password.
2. Reps: also create/link `SalesRep.userId` (create the `SalesRep` directory
   record and its login `User` together, linked).
3. Fire `auth.api.requestPasswordReset({ body: { email, redirectTo } })` where
   `redirectTo` carries a portal hint:
   `/set-password?portal=sales` (reps) or `/set-password?portal=customer`
   (customers). better-auth generates + appends the token and invokes
   `sendResetPassword`, sending the invite email.
4. If Resend is unconfigured, the account is still created; log a console warning
   and surface an admin-visible note ("email not sent — configure Resend"). No
   hard failure in dev.

### Set-password page (`app/set-password/page.tsx`)
- Public. Outside both `(protected)` route groups and **not** matched by
  `proxy.ts`.
- Reads `token` + `portal` from the query string. Renders a client form (new
  password + confirm, min 8). Calls `authClient.resetPassword({ newPassword,
  token })`.
- Invalid / expired / missing token → render better-auth's error as "This link is
  invalid or expired — ask your admin to resend." The token is the **entire**
  access gate; no session required.
- On success: stamp `activatedAt`, then route to the correct sign-in
  (`/sales/sign-in` or `/portal/sign-in`) based on `portal`.

### Resend invite
- `resendInvite(userId)` admin action — re-fires `requestPasswordReset`. Exposed
  as a button on both the customer and rep edit pages so an admin can re-send if
  the 72h link lapses. Admin-driven password *reset* of an existing user is the
  same mechanism.

## The `/sales` rep portal

Mirrors `/portal` conventions: layout-gated better-auth session, rep-scoped reads
in `lib/sales.ts`, mutations in `lib/actions/sales.ts` with ownership checks on
every write.

### Routing & gate (`app/sales/`)
- `app/sales/sign-in/page.tsx` — branded rep sign-in (`authClient.signIn.email`).
  After sign-in, if `role !== "rep"`, the rep is inactive, or the account is
  un-activated, sign out with a clear message. Includes the portal's
  `safeNextPath()` open-redirect guard on `?next=`.
- `app/sales/(protected)/layout.tsx` — `getSalesSession()`: `getPortalSession()`
  **plus** `role === "rep"` **plus** the linked `SalesRep.active`. Fail →
  redirect to `/sales/sign-in`.
- Cross-portal redirects: a signed-in **customer** hitting `/sales` → `/portal`;
  a **rep** hitting `/portal` → `/sales`.
- `proxy.ts` stays admin-only. `/sales` gates in-layout (portal precedent).

### Rep-scoped reads (`lib/sales.ts`)
Every query filtered to the rep's book of business:
`Inquiry where type = "QUOTE" and user.salesRepId = rep.salesRep.id`, and
customers where `salesRepId = rep.salesRep.id`.
- `getSalesRepForUser(userId)`, `getRepCustomers(repId)`,
  `getRepQuotes(repId, filters)`, `getRepQuoteById(repId, id)` (null if not the
  rep's), `getLatestRepQuotes(repId, take)`, plus count helpers for dashboard
  tiles.

### Pages
- **`/sales` (dashboard)** — summary tiles (my customers, open quotes, quotes this
  month) + a **Latest Quotes** feed (most recent QUOTE inquiries across their
  customers, newest first, each linking to detail).
- **`/sales/customers`** — their customers list.
- **`/sales/customers/[id]`** — edit profile (name, company, phone, whatsapp).
  **Not** email or rep-assignment (admin-only). Via `updateRepCustomer`
  (ownership-checked).
- **`/sales/quotes`** — full quote history with the portal's history filters
  (date range, status).
- **`/sales/quotes/[id]`** — line items, customer info, a **status selector**
  (`updateRepQuoteStatus`), and an **add-note** form (`addQuoteNote`) showing the
  `InquiryNote` thread.
- Chrome: extend `PublicChrome` to also hide the public Nav/Footer under `/sales`
  (currently `/admin` only), with a light rep-portal header/nav.

### Mutations (`lib/actions/sales.ts`)
`updateRepCustomer`, `updateRepQuoteStatus`, `addQuoteNote`. **Every** mutation
re-derives the rep from the session and verifies the target customer/inquiry has
`salesRepId === rep.salesRep.id` before writing — never trusting an id from the
form. Mirrors the portal's ownership checks.

## Admin changes

- **`CustomerForm`** — remove temp/new-password fields on **create** (password is
  now user-set via invite). On the **edit** page: a **"Resend invite"** button and
  a **Pending/Active** badge (from `activatedAt`). Admin keeps editing profile +
  rep assignment.
- **`SalesRepForm`** — `email` now required; creating a rep provisions the linked
  `User` (`role="rep"`) + sends the invite. Edit page gets the same **Resend
  invite** button + **Pending/Active** badge. Deactivating a rep (`active=false`)
  blocks `/sales` sign-in via the layout gate.
- **`/admin/requests`** — surface the read-only `InquiryNote` thread on quote rows
  so admins see what reps have logged.

## Email template

One new React Email template `emails/account-invite.tsx` (reuses `EmailLayout`,
branded MEC), copy adapts by portal:
- Heading: "Activate your Minott account" (customer) / "Set up your sales portal
  access" (rep).
- A prominent set-password button (the tokened link).
- "This link expires in 72 hours — ask your admin to resend if it lapses."
- Subject differs for customer vs. rep.

## Env / config

No new env vars. Invites reuse `RESEND_API_KEY` + the existing `Setting` rows
(`fromEmail`, `fromName`). If Resend is unset, provisioning still succeeds and
logs a warning, consistent with `sendInquiryEmails`.

## Security & edge cases

- The set-password token is the sole access gate for setting a password; invalid/
  expired/missing tokens are rejected by better-auth.
- Every rep read and mutation is scoped/ownership-checked to the rep's own book of
  business — a rep can never see or touch another rep's customers or quotes.
- Un-activated accounts (`activatedAt == null`) cannot sign in.
- Inactive reps (`SalesRep.active == false`) are blocked at the `/sales` layout
  gate even with a valid session.
- Cross-role access is redirected (customer → `/portal`, rep → `/sales`).
- Provisioning is resilient to Resend being unconfigured (dev-friendly).

## Verification

No automated test suite (per project norms). Gate on:
- `npx tsc --noEmit`, `npm run lint`, `npm run build` — all clean.
- Manual click-through:
  - Create a customer → invite email arrives → set-password link works → garbage/
    expired token rejected → customer signs into `/portal`.
  - Create a rep → invite → rep signs into `/sales`, sees only their customers'
    quotes, updates a status, adds a note, edits a customer profile.
  - A rep cannot see another rep's customers (ownership check).
  - A customer cannot reach `/sales` (redirected to `/portal`).
  - "Resend invite" re-sends a working link; deactivating a rep blocks sign-in.

## Out of scope

- Rep-facing "forgot password" self-service UI (the mechanism exists for free via
  the same flow, but no dedicated page in this pass).
- Reps creating/assigning customers or reassigning reps (admin-only).
- Reps acting on sample/contact inquiries.
- Admin bulk invites / CSV import.
