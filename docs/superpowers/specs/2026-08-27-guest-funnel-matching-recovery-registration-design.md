# Guest Quote Funnel: Customer Matching, Account Recovery, New-Customer Registration & AR Approval — Design

**Date:** 2026-08-27
**Plane tickets closed:** MEC-2, MEC-3, MEC-4, MEC-5, MEC-7, and the industry-taxonomy half of MEC-1
**SOP reference:** `MEC Website Usage Instructions.docx` sections C.1, D, E.1, E.3, F
**Status:** approved design, ready for implementation planning

## 1. Goal

Turn the guest quote submission into the SOP's three-status funnel:

| Status | SOP name | Outcome |
|---|---|---|
| `VERIFIED` | Existing Customer – Verified | Quote attached to the company; routed to its sales rep |
| `POTENTIAL_MATCH` | Potential Existing Customer – Verification Required | Guest told an account *may* exist; offered sign-in or MEC-account-number recovery; no existing data exposed |
| `NO_MATCH` | New Customer – No Match | Guest directed to a prefilled New Customer Form; application reviewed by Accounts Receivable (AR); approval creates the company + invites the contact; the original quote stays linked throughout |

Also adds customer self-service **forgot password** (all roles) and the new **`ar` portal role**.

## 2. Decisions made during brainstorming

