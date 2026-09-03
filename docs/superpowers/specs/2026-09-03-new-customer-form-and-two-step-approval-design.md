# New Customer Form update + two-step approval (AR approve → admin creates account)

**Date:** 2026-09-03
**Status:** Approved design, awaiting implementation plan
**Source:** MEC "NEW CUSTOMER FORM – UPDATED" (Word doc, March 2024)

## 1. Goal

1. Bring the public New Customer Form (`/register`) in line with MEC's paper form, minus the
   internal fields (Account No., Credit Terms, Credit Limit, Rep No., GCT Status).
2. Split approval into two steps. Accounts Receivable (AR) approves the application; an admin
   then creates the company account, fills in the internal fields (account number, credit terms,
   credit limit, GCT status, sector, sales rep) and sends the invite. AR approval no longer
   creates anything.
3. Store the full customer data on the `Company` so admins can see and edit it on the company
   page, for companies created from an application and for companies created manually.

Out of scope: changes to the integration API, rep-side company editing, CSV import, PDF export of
the form.

## 2. Field mapping from the paper form

| Paper form field | Who fills it | Where it lives |
|---|---|---|
| Business Name | Customer | `companyName` / `Company.name` |
| Type of Business | Customer | `businessType` (free text) |
| In Business Since | Customer | `inBusinessSince` (free text, e.g. "2008") |
| Tax Registration Number (TRN) | Customer | `trn` |
| Tax Exception Number | Customer, optional | `taxExemptionNumber` |
| Billing Address: Street / City / Parish / Zip | Customer | `billingStreet`, `billingCity`, `billingParish`, `billingZip` |
| Shipping Address: Street / City / Parish / Zip | Customer, optional ("same as billing") | `shippingStreet`, `shippingCity`, `shippingParish`, `shippingZip` |
| Principal Name / Title / Email / Tel | Customer | `contactName`, `principalTitle`, `email`, `phone` (application); the principal becomes the first portal `User` |
| Accounting Person Name / Tel / Email | Customer, optional | `accountingName`, `accountingPhone`, `accountingEmail` (reference only, no login) |
| Industry | Customer (existing dropdown, `lib/industries.ts`) | `industry` |
| Sector | Admin only | `Company.sector` (free text) |
| Type of Business/Organisation (internal block) | Collapsed into the customer's Type of Business | — |
| Account No. Assigned | Admin only | `Company.mecAccountNumber` (existing) |
| Credit Terms assigned | Admin only | `Company.creditTerms` (dropdown) |
| Credit Limit Assigned | Admin only | `Company.creditLimit` (JMD, default 0) |
| Rep. No. | Admin only | `Company.salesRepId` (existing) |
| GCT Status | Admin only | `Company.gctStatus` (dropdown) |
| Prepared By | — | The applicant's own submission (`createdAt`) |
| Approved By | AR/admin | `decidedBy` + `decidedAt` (existing) |
| Customer Account Created By | Admin | `accountCreatedBy` + `accountCreatedAt` (new) |

Constants (in `lib/constants.ts`):

- `PARISHES`: Kingston, St. Andrew, St. Thomas, Portland, St. Mary, St. Ann, Trelawny, St. James,
  Hanover, Westmoreland, St. Elizabeth, Manchester, Clarendon, St. Catherine.
- `CREDIT_TERMS`: `Cash/COD`, `Net 7`, `Net 14`, `Net 30`, `Net 45`, `Net 60`.
- `GCT_STATUSES`: `Registered`, `Exempt`, `Not registered`.

## 3. Data model

### 3.1 `CustomerApplication` (additive; all new columns nullable)

```
businessType         String?
inBusinessSince      String?
trn                  String?
taxExemptionNumber   String?
billingStreet        String?
billingCity          String?
billingParish        String?
billingZip           String?
shippingStreet       String?
shippingCity         String?
shippingParish       String?
shippingZip          String?
principalTitle       String?
accountingName       String?
accountingPhone      String?
accountingEmail      String?
accountCreatedAt     DateTime?
accountCreatedBy     User?    @relation("ApplicationAccountCreator", ...) onDelete: SetNull
accountCreatedByUserId String?
```

`location` stays (required today) and is set server-side to `"<billingCity>, <billingParish>"`
on submit, so the applications list, the guest-match hint, the internal notification email and
`matchGuest` keep working unchanged.