1. **Matching runs against portal records only** (`Company.name`, customer `User.email`/`phone`/`whatsapp`). No customer-directory import in this batch (follow-up).
2. **MEC-account-number verification only sends a reset link** to the email(s) already on file. No self-join of new contacts to an existing company. A contact whose email isn't on file is told to contact their rep.
3. **New Customer Form creates a `CustomerApplication`**, not a `Company`. Nothing touches `Company`/`User` until approval.
4. **AR role** (`User.role = "ar"`), created by admins at `/portal/admins`. AR (and admins) approve / reject / request more info. Approval *directly* creates the company and emails the set-password invite (the SOP's separate "admin activates" step is collapsed into approval).
5. **Sales rep chosen manually at approval** (optional dropdown). Industry-based auto-routing is MEC-6, later.
6. **Industry taxonomy** lives in `lib/industries.ts` (single array; swap for the client's official list later).
7. **Save first, classify at submit, branch on the outcome** (Approach 1). The quote is always persisted before any classification UX.

## 3. Data model (`prisma/schema.prisma`)

### `Inquiry` — new columns
```prisma
industry         String?   // guest quotes only; validated against lib/industries.ts
location         String?   // guest quotes only
ref              String?   @unique // opaque token; guest QUOTE rows only
matchStatus      String?   // "VERIFIED" | "POTENTIAL_MATCH" | "NO_MATCH"; null for CONTACT/SAMPLE + legacy rows
matchedCompany   Company?  @relation("InquiryMatchHint", fields: [matchedCompanyId], references: [id], onDelete: SetNull)
matchedCompanyId Int?      // admin-only hint; NEVER rendered to guests
application      CustomerApplication?
```
`ref` = 24 random bytes, base64url (32 chars). Minted only for guest quotes.

### `CustomerApplication` — new model
```prisma
model CustomerApplication {
  id              Int       @id @default(autoincrement())
  inquiry         Inquiry   @relation(fields: [inquiryId], references: [id], onDelete: Cascade)
  inquiryId       Int       @unique
  companyName     String
  industry        String
  location        String
  contactName     String
  email           String
  phone           String
  notes           String?
  status          String    @default("SUBMITTED") // "SUBMITTED" | "INFO_REQUESTED" | "APPROVED" | "REJECTED"
  decisionNote    String?   // reason (REJECTED) or request (INFO_REQUESTED)
  decidedAt       DateTime?
  decidedBy       User?     @relation("ApplicationDecider", fields: [decidedByUserId], references: [id], onDelete: SetNull)
  decidedByUserId String?
  company         Company?  @relation(fields: [companyId], references: [id], onDelete: SetNull) // created on approval
  companyId       Int?
  user            User?     @relation("ApplicationContact", fields: [userId], references: [id], onDelete: SetNull) // provisioned on approval
  userId          String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([status])
}
```

### Other
- `Company.mecAccountNumber` is **normalised on write** (trim, uppercase, strip spaces and dashes). The migration normalises existing values with a hand-added `UPDATE` (SQLite: `UPPER(REPLACE(REPLACE(TRIM(x),' ',''),'-',''))`).
- `User.role` gains the value `"ar"`. No schema change (string column).
- `lib/industries.ts`: `INDUSTRIES` (15 entries, below) + `isIndustry(v): v is Industry`.

```
Hospitality & Tourism · Healthcare & Medical · Manufacturing & Industrial · Food & Beverage ·
Financial Services · Telecoms · Entertainment & Events · Retail · Education ·
Government & Public Sector · Property & Facilities Management · Janitorial & Cleaning Services ·
Distribution & Wholesale · Personal / Individual · Other
```
`Company.industry` remains a plain string. `CompanyForm` (admin + rep) becomes a `<select>` over `INDUSTRIES`; if the stored value is not in the list it is appended as an extra option so legacy data displays and re-saves unchanged until an admin picks a real entry.

## 4. Matching engine — `lib/customer-match.ts` (server-only)

```ts
export type MatchStatus = "VERIFIED" | "POTENTIAL_MATCH" | "NO_MATCH";
export type MatchResult = { status: Exclude<MatchStatus, "VERIFIED">; matchedCompanyId: number | null };
export async function matchGuest(input: { email: string; phone: string; company: string }): Promise<MatchResult>;
export function normalizeEmail(s: string): string;      // trim + lowercase
export function normalizePhone(s: string): string;      // digits only
export function phoneKey(s: string): string | null;     // last 7 digits, null if < 7 digits
export function normalizeCompanyName(s: string): string;// lowercase, strip punctuation, collapse whitespace,
                                                        // drop trailing tokens: ltd, limited, co, company, inc, jamaica
export function normalizeAccountNumber(s: string): string; // trim, uppercase, strip spaces + dashes
```

Rules, evaluated in order; the first hit sets `matchedCompanyId`, any hit → `POTENTIAL_MATCH`:
1. `normalizeEmail(email)` equals a `User.email` where `role = "customer"` (single Prisma query; emails are stored lowercase by better-auth). Hint = that user's `companyId`.
2. `phoneKey(phone)` (only when non-null) equals `phoneKey(User.phone)` or `phoneKey(User.whatsapp)` of any customer user — one query for `{ id, companyId, phone, whatsapp }` of customer users with a non-null phone/whatsapp, compared in JS. Hint = that user's `companyId`.
3. `normalizeCompanyName(company)` (only when non-empty) equals `normalizeCompanyName(Company.name)` for any company — one query for `{ id, name }`, compared in JS. Hint = `company.id`.

No hits → `{ status: "NO_MATCH", matchedCompanyId: null }`.

Signed-in submitters never run the matcher: `matchStatus = "VERIFIED"`, `companyId` from session scope (existing behaviour). A signed-in customer with no company is also `VERIFIED` (known account, nothing to match against).

If the matcher throws, `submitQuote` logs and proceeds as `NO_MATCH` — losing the quote is the worst outcome.

## 5. Quote submission changes — `lib/actions/inquiries.ts`

`submitQuote` result type becomes:
```ts
export type QuoteResult =
  | { ok: false; error?: string }
  | { ok: true; outcome: MatchStatus; ref?: string }; // ref only for guest submissions
```
Guest (no session) requirements: `industry` (must pass `isIndustry`) and `location` are **required**; error strings: "Please choose your industry." / "Location is required." Signed-in submissions ignore both fields.

Guest flow: mint `ref` → run `matchGuest` → `db.inquiry.create` with `industry`, `location`, `ref`, `matchStatus`, `matchedCompanyId` → `after(sendInquiryEmails)` → return `{ ok: true, outcome, ref }`.

`sendInquiryEmails` / `emails/inquiry-notification.tsx`: for guest quotes, add a classification line to the **internal** email — "Potential existing customer — unverified (verification required before linking)" or "New customer — New Customer Form pending". Both route to the **general inbox** (never to the hinted company's rep — nothing is verified). Verified quotes route as today. The customer confirmation email is unchanged except for `NO_MATCH`, which adds a "Complete your New Customer Form" link (`/register?ref=…`).

## 6. Guest UX — `components/quote/QuotePageClient.tsx`, `app/quote/page.tsx`

- Guests see two new required fields after Phone: **Industry** (`<select>` over `INDUSTRIES`, placeholder "Select your industry") and **Location** (text, e.g. "Kingston"). Not rendered for signed-in users.
- Post-submit panel branches on `outcome`:
  - `VERIFIED` → existing "Quote request sent." panel.
  - `POTENTIAL_MATCH` → heading "Quote request received." Body: *"Our records suggest an MEC account may already be associated with the details you provided. Sign in to attach this quote to your account, or recover access using the MEC account number shown on your invoices."* Buttons: **Sign in** → `/portal/sign-in?next=/portal`; **Recover account** → `/portal/recover?ref=<ref>`.
  - `NO_MATCH` → heading "Quote request received." Body: *"To open an MEC account, complete the short New Customer Form — we've prefilled it from your request."* Button: **Complete New Customer Form** → `/register?ref=<ref>`.
- Cart clears on any `ok: true` (existing effect).

Nothing about an existing company (name, rep, account number) is ever sent to the client.

## 7. Password reset & account recovery (MEC-4)

### `/portal/forgot-password` (new page, all roles)
- Linked from the sign-in card ("Forgot your password?").
- Form: email. Server action `requestPasswordResetEmail` (in `lib/actions/portal.ts`): per-IP rate limit (see §11) → `auth.api.requestPasswordReset({ body: { email, redirectTo: "/set-password?portal=<by role>&mode=reset" } })` wrapped in try/catch; **always** returns the same success state. `portal` is looked up from the user's role server-side (customer/sales/admin; `ar` → admin); unknown emails default to `customer`.
- `send-account-invite.tsx` already switches invite vs reset copy on `activatedAt`; `emails/account-invite.tsx` gets explicit reset copy (heading "Reset your password", 72-hour validity note).
- `/set-password` reads `mode=reset` → heading "Reset your password", body "Choose a new password for your account."

### `/portal/recover` (new page)
- Form: **Company name**, **MEC account number**, hidden `ref` (from query, optional).
- Server action `recoverAccount` (`lib/actions/recover.ts`):
  1. Per-IP rate limit, bucket `recover`, 5 attempts / 15 min → generic "Too many attempts, try again later."
  2. `company = db.company.findUnique({ where: { mecAccountNumber: normalizeAccountNumber(input) } })`.
  3. Require `normalizeCompanyName(inputName) === normalizeCompanyName(company.name)`.
  4. On success: for each active (`banned != true`) customer user of the company (max 10, oldest first) call `sendInvite(email, "/set-password?portal=customer&mode=reset")` (existing helper). If `ref` resolves to a QUOTE inquiry with `companyId = null`, set `companyId = company.id`, `matchStatus = "VERIFIED"`, clear `matchedCompanyId`, and `after(sendInquiryEmails(id, { verifiedNow: true }))` so the assigned rep now gets the notification (the earlier general-inbox mail already went; the second is the rep hand-off, subject prefixed "Verified: ").
  5. On miss or hit, return the identical message: *"If your details matched an MEC account, password instructions have been sent to the email address on file."* Misses are `console.warn`ed with the IP and normalised account number for admin visibility.

### Not automatic
A `POTENTIAL_MATCH` guest who simply signs in does **not** get the quote auto-attached (we cannot prove ownership). Manual "attach quote to company" in the inbox is a follow-up.

## 8. New Customer Form — `/register` (MEC-5)

`app/register/page.tsx` (public; shares `PublicChrome`). `searchParams.ref` resolves to:
- a QUOTE inquiry with `matchStatus = "NO_MATCH"` and **no** application → blank application prefilled from the inquiry (`company → companyName`, `industry`, `location`, `name → contactName`, `email`, `phone`);
- an inquiry whose application is `INFO_REQUESTED` → edit form prefilled from the application, with the AR note shown at top;
- an inquiry whose application is `SUBMITTED` / `APPROVED` / `REJECTED` → status page ("Your application is under review" / "approved — check your email" / "not approved");
- anything else (missing, unknown, non-`NO_MATCH`) → "This link isn't valid" page with a link to `/quote`.

Form fields: Company name*, Industry* (select), Location*, Contact name*, Email*, Phone*, Notes. Beneath: read-only list of the quote's line items ("Quote request #<id> · <n> items — stays attached to this application").

Server action `submitApplication` (`lib/actions/applications.ts`): validates `ref` + state as above, validates fields (`isIndustry`, email shape), `upsert`s the `CustomerApplication` (create, or update on `INFO_REQUESTED` → back to `SUBMITTED`, `decisionNote` cleared). Then `after()`:
- `emails/application-received.tsx` → applicant;
- `emails/application-notification.tsx` → general inbox + every active `ar` user (`to` list; dedupe).

Client component `components/register/ApplicationForm.tsx` (`useActionState`), success panel: "Application submitted — Accounts Receivable will respond within one business day."

## 9. AR role + approval workflow (MEC-7)

### Role plumbing
- `provisionUser` accepts `role: "ar"`; `INVITE_REDIRECT.ar = "/set-password?portal=admin"`; `send-account-invite` maps `ar` → `admin` portal copy, subject "Set up your MEC accounts access".
- `/portal/admins`: create form gains a **Role** select (Administrator / Accounts Receivable); list shows a role pill; deactivate/resend work for both. The "last active admin" guard counts only `role = "admin"`. Action file `lib/actions/admins.ts` extends `createAdmin` with the role.
- `(protected)/layout.tsx` `NAV_BY_ROLE.ar = [Dashboard, Applications]`.
- `lib/portal.ts`: `requireRoleSession(roles: string[])` — redirects to `/portal` when the session role isn't listed (generalises `requireAdminSession`). Server-action guard `requireRole(roles)` added next to `requireAdmin` in `lib/auth/require-admin.ts`.
- AR dashboard (`app/portal/(protected)/page.tsx` branch): counts of Submitted / Info requested / Decided this month + link to the queue. Existing customer/rep/admin dashboards untouched.
- AR is redirected away from every other protected page by the existing per-page gates (they all check for a specific role already; verify each admin page uses `requireAdminSession`, not just "not customer").
- `prisma/seed.ts`: adds `ar@example.com` / `test123` (role `ar`, activated) for local use, idempotent like the admin seed.

### `/portal/applications` (admin + ar)
- List: three groups — **Submitted** (oldest first), **Info requested**, **Decided** (newest first, last 50). Row: company, contact, industry, submitted date, quote item count, status pill.
- `/portal/applications/[id]`: full application, linked quote (items + notes), "Matcher hint" block — re-runs `matchGuest` against the application's current email/phone/company so a record created *since* submission is surfaced (e.g. "An account with this email now exists") — and the three actions below. Decided applications show the decision, note, decider and time; actions hidden.

Actions (`lib/actions/applications.ts`, all guarded by `requireRole(["admin","ar"])`, all no-op with an error if the application is already decided):

- **`approveApplication`** — form: `salesRepId` (optional select of active reps, "Unassigned" default).
  1. Re-check contact email: if a `User` with that email exists → `{ error: "An account with this email already exists — link it from Customers instead." }`, nothing written.
  2. `db.company.create` (name/industry/location/salesRepId; `mecAccountNumber` null — admin fills it in later on `/portal/customers/[id]`).
  3. `provisionUser({ role: "customer", redirectTo: INVITE_REDIRECT.customer, skipInvite: true })` — new `skipInvite` option creates the user without emailing yet. On failure delete the company and return the error.
  4. `db.user.update` → `companyId`; `db.inquiry.update` → `companyId`, `userId`, `matchStatus = "VERIFIED"`, `matchedCompanyId = null`; `db.customerApplication.update` → `APPROVED`, `companyId`, `userId`, `decidedAt`, `decidedByUserId`.
  5. `sendInvite(email, INVITE_REDIRECT.customer)` — now that the application row carries `userId` + `APPROVED`. better-auth's `sendResetPassword` hook only receives `user` + `url`, so `sendAccountInvite` looks up `db.customerApplication.findFirst({ where: { userId: user.id, status: "APPROVED" } })` and, when found and the user is not yet activated, uses the approved copy in `emails/account-invite.tsx` ("Your MEC account application has been approved. Set your password to activate your account.", subject "Your MEC account has been approved").
  6. `after(sendInquiryEmails(inquiryId, { verifiedNow: true }))` notifies the assigned rep (or general inbox if unassigned).
  7. `revalidatePath` for applications, requests, customers; redirect to the application page.
- **`requestApplicationInfo`** — required `note` → status `INFO_REQUESTED`, `decisionNote = note` (no `decidedAt`). `after()`: `emails/application-info-requested.tsx` → applicant, with the note and the `/register?ref=…` link.
- **`rejectApplication`** — required `reason` → `REJECTED`, `decisionNote`, `decidedAt`, `decidedByUserId`. `after()`: `emails/application-rejected.tsx` → applicant (reason included); short internal note → general inbox.

### `/portal/requests` (existing admin inbox)
Guest QUOTE rows show a status pill — Verified / Potential match / New customer. Admin-only extras on the row: "Possible match: <Company name>" (from `matchedCompanyId`) and, when an application exists, "Application: <status> →" linking to `/portal/applications/[id]`. Reps never see the hint (they only see verified quotes for their own companies today — unchanged).

## 10. Emails (all `emails/*.tsx`, sent best-effort via Resend from `lib/email/`)

| Template | To | Trigger |
|---|---|---|
| `inquiry-notification` (+ classification line) | general inbox / assigned rep | quote submit; re-sent with "Verified:" prefix on recovery/approval |
| `inquiry-confirmation` (+ register link on `NO_MATCH`) | customer | quote submit |
| `account-invite` (+ reset copy; + approved copy) | user | forgot-password, recover, approval |
| `application-received` | applicant | form submit / resubmit |
| `application-notification` | general inbox + active `ar` users | form submit / resubmit |
| `application-info-requested` | applicant | AR requests info |
| `application-rejected` | applicant (+ general inbox note) | AR rejects |

All follow the existing pattern: pre-render with `@react-email/components` `render`, `from`/`replyTo` from `lib/settings.ts`, skipped with a `console.warn` when `RESEND_API_KEY` or `fromEmail` is unset. Sending happens in `after()` and never fails the Server Action.

## 11. Security & controls

- **No leakage:** guests only ever receive their own submitted data (via `ref`). Forgot-password, recover, and the application status page return constant responses regardless of hit/miss. `matchedCompanyId` and the matcher hint render only for `role = "admin"` / `"ar"`.
- **`ref` token:** 32-char base64url from `randomBytes(24)`; unique index; only resolves guest quotes; never accepted for signed-in inquiries.
- **Rate limiting:** extend `lib/rate-limit.ts` with `checkRateLimit(key, { max, windowMs })` (key = `${bucket}:${ip}`); IP read from `headers()` (`x-forwarded-for` first value / `x-real-ip` / "unknown"). Buckets: `forgot` 5 / 15 min, `recover` 5 / 15 min, `apply` 10 / 15 min. Existing API-route limiter keeps its defaults.
- **Role separation:** AR cannot reach catalog/customers/reps/settings; reps cannot reach applications; every new Server Action re-checks the session itself.
- **Approval atomicity:** ordered writes with compensating delete of the company if user provisioning fails; email sends are outside the write path.
- Account approval is *not* credit approval — no credit fields anywhere (SOP §4).

## 12. Verification (no automated test suite)

1. `npx tsc --noEmit`, `npm run lint`, `npm run build` clean.
2. Migration: `sqlite3 prisma/app.db` — `Company.mecAccountNumber` values normalised, row counts unchanged, `CustomerApplication` table exists.
3. Click-through (dev server, `RESEND_API_KEY` unset so emails log to console):
   - guest quote with a fresh email/phone/company → `NO_MATCH` panel → `/register?ref` prefilled → submit → appears in `/portal/applications` (as `ar@example.com` and as admin) → **Request info** → `/register?ref` shows note, resubmit → **Approve** with a rep → company appears in `/portal/customers`, invite logged, quote in `/portal/requests` shows Verified and the rep sees it in `/portal/quotes`; a second application → **Reject** → reason logged.
   - guest quote using the seeded customer's email → `POTENTIAL_MATCH` panel; `/portal/recover` with wrong number and right number → identical message; right number stamps the quote (`companyId` set, Verified pill).
   - signed-in customer quote → unchanged flow, no industry/location fields.
   - `/portal/forgot-password` for a customer, a rep and an admin → reset link logged → `/set-password?mode=reset` works and signs in.
   - 6th rapid attempt on recover/forgot → rate-limit message.
   - AR user: nav shows Dashboard + Applications only; direct URL to `/portal/products` redirects to `/portal`.

## 13. Out of scope (follow-ups)

- Industry → sales-rep auto-assignment and inquiry-level rep assignment (MEC-6).
- Manual "attach this quote to a company" from `/portal/requests`.
- SOP-wide status model across account + quote lifecycles (MEC-8); this design adds only `Inquiry.matchStatus` and `CustomerApplication.status`.
- Customer-directory CSV import so the matcher covers non-portal MEC customers.
- Self-join of new contacts at an existing company via account number (rejected in brainstorming; contacts go through their rep/admin).
- J$20,000 minimum / J$50,000 delivery gates (MEC-11/12, blocked on pricing).
- General Sales unassigned queue (MEC-9), WhatsApp changes (MEC-10).