Required-ness for new submissions is enforced in `submitApplication`, not in the schema, because
existing rows predate these columns.

Status values (`APPLICATION_STATUS`): add `ACCOUNT_CREATED` with label "Account created".

```
SUBMITTED ──► INFO_REQUESTED ──► SUBMITTED (resubmit)
SUBMITTED / INFO_REQUESTED ──► APPROVED   (AR or admin)   ──► ACCOUNT_CREATED (admin)
SUBMITTED / INFO_REQUESTED ──► REJECTED   (AR or admin)
```

`APPROVED` now means "approved, awaiting account setup". `companyId` / `userId` are populated
only on `ACCOUNT_CREATED`.

### 3.2 `Company` (additive; all nullable)

```
businessType         String?
inBusinessSince      String?
trn                  String?
taxExemptionNumber   String?
billingStreet, billingCity, billingParish, billingZip       String?
shippingStreet, shippingCity, shippingParish, shippingZip   String?
accountingName       String?
accountingPhone      String?
accountingEmail      String?
sector               String?
creditTerms          String?
creditLimit          Decimal?   // JMD; form default 0
gctStatus            String?
```

`location` is kept as-is (still shown and editable; reps can still edit it via `lib/actions/sales.ts`).
No uniqueness on `trn` (the paper process does not enforce it; a duplicate-TRN warning is not in scope).

### 3.3 Migration

One Prisma migration, additive columns only, plus a data fix so already-approved applications do
not appear in the new "awaiting account setup" queue:

```sql
UPDATE "CustomerApplication"
SET status = 'ACCOUNT_CREATED', accountCreatedAt = decidedAt, accountCreatedByUserId = decidedByUserId
WHERE status = 'APPROVED' AND companyId IS NOT NULL;
```

## 4. Public form (`/register`, `components/register/ApplicationForm.tsx`)

Sections in paper-form order. `*` = required (server-validated in `submitApplication`; HTML
`required` mirrors it).

1. **Business** — Business name\*, Industry\* (dropdown), Type of business\*, In business since,
   TRN\*, Tax exemption number.
2. **Billing address** — Street\*, City\*, Parish\* (dropdown), Zip code.
3. **Shipping address** — "Same as billing address" checkbox, checked by default; when unchecked
   the four shipping fields appear (Street, City, Parish dropdown, Zip; all optional). When
   checked the server stores `null` for all four shipping columns (the admin view renders "Same
   as billing").
4. **Principal contact** — Name\*, Title, Email\*, Tel\*.
5. **Accounting contact** — Name, Tel, Email (all optional; email validated if present).
6. **Notes** (optional, existing).

Prefill from the quote (`inquiry.company` → business name, `industry`, `name`/`email`/`phone` →
principal) is unchanged; `inquiry.location` is no longer used for prefill (there is no single
"location" field any more). On resubmit after "info requested", every field is prefilled from the
existing application row, including the shipping checkbox state.

Validation messages follow the current style ("Company name is required.", etc.). TRN is
trimmed but not format-validated (MEC accepts both 9-digit personal and company TRNs; leave free).

Post-submit copy and the "under review" status page are unchanged. The `APPROVED` status copy
changes to: "Your application has been approved. We're setting up your account and will email
you your login details shortly." `ACCOUNT_CREATED` shows the existing "check your email for the
link to set your password" copy.

## 5. AR step (`/portal/applications`, roles `admin` + `ar`)

- **Approve** (`approveApplication`) no longer takes a sales rep and no longer creates anything.
  It is a status-guarded update `SUBMITTED | INFO_REQUESTED → APPROVED` stamping `decidedAt` /
  `decidedByUserId`, `decisionNote = null`. The inquiry is untouched.
- No email to the applicant. An internal "Application approved — ready for account setup" email
  (`emails/application-approved-internal.tsx`, new `kind: "approved"` in
  `sendApplicationEmails`) goes to the general inbox plus every non-banned `admin` user, with a
  link to `/portal/customers/new?application=<id>`.
- **Request info** and **Reject** are unchanged. `loadOpenApplication` treats `APPROVED` as
  decided (so AR cannot request info or reject after approving; an admin who needs to back out
  uses the existing "decided" path — reversing an approval is out of scope).
- `ApplicationDecisionForms` drops the rep `<select>`; the Approve card copy becomes "Marks the
  application approved. An admin then creates the account and sends the invite."
- The applications list gets a fourth group between "Info requested" and "Decided":
  **"Approved — awaiting account setup"** (status `APPROVED`). Admins see a "Create account"
  link per row; AR sees the rows without the link. "Decided" now holds `ACCOUNT_CREATED` and
  `REJECTED`, sorted by `accountCreatedAt ?? decidedAt`.
- The AR dashboard (`ArDashboard.tsx`) cards become: Awaiting review, Info requested,
  Awaiting account setup, Decided (30 days, `ACCOUNT_CREATED` + `REJECTED`).
- The admin dashboard (`AdminDashboard.tsx`) adds a fourth card to its existing card row:
  "Accounts to set up" (count of `APPROVED` applications) linking to `/portal/applications`.
  The grid becomes `sm:grid-cols-2 lg:grid-cols-4`.
- Application detail page: every submitted field is displayed (Business, Billing, Shipping or
  "Same as billing", Principal, Accounting contact, Notes). When `APPROVED`, admins see a
  prominent "Create account" button → `/portal/customers/new?application=<id>`; AR sees
  "Approved · awaiting account setup by an admin". When `ACCOUNT_CREATED`, the Decision box shows
  both lines: "Approved · date · by X" and "Account created · date · by Y", plus the company link.

## 6. Admin step: create the account (`/portal/customers/new?application=<id>`)

`app/portal/(protected)/customers/new/page.tsx` (admin only, as today) reads the optional
`application` search param. If present it loads the application; it must exist and be `APPROVED`
with `companyId == null`, otherwise the page renders a short "This application is not awaiting
account setup" notice with a link back. Otherwise it renders `CompanyForm` prefilled:

- Every customer field copied from the application (name, industry, business type, in business
  since, TRN, tax exemption #, billing + shipping addresses, accounting contact) and `location`
  from the application.
- The "First portal user" fieldset prefilled with the principal (name, email, phone) and marked
  required in this mode (the invite is the point of the step). The email field is read-only here
  to keep the application ↔ user link honest; admins who need a different login email add a user
  from the company page afterwards.
- Admin-only fields left for the admin: MEC account number, credit terms, credit limit (default
  0), GCT status, sector, sales rep. None are hard-required (matches today's `Company`), but the
  account number input is autofocused and the intro copy says to fill it in.
- A hidden `applicationId` input and a banner "Creating the account for application #N
  (Company) — the principal will be invited when you save."

`createCompany` (`lib/actions/companies.ts`) gains an `applicationId` branch. When present:

1. `requireAdmin()`; load the application; refuse unless `status === APPROVED && companyId == null`
   ("This application is no longer awaiting account setup.").
2. Reject if a `User` with the principal email already exists ("An account with this email already
   exists — link it from Customers instead."), same as today.
3. Create the `Company` from the form fields (admin may have edited the prefilled values; the form
   values win, not the application row).
4. `provisionUser` for the principal (`skipInvite: true`), then in one transaction: link user →
   company, update the inquiry (`companyId`, `userId`, `matchStatus = VERIFIED`,
   `matchedCompanyId = null`), and a status-guarded `updateMany` on the application
   (`APPROVED → ACCOUNT_CREATED`, `companyId`, `userId`, `accountCreatedAt`,
   `accountCreatedByUserId`). If the guard matches 0 rows or anything throws: delete the new user
   and company (compensating rollback, ported from today's `approveApplication`) and return an
   error.
5. `sendInvite(email, INVITE_REDIRECT.customer)` — the invite hook picks the "approved" copy (see
   §7). `after(() => sendInquiryEmails(inquiryId, { verifiedNow: true }))` notifies the assigned
   rep about the quote exactly as today.
6. Revalidate `/portal/applications`, `/portal/applications/[id]`, `/portal/requests`,
   `/portal/customers`, `/portal`; redirect to `/portal/customers/<id>`.

Without `applicationId` the action behaves as today, plus persisting the new company fields.

Company detail (`AdminCompanyView.tsx`) shows a small "Created from application #N" link when
`company.applications` has an `ACCOUNT_CREATED` row.

## 7. Emails

- **Invite "approved" variant** (`lib/email/send-account-invite.tsx`): the lookup changes from
  `status: "APPROVED"` to `status: "ACCOUNT_CREATED"`. Copy in `emails/account-invite.tsx` is
  unchanged. If the company has an `mecAccountNumber`, the approved variant adds one line:
  "Your MEC account number is <number>." (fetched alongside the application row; omitted when
  null).
- **New internal email** `emails/application-approved-internal.tsx`: subject
  "Application approved — set up the account for <Company>", body lists company, principal, and a
  "Create account →" link. Sent from `sendApplicationEmails(id, "approved")` via `after()` in
  `approveApplication`.
- **`ApplicationNotification`** (new/updated application to AR): adds Type of business, TRN,
  billing address (one line), and the accounting contact when present. Props extended
  accordingly.
- Received / info-requested / rejected emails unchanged.

## 8. Company form (`components/admin/CompanyForm.tsx`)

Regrouped into fieldsets, used for both create and edit:

1. **Business** — Company name\*, Industry, Type of business, Sector, In business since, TRN,
   Tax exemption number, Location (existing).
2. **Billing address** — Street, City, Parish (dropdown, with a "(legacy)" option pattern like
   Industry if a stored value is not in the list), Zip.
3. **Shipping address** — "Same as billing" checkbox (checked when all four shipping columns
   are null) revealing the four fields when unchecked.
4. **Accounting contact** — Name, Tel, Email.
5. **Account terms** — MEC account number, Credit terms (dropdown incl. "— Select —"), Credit
   limit (number, `min=0`, `step=0.01`, JMD), GCT status (dropdown), Sales rep.
6. **First portal user** (create only, existing) — see §6 for application mode.

`companyFields()` in `lib/actions/companies.ts` parses all of the above; `creditLimit` parses to
`Decimal` (empty → null, negative → error "Credit limit cannot be negative."). Shipping fields
are stored as `null` when "same as billing" is checked.

The rep-side company edit (`lib/actions/sales.ts`) is untouched: reps still edit only name,
industry, location.

## 9. Files touched (expected)

- `prisma/schema.prisma` + one migration
- `lib/constants.ts` (status, labels, `PARISHES`, `CREDIT_TERMS`, `GCT_STATUSES`)
- `lib/applications.ts` (include new relations: `accountCreatedBy`, company `mecAccountNumber`)
- `lib/actions/applications.ts` (`submitApplication` fields/validation; `approveApplication`
  simplified; `loadOpenApplication` guard)
- `lib/actions/companies.ts` (`companyFields`, `createCompany` application branch)
- `components/register/ApplicationForm.tsx`, `app/register/page.tsx`
- `components/admin/ApplicationDecisionForms.tsx`
- `components/admin/CompanyForm.tsx`
- `app/portal/(protected)/applications/page.tsx`, `.../applications/[id]/page.tsx`
- `app/portal/(protected)/customers/new/page.tsx`, `.../customers/[id]/AdminCompanyView.tsx`
- `components/portal/dashboards/ArDashboard.tsx`, `AdminDashboard.tsx`
- `lib/email/send-application-emails.tsx`, `lib/email/send-account-invite.tsx`,
  `emails/application-notification.tsx`, new `emails/application-approved-internal.tsx`,
  `emails/account-invite.tsx`
- `CLAUDE.md` (guest funnel paragraph: two-step approval)

## 10. Verification

There is no automated test suite. Acceptance is:

1. `npx tsc --noEmit`, `npm run lint`, `npm run build` pass from `minott-web/`.
2. Migration applies to a copy of an existing dev DB; pre-existing approved applications show as
   "Account created" and are absent from the new queue.
3. Click-through: guest quote (no match) → `/register` shows all sections → submit with
   shipping "same as billing" → AR user approves (no rep select, no applicant email; internal
   email logged) → applicant's status page shows the "setting up your account" copy → admin sees
   the "awaiting account setup" row → Create account → form prefilled, adds account number, terms,
   limit, GCT, rep → save → redirected to the company page with every field populated; the
   principal is a pending user; the invite log shows the "approved" variant with the account
   number; the original quote shows Verified and linked to the company in `/portal/requests`;
   application detail shows both audit lines.
4. Negative paths: AR cannot see "Create account"; opening the create URL for a non-approved or
   already-created application shows the notice; a second admin submitting concurrently gets
   "no longer awaiting account setup" and no orphan company/user remains; submitting the public
   form without TRN or a billing parish is rejected server-side.
5. Manual company creation without an application still works and persists the new fields;
   editing an existing company shows nulls as blanks and "Same as billing" checked.
