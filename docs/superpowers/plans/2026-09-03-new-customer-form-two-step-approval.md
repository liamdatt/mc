# New Customer Form + Two-Step Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the public New Customer Form to MEC's paper form, and split approval into "AR approves" → "admin creates the company account (account number, credit terms, limit, GCT status, rep) and sends the invite".

**Architecture:** Additive Prisma columns on `CustomerApplication` and `Company`, a new `ACCOUNT_CREATED` application status, a simplified AR `approveApplication`, and an `applicationId` branch in the existing admin `createCompany` action reached via `/portal/customers/new?application=<id>`. A shared `AddressFields` client component serves both the public form and the admin company form.

**Tech Stack:** Next.js 16 App Router (Server Actions, async `params`/`searchParams`), React 19 (`useActionState`), Prisma 7 + SQLite (`@prisma/adapter-better-sqlite3`), better-auth, Resend + `@react-email/components`, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-09-03-new-customer-form-and-two-step-approval-design.md`

## Global Constraints

- All commands run from `minott-web/`. Verification per task: `npx tsc --noEmit` and `npm run lint` (there is no test suite; the final task adds a scripted DB-level check and a manual click-through).
- Next.js 16: `params` and `searchParams` are Promises (await them). Server mutations are Server Actions (`"use server"`); each action re-checks the session itself (`requireAdmin()` / `requireRole([...])`).
- Named exports everywhere except Next.js `page`/`layout`. `@/` path alias. Server components by default; `"use client"` only for interactive components.
- Client components can only receive serializable props: pass `Prisma.Decimal` values as strings.
- Status strings: `APPLICATION_STATUS.APPROVED` now means "awaiting account setup"; `APPLICATION_STATUS.ACCOUNT_CREATED` is the terminal success state.
- Constant lists (exact values): `PARISHES` = Kingston, St. Andrew, St. Thomas, Portland, St. Mary, St. Ann, Trelawny, St. James, Hanover, Westmoreland, St. Elizabeth, Manchester, Clarendon, St. Catherine. `CREDIT_TERMS` = `Cash/COD`, `Net 7`, `Net 14`, `Net 30`, `Net 45`, `Net 60`. `GCT_STATUSES` = `Registered`, `Exempt`, `Not registered`.
- Work on branch `feat/customer-form-two-step-approval` (already created; spec committed there). Commit after every task.

---

## File map

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` + new migration | New nullable columns, `accountCreatedBy` relation, data fix for legacy APPROVED rows |
| `lib/constants.ts` | `ACCOUNT_CREATED` status + label, `PARISHES`, `CREDIT_TERMS`, `GCT_STATUSES`, `isParish` |
| `components/forms/AddressFields.tsx` (new) | Street/City/Parish/Zip inputs, reused by public + admin forms |
| `components/register/ApplicationForm.tsx` | Public form sections |
| `app/register/page.tsx` | Prefill + status copy |
| `lib/actions/applications.ts` | `submitApplication` fields/validation, `approveApplication` (status only), `revertApplicationApproval` |
| `emails/application-approved-internal.tsx` (new), `emails/application-notification.tsx`, `lib/email/send-application-emails.tsx` | Internal emails |
| `components/admin/ApplicationDecisionForms.tsx`, `components/admin/RevertApprovalForm.tsx` (new) | AR/admin decision UI |
| `app/portal/(protected)/applications/page.tsx`, `[id]/page.tsx` | Queue + detail |
| `components/portal/dashboards/ArDashboard.tsx`, `AdminDashboard.tsx` | Counts |
| `components/admin/CompanyForm.tsx`, `lib/actions/companies.ts` | Company fields, application branch of `createCompany` |
| `app/portal/(protected)/customers/new/page.tsx`, `[id]/AdminCompanyView.tsx` | Prefill from application; show link back |
| `lib/applications.ts` | Read helpers (new includes) |
| `lib/email/send-account-invite.tsx`, `emails/account-invite.tsx` | "approved" invite variant keyed on `ACCOUNT_CREATED`, account number line |
| `CLAUDE.md` (repo root) | Guest-funnel paragraph |

---

### Task 1: Schema, migration, constants

**Files:**
- Modify: `prisma/schema.prisma` (models `CustomerApplication`, `Company`, `User`)
- Create: `prisma/migrations/<timestamp>_customer_form_two_step_approval/migration.sql` (generated, then edited)
- Modify: `lib/constants.ts`

**Interfaces:**
- Produces: Prisma fields listed below; `APPLICATION_STATUS.ACCOUNT_CREATED`; `PARISHES`, `isParish(v)`, `CREDIT_TERMS`, `GCT_STATUSES` exported from `@/lib/constants`.

- [ ] **Step 1: Edit `prisma/schema.prisma`**

Replace the `CustomerApplication` model with:

```prisma
model CustomerApplication {
  id                 Int       @id @default(autoincrement())
  inquiry            Inquiry   @relation(fields: [inquiryId], references: [id], onDelete: Cascade)
  inquiryId          Int       @unique
  companyName        String
  industry           String
  location           String // "<billingCity>, <billingParish>" — kept for list/match/email display
  contactName        String // principal name
  email              String // principal email — becomes the first portal user
  phone              String // principal tel
  notes              String?
  // Paper-form customer fields (nullable: rows predate these columns)
  businessType       String?
  inBusinessSince    String?
  trn                String?
  taxExemptionNumber String?
  billingStreet      String?
  billingCity        String?
  billingParish      String?
  billingZip         String?
  shippingStreet     String? // all four null = "same as billing"
  shippingCity       String?
  shippingParish     String?
  shippingZip        String?
  principalTitle     String?
  accountingName     String?
  accountingPhone    String?
  accountingEmail    String?
  status             String    @default("SUBMITTED") // "SUBMITTED" | "INFO_REQUESTED" | "APPROVED" | "ACCOUNT_CREATED" | "REJECTED"
  decisionNote       String? // rejection reason, the info request, or an internal return-to-review note
  decidedAt          DateTime?
  decidedBy          User?     @relation("ApplicationDecider", fields: [decidedByUserId], references: [id], onDelete: SetNull)
  decidedByUserId    String?
  // Stamped by the admin who creates the account (paper form: "Customer Account Created By")
  accountCreatedAt       DateTime?
  accountCreatedBy       User?   @relation("ApplicationAccountCreator", fields: [accountCreatedByUserId], references: [id], onDelete: SetNull)
  accountCreatedByUserId String?
  company            Company?  @relation(fields: [companyId], references: [id], onDelete: SetNull) // set on ACCOUNT_CREATED
  companyId          Int?
  user               User?     @relation("ApplicationContact", fields: [userId], references: [id], onDelete: SetNull) // provisioned on ACCOUNT_CREATED
  userId             String?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@index([status])
}
```

In `model Company`, add after `location String?`:

```prisma
  businessType       String?
  inBusinessSince    String?
  trn                String?
  taxExemptionNumber String?
  billingStreet      String?
  billingCity        String?
  billingParish      String?
  billingZip         String?
  shippingStreet     String? // all four null = "same as billing"
  shippingCity       String?
  shippingParish     String?
  shippingZip        String?
  accountingName     String?
  accountingPhone    String?
  accountingEmail    String?
  // Admin-only account terms (paper form "Other Information")
  sector             String?
  creditTerms        String?
  creditLimit        Decimal?
  gctStatus          String?
```

In `model User`, add after `contactApplications`:

```prisma
  createdApplications CustomerApplication[] @relation("ApplicationAccountCreator")
```

- [ ] **Step 2: Generate the migration without applying it**

Run: `npx prisma migrate dev --create-only --name customer_form_two_step_approval`
Expected: a new folder under `prisma/migrations/` containing `migration.sql` with `ALTER TABLE ... ADD COLUMN` statements (SQLite may instead emit a `RedefineTables` block for `CustomerApplication` because of the new foreign key; either is fine).

- [ ] **Step 3: Append the data fix to the generated `migration.sql`**

```sql
-- Legacy approvals already created their company; they are complete under the new two-step flow.
UPDATE "CustomerApplication"
SET "status" = 'ACCOUNT_CREATED',
    "accountCreatedAt" = "decidedAt",
    "accountCreatedByUserId" = "decidedByUserId"
WHERE "status" = 'APPROVED' AND "companyId" IS NOT NULL;
```

- [ ] **Step 4: Apply and regenerate the client**

Run: `npx prisma migrate dev`
Expected: "Your database is now in sync with your schema" and `prisma generate` output. Then run `npx tsc --noEmit` — expect errors only if something already references removed fields (there should be none).

- [ ] **Step 5: Update `lib/constants.ts`**

Replace the `APPLICATION_STATUS` block and append the new lists:

```ts
export const APPLICATION_STATUS = {
  SUBMITTED: "SUBMITTED",
  INFO_REQUESTED: "INFO_REQUESTED",
  /** Approved by AR/admin — awaiting an admin to create the company account. */
  APPROVED: "APPROVED",
  /** Company created, principal invited, quote linked. Terminal. */
  ACCOUNT_CREATED: "ACCOUNT_CREATED",
  REJECTED: "REJECTED",
} as const;

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  INFO_REQUESTED: "Info requested",
  APPROVED: "Approved — awaiting account setup",
  ACCOUNT_CREATED: "Account created",
  REJECTED: "Rejected",
};

export const PARISHES = [
  "Kingston",
  "St. Andrew",
  "St. Thomas",
  "Portland",
  "St. Mary",
  "St. Ann",
  "Trelawny",
  "St. James",
  "Hanover",
  "Westmoreland",
  "St. Elizabeth",
  "Manchester",
  "Clarendon",
  "St. Catherine",
] as const;
export type Parish = (typeof PARISHES)[number];
export function isParish(value: string): value is Parish {
  return (PARISHES as readonly string[]).includes(value);
}

export const CREDIT_TERMS = ["Cash/COD", "Net 7", "Net 14", "Net 30", "Net 45", "Net 60"] as const;
export const GCT_STATUSES = ["Registered", "Exempt", "Not registered"] as const;
```

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean.

```bash
git add prisma/schema.prisma prisma/migrations lib/constants.ts
git commit -m "feat(applications): schema + constants for expanded form and two-step approval"
```

---

### Task 2: Shared `AddressFields` component

**Files:**
- Create: `components/forms/AddressFields.tsx`

**Interfaces:**
- Produces: `AddressFields` (client component) and `AddressValues` type. Field names are `${prefix}Street`, `${prefix}City`, `${prefix}Parish`, `${prefix}Zip`.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { PARISHES } from "@/lib/constants";

export type AddressValues = {
  street: string;
  city: string;
  parish: string;
  zip: string;
};

export const EMPTY_ADDRESS: AddressValues = { street: "", city: "", parish: "", zip: "" };

/**
 * Street / City / Parish / Zip inputs named `${prefix}Street` etc. Used by the
 * public New Customer Form and the admin company form, which pass their own
 * input/label classes. A stored parish that is not in PARISHES (legacy data)
 * is kept selectable so an edit does not silently drop it.
 */
export function AddressFields({
  prefix,
  values,
  required,
  inputClass,
  labelClass,
}: {
  prefix: "billing" | "shipping";
  values: AddressValues;
  required: boolean;
  inputClass: string;
  labelClass: string;
}) {
  const star = required ? " *" : "";
  const legacyParish = values.parish && !(PARISHES as readonly string[]).includes(values.parish);
  return (
    <>
      <label className={labelClass}>
        Street{star}
        <input name={`${prefix}Street`} required={required} defaultValue={values.street} className={inputClass} />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className={labelClass}>
          City{star}
          <input name={`${prefix}City`} required={required} defaultValue={values.city} className={inputClass} />
        </label>
        <label className={labelClass}>
          Parish{star}
          <select name={`${prefix}Parish`} required={required} defaultValue={values.parish} className={inputClass}>
            <option value="">{required ? "Select parish" : "—"}</option>
            {legacyParish && <option value={values.parish}>{values.parish} (legacy)</option>}
            {PARISHES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Zip code
          <input name={`${prefix}Zip`} defaultValue={values.zip} className={inputClass} />
        </label>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify and commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add components/forms/AddressFields.tsx
git commit -m "feat(forms): shared AddressFields component"
```

---

### Task 3: Public New Customer Form + `submitApplication`

**Files:**
- Modify: `components/register/ApplicationForm.tsx` (whole file)
- Modify: `app/register/page.tsx` (prefill block + status copy)
- Modify: `lib/actions/applications.ts` (`submitApplication` only)

**Interfaces:**
- Consumes: `AddressFields`, `EMPTY_ADDRESS`, `AddressValues` (Task 2); `isParish`, `APPLICATION_STATUS` (Task 1).
- Produces: `ApplicationPrefill` type (below); form field names consumed by `submitApplication`: `companyName, industry, businessType, inBusinessSince, trn, taxExemptionNumber, billing*, shippingSame (checkbox "on"), shipping*, contactName, principalTitle, email, phone, accountingName, accountingPhone, accountingEmail, notes, ref`.

- [ ] **Step 1: Rewrite `components/register/ApplicationForm.tsx`**

```tsx
"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { INDUSTRIES } from "@/lib/industries";
import { AddressFields, type AddressValues } from "@/components/forms/AddressFields";
import { submitApplication, type ApplicationFormState } from "@/lib/actions/applications";

const inputCls =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-4 py-3 text-mec-ink outline-none focus:border-mec-red";
const labelCls = "mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70";
const h2 = "mt-8 font-display-tight text-h3 text-mec-ink first:mt-0";

export type ApplicationPrefill = {
  companyName: string;
  industry: string;
  businessType: string;
  inBusinessSince: string;
  trn: string;
  taxExemptionNumber: string;
  billing: AddressValues;
  /** null = same as billing */
  shipping: AddressValues | null;
  contactName: string;
  principalTitle: string;
  email: string;
  phone: string;
  accountingName: string;
  accountingPhone: string;
  accountingEmail: string;
  notes: string;
};

export function ApplicationForm({
  refToken,
  prefill,
  resubmit,
}: {
  refToken: string;
  prefill: ApplicationPrefill;
  resubmit: boolean;
}) {
  const [state, formAction, pending] = useActionState<ApplicationFormState, FormData>(
    submitApplication,
    {},
  );
  const [sameAsBilling, setSameAsBilling] = useState(prefill.shipping === null);

  if (state.done) {
    return (
      <div className="rounded-md border border-mec-red/30 bg-mec-red/5 p-8">
        <h2 className="font-display-tight text-h2 text-mec-ink">Application submitted.</h2>
        <p className="mt-3 max-w-xl text-mec-ink/75">
          Thanks — our Accounts Receivable team will review your application and
          respond within one business day. We&apos;ve emailed you a confirmation.
        </p>
        <Link href="/products" className="mt-6 inline-block bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover">
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-md border border-black/10 bg-mec-pure p-6">
      <input type="hidden" name="ref" value={refToken} />

      <h2 className={h2}>Business</h2>
      <label className={labelCls}>Business name *<input name="companyName" required defaultValue={prefill.companyName} className={inputCls} /></label>
      <label className={labelCls}>Industry *
        <select name="industry" required defaultValue={prefill.industry} className={inputCls}>
          <option value="" disabled>Select your industry</option>
          {INDUSTRIES.map((i) => (<option key={i} value={i}>{i}</option>))}
        </select>
      </label>
      <label className={labelCls}>Type of business *<input name="businessType" required defaultValue={prefill.businessType} placeholder="e.g. Hotel, School, Manufacturer" className={inputCls} /></label>
      <label className={labelCls}>In business since<input name="inBusinessSince" defaultValue={prefill.inBusinessSince} placeholder="e.g. 2008" className={inputCls} /></label>
      <label className={labelCls}>Tax Registration Number (TRN) *<input name="trn" required defaultValue={prefill.trn} className={inputCls} /></label>
      <label className={labelCls}>Tax exemption number (if applicable)<input name="taxExemptionNumber" defaultValue={prefill.taxExemptionNumber} className={inputCls} /></label>

      <h2 className={h2}>Billing address</h2>
      <AddressFields prefix="billing" values={prefill.billing} required inputClass={inputCls} labelClass={labelCls} />

      <h2 className={h2}>Shipping address</h2>
      <label className="mt-3 flex items-center gap-2 text-sm text-mec-ink/80">
        <input type="checkbox" name="shippingSame" checked={sameAsBilling} onChange={(e) => setSameAsBilling(e.target.checked)} className="h-4 w-4 accent-mec-red" />
        Same as billing address
      </label>
      {!sameAsBilling && (
        <AddressFields prefix="shipping" values={prefill.shipping ?? { street: "", city: "", parish: "", zip: "" }} required={false} inputClass={inputCls} labelClass={labelCls} />
      )}

      <h2 className={h2}>Principal contact</h2>
      <label className={labelCls}>Name *<input name="contactName" required defaultValue={prefill.contactName} className={inputCls} /></label>
      <label className={labelCls}>Title<input name="principalTitle" defaultValue={prefill.principalTitle} placeholder="e.g. Owner, Operations Manager" className={inputCls} /></label>
      <label className={labelCls}>Email *<input name="email" type="email" required defaultValue={prefill.email} className={inputCls} /></label>
      <label className={labelCls}>Tel. *<input name="phone" type="tel" required defaultValue={prefill.phone} className={inputCls} /></label>

      <h2 className={h2}>Accounting contact</h2>
      <p className="mt-1 text-xs text-mec-ink/60">Who should receive invoices and statements? Optional.</p>
      <label className={labelCls}>Name<input name="accountingName" defaultValue={prefill.accountingName} className={inputCls} /></label>
      <label className={labelCls}>Tel.<input name="accountingPhone" type="tel" defaultValue={prefill.accountingPhone} className={inputCls} /></label>
      <label className={labelCls}>Email<input name="accountingEmail" type="email" defaultValue={prefill.accountingEmail} className={inputCls} /></label>

      <label className={labelCls}>Notes<textarea name="notes" rows={3} defaultValue={prefill.notes} className={`${inputCls} resize-none`} /></label>

      {state.error && <p className="mt-3 text-sm text-mec-red">{state.error}</p>}
      <button type="submit" disabled={pending} className="mt-5 w-full bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50">
        {pending ? "Submitting…" : resubmit ? "Resubmit Application" : "Submit Application"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Update `app/register/page.tsx`**

Replace the `copy` ternary inside the `if (app && app.status !== INFO_REQUESTED)` block:

```tsx
    const copy =
      app.status === APPLICATION_STATUS.ACCOUNT_CREATED
        ? "Your account is ready — check your email for the link to set your password."
        : app.status === APPLICATION_STATUS.APPROVED
          ? "Your application has been approved. We're setting up your account and will email you your login details shortly."
          : app.status === APPLICATION_STATUS.REJECTED
            ? "Your application was not approved. Please check your email for details."
            : "Your application is under review. Our Accounts Receivable team will respond within one business day.";
```

Replace the `const prefill = app ? {...} : {...};` statement with:

```tsx
  const prefill: ApplicationPrefill = app
    ? {
        companyName: app.companyName,
        industry: app.industry,
        businessType: app.businessType ?? "",
        inBusinessSince: app.inBusinessSince ?? "",
        trn: app.trn ?? "",
        taxExemptionNumber: app.taxExemptionNumber ?? "",
        billing: { street: app.billingStreet ?? "", city: app.billingCity ?? "", parish: app.billingParish ?? "", zip: app.billingZip ?? "" },
        shipping:
          app.shippingStreet || app.shippingCity || app.shippingParish || app.shippingZip
            ? { street: app.shippingStreet ?? "", city: app.shippingCity ?? "", parish: app.shippingParish ?? "", zip: app.shippingZip ?? "" }
            : null,
        contactName: app.contactName,
        principalTitle: app.principalTitle ?? "",
        email: app.email,
        phone: app.phone,
        accountingName: app.accountingName ?? "",
        accountingPhone: app.accountingPhone ?? "",
        accountingEmail: app.accountingEmail ?? "",
        notes: app.notes ?? "",
      }
    : {
        companyName: inquiry.company ?? "",
        industry: inquiry.industry ?? "",
        businessType: "",
        inBusinessSince: "",
        trn: "",
        taxExemptionNumber: "",
        billing: EMPTY_ADDRESS,
        shipping: null,
        contactName: inquiry.name,
        principalTitle: "",
        email: inquiry.email,
        phone: inquiry.phone ?? "",
        accountingName: "",
        accountingPhone: "",
        accountingEmail: "",
        notes: "",
      };
```

Add imports at the top: `import { ApplicationForm, type ApplicationPrefill } from "@/components/register/ApplicationForm";` (replacing the existing ApplicationForm import) and `import { EMPTY_ADDRESS } from "@/components/forms/AddressFields";`.

- [ ] **Step 3: Rewrite the data/validation block of `submitApplication` in `lib/actions/applications.ts`**

Add `isParish` to the `@/lib/constants` import. Replace everything from `const data = {` through the `if (!data.phone) ...` line with:

```ts
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const opt = (key: string) => str(formData, key) || null;
  const shippingSame = formData.get("shippingSame") === "on";
  const billingCity = str(formData, "billingCity");
  const billingParish = str(formData, "billingParish");

  const data = {
    companyName: str(formData, "companyName"),
    industry: str(formData, "industry"),
    businessType: str(formData, "businessType"),
    inBusinessSince: opt("inBusinessSince"),
    trn: str(formData, "trn"),
    taxExemptionNumber: opt("taxExemptionNumber"),
    billingStreet: str(formData, "billingStreet"),
    billingCity,
    billingParish,
    billingZip: opt("billingZip"),
    shippingStreet: shippingSame ? null : opt("shippingStreet"),
    shippingCity: shippingSame ? null : opt("shippingCity"),
    shippingParish: shippingSame ? null : opt("shippingParish"),
    shippingZip: shippingSame ? null : opt("shippingZip"),
    location: `${billingCity}, ${billingParish}`,
    contactName: str(formData, "contactName"),
    principalTitle: opt("principalTitle"),
    email: str(formData, "email").toLowerCase(),
    phone: str(formData, "phone"),
    accountingName: opt("accountingName"),
    accountingPhone: opt("accountingPhone"),
    accountingEmail: str(formData, "accountingEmail").toLowerCase() || null,
    notes: opt("notes"),
  };
  if (!data.companyName) return { error: "Business name is required." };
  if (!isIndustry(data.industry)) return { error: "Please choose your industry." };
  if (!data.businessType) return { error: "Type of business is required." };
  if (!data.trn) return { error: "Tax Registration Number (TRN) is required." };
  if (!data.billingStreet || !data.billingCity) return { error: "Billing street and city are required." };
  if (!isParish(data.billingParish)) return { error: "Please choose your billing parish." };
  if (data.shippingParish && !isParish(data.shippingParish)) return { error: "Please choose a valid shipping parish." };
  if (!data.contactName) return { error: "Principal contact name is required." };
  if (!EMAIL_RE.test(data.email)) return { error: "A valid principal email is required." };
  if (!data.phone) return { error: "Principal telephone is required." };
  if (data.accountingEmail && !EMAIL_RE.test(data.accountingEmail)) return { error: "The accounting contact email is not valid." };
```

The two writes below (`updateMany` with `{ ...data, status: SUBMITTED, decisionNote: null }` and `create` with `{ ...data, inquiryId }`) need no change.

- [ ] **Step 4: Verify in the browser**

Run: `npx tsc --noEmit && npm run lint`, then `npm run dev`. Create a guest quote at `/quote` with an email/phone/company that match nothing, follow the "New Customer Form" link, confirm all six sections render, uncheck "Same as billing" and confirm the shipping fields appear, submit with a missing TRN (remove the `required` attribute via devtools) and confirm the server error "Tax Registration Number (TRN) is required.", then submit fully and confirm "Application submitted." In `npm run db:studio`, confirm the row has `billing*` populated, `shipping*` null, `location = "City, Parish"`.

- [ ] **Step 5: Commit**

```bash
git add components/register/ApplicationForm.tsx app/register/page.tsx lib/actions/applications.ts
git commit -m "feat(register): New Customer Form matches MEC paper form"
```

---

### Task 4: AR step — status-only approve, return-to-review, internal email

**Files:**
- Modify: `lib/actions/applications.ts` (`loadOpenApplication`, `approveApplication`, add `revertApplicationApproval`)
- Create: `emails/application-approved-internal.tsx`
- Modify: `emails/application-notification.tsx`, `lib/email/send-application-emails.tsx`
- Modify: `components/admin/ApplicationDecisionForms.tsx`
- Create: `components/admin/RevertApprovalForm.tsx`

**Interfaces:**
- Produces: `approveApplication(prev, formData)` (form field `id` only), `revertApplicationApproval(prev, formData)` (fields `id`, optional `note`), both returning `DecisionState`; `sendApplicationEmails(id, "approved")`; `ApplicationDecisionForms({ id })` (no `salesReps` prop); `RevertApprovalForm({ id })`.

- [ ] **Step 1: Simplify `approveApplication` and add `revertApplicationApproval`**

In `lib/actions/applications.ts`, delete the imports of `provisionUser, sendInvite, INVITE_REDIRECT` and `sendInquiryEmails` (no longer used here). Replace the whole `approveApplication` function with:

```ts
/**
 * AR/admin approval. Status-only: marks APPROVED and hands off to an admin,
 * who creates the company account from /portal/customers/new?application=<id>
 * (see lib/actions/companies.ts). No applicant email; admins are notified.
 */
export async function approveApplication(
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  await requireRole(STAFF);
  const session = await getPortalSession();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Missing application id." };
  const loaded = await loadOpenApplication(id);
  if ("error" in loaded) return { error: loaded.error };

  const claimed = await db.customerApplication.updateMany({
    where: {
      id,
      status: { in: [APPLICATION_STATUS.SUBMITTED, APPLICATION_STATUS.INFO_REQUESTED] },
    },
    data: {
      status: APPLICATION_STATUS.APPROVED,
      decidedAt: new Date(),
      decidedByUserId: session?.user.id ?? null,
      decisionNote: null,
    },
  });
  if (claimed.count === 0) return { error: "This application has already been decided." };
  after(() => sendApplicationEmails(id, "approved"));
  revalidateAll(id);
  return { success: true };
}

/**
 * Undo an approval that has not yet been turned into an account: back to the
 * "Awaiting review" queue. No emails. The optional note is internal only.
 */
export async function revertApplicationApproval(
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  await requireRole(STAFF);
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Missing application id." };
  const note = str(formData, "note");

  const claimed = await db.customerApplication.updateMany({
    where: { id, status: APPLICATION_STATUS.APPROVED, companyId: null },
    data: {
      status: APPLICATION_STATUS.SUBMITTED,
      decidedAt: null,
      decidedByUserId: null,
      decisionNote: note || null,
    },
  });
  if (claimed.count === 0) return { error: "This application is not awaiting account setup." };
  revalidateAll(id);
  return { success: true };
}
```

`loadOpenApplication` already rejects `APPROVED`? No — it only checks `APPROVED || REJECTED`. Update it so `ACCOUNT_CREATED` is also treated as decided:

```ts
  if (
    app.status === APPLICATION_STATUS.APPROVED ||
    app.status === APPLICATION_STATUS.ACCOUNT_CREATED ||
    app.status === APPLICATION_STATUS.REJECTED
  )
    return { error: "This application has already been decided." } as const;
```

Also add `revalidatePath("/portal/customers/new");` inside `revalidateAll`.

- [ ] **Step 2: Create `emails/application-approved-internal.tsx`**

```tsx
import { Heading, Hr, Link, Text } from "@react-email/components";
import { EmailLayout, emailColors } from "./components/EmailLayout";

export type ApplicationApprovedInternalProps = {
  companyName: string;
  industry: string;
  location: string;
  contactName: string;
  email: string;
  phone: string;
  approvedBy: string | null;
  ctaUrl: string;
};

const detailLabel = { color: emailColors.graphite, fontSize: 12, fontWeight: 700 as const, letterSpacing: "0.08em", margin: "12px 0 2px", textTransform: "uppercase" as const };
const detailValue = { color: emailColors.ink, fontSize: 14, margin: 0 };

/** Sent to admins when AR approves: the account still needs to be created. */
export function ApplicationApprovedInternal(p: ApplicationApprovedInternalProps) {
  const title = `Application approved — set up the account for ${p.companyName}`;
  return (
    <EmailLayout preview={title}>
      <Heading as="h1" style={{ color: emailColors.ink, fontSize: 22, margin: "0 0 4px" }}>{title}</Heading>
      <Text style={{ color: emailColors.graphite, fontSize: 14, margin: "8px 0 0" }}>
        {p.approvedBy ? `${p.approvedBy} approved` : "Approved"} this New Customer Form. An admin now needs to
        create the company account, assign the MEC account number, credit terms and sales rep, and send the invite.
      </Text>
      <Text style={detailLabel}>Company</Text>
      <Text style={detailValue}>{p.companyName} · {p.industry} · {p.location}</Text>
      <Text style={detailLabel}>Principal contact</Text>
      <Text style={detailValue}>{p.contactName} · <Link href={`mailto:${p.email}`} style={{ color: emailColors.red }}>{p.email}</Link> · {p.phone}</Text>
      <Hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "24px 0" }} />
      <Text style={{ fontSize: 14, margin: 0 }}>
        <Link href={p.ctaUrl} style={{ color: emailColors.red }}>Create the account →</Link>
      </Text>
    </EmailLayout>
  );
}
```

- [ ] **Step 3: Extend `emails/application-notification.tsx`**

Add to `ApplicationNotificationProps`:

```ts
  businessType: string | null;
  trn: string | null;
  billingAddress: string | null;
  accountingContact: string | null;
```

Insert after the Contact block in the JSX:

```tsx
      {p.businessType && (<><Text style={detailLabel}>Type of business</Text><Text style={detailValue}>{p.businessType}</Text></>)}
      {p.trn && (<><Text style={detailLabel}>TRN</Text><Text style={detailValue}>{p.trn}</Text></>)}
      {p.billingAddress && (<><Text style={detailLabel}>Billing address</Text><Text style={detailValue}>{p.billingAddress}</Text></>)}
      {p.accountingContact && (<><Text style={detailLabel}>Accounting contact</Text><Text style={detailValue}>{p.accountingContact}</Text></>)}
```

- [ ] **Step 4: Update `lib/email/send-application-emails.tsx`**

Change the kind union: `export type ApplicationEmailKind = "received" | "info_requested" | "rejected" | "approved";`

Add the import: `import { ApplicationApprovedInternal } from "@/emails/application-approved-internal";`

Change the `db.customerApplication.findUnique` include to also load the decider:

```ts
      include: {
        inquiry: { select: { id: true, _count: { select: { items: true } } } },
        decidedBy: { select: { name: true } },
      },
```

In the `received` branch, pass the new props to `ApplicationNotification`:

```tsx
          businessType={app.businessType}
          trn={app.trn}
          billingAddress={[app.billingStreet, app.billingCity, app.billingParish, app.billingZip].filter(Boolean).join(", ") || null}
          accountingContact={app.accountingName ? [app.accountingName, app.accountingPhone, app.accountingEmail].filter(Boolean).join(" · ") : null}
```

Add a new branch before the final `}` of the try block (after the `rejected` branch):

```tsx
    if (kind === "approved") {
      const admins = await db.user.findMany({ where: { role: "admin", NOT: { banned: true } }, select: { email: true } });
      const internal = Array.from(new Set([settings.generalInboxEmail, ...admins.map((u) => u.email)]));
      await send(internal, `Application approved — set up the account for ${app.companyName}`,
        <ApplicationApprovedInternal
          companyName={app.companyName} industry={app.industry} location={app.location}
          contactName={app.contactName} email={app.email} phone={app.phone}
          approvedBy={app.decidedBy?.name ?? null}
          ctaUrl={`${baseUrl}/portal/customers/new?application=${app.id}`}
        />);
      return;
    }
```

- [ ] **Step 5: Update `components/admin/ApplicationDecisionForms.tsx`**

Remove the `salesReps` prop and the rep `<select>`; the Approve card becomes:

```tsx
      <form action={approveAction} className="rounded-md border border-black/10 bg-mec-pure p-5">
        <input type="hidden" name="id" value={id} />
        <h3 className="font-display-tight text-xl">Approve</h3>
        <p className="mt-1 text-xs text-mec-ink/60">Marks the application approved. An admin then creates the account, assigns the account number and rep, and sends the invite.</p>
        {approve.error && <p className="mt-3 text-sm text-mec-red">{approve.error}</p>}
        <button type="submit" disabled={approving} className={`${primary} mt-4 w-full`}>{approving ? "Approving…" : "Approve application"}</button>
      </form>
```

Signature becomes `export function ApplicationDecisionForms({ id }: { id: number })`.

- [ ] **Step 6: Create `components/admin/RevertApprovalForm.tsx`**

```tsx
"use client";

import { useActionState, useState } from "react";
import { revertApplicationApproval, type DecisionState } from "@/lib/actions/applications";

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const secondary =
  "rounded-sm border border-mec-ink/20 px-4 py-2 text-sm font-semibold text-mec-ink/80 transition-colors hover:border-mec-red hover:text-mec-red disabled:opacity-50";

/** "Return to review" for an APPROVED application that has no account yet. */
export function RevertApprovalForm({ id }: { id: number }) {
  const [state, action, pending] = useActionState<DecisionState, FormData>(revertApplicationApproval, {});
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={secondary}>
        Return to review
      </button>
    );
  }
  return (
    <form action={action} className="max-w-md rounded-md border border-black/10 bg-mec-pure p-5">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm font-semibold">Return to review?</p>
      <p className="mt-1 text-xs text-mec-ink/60">The application goes back to the Awaiting review queue. The applicant is not emailed.</p>
      <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70">
        Internal note (optional)
        <textarea name="note" rows={2} className={`${field} resize-none`} />
      </label>
      {state.error && <p className="mt-3 text-sm text-mec-red">{state.error}</p>}
      <div className="mt-4 flex gap-3">
        <button type="submit" disabled={pending} className={secondary}>{pending ? "Returning…" : "Yes, return to review"}</button>
        <button type="button" onClick={() => setConfirming(false)} className="text-sm text-mec-ink/60 hover:text-mec-red">Cancel</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 7: Verify and commit**

Run: `npx tsc --noEmit`. Expected error: `app/portal/(protected)/applications/[id]/page.tsx` still passes `salesReps` to `ApplicationDecisionForms` — that page is rewritten in Task 5, so temporarily remove the `salesReps` prop from that call (and the now-unused `getActiveSalesReps` import/variable) to get a clean build. Then `npm run lint`.

```bash
git add lib/actions/applications.ts emails/application-approved-internal.tsx emails/application-notification.tsx lib/email/send-application-emails.tsx components/admin/ApplicationDecisionForms.tsx components/admin/RevertApprovalForm.tsx "app/portal/(protected)/applications/[id]/page.tsx"
git commit -m "feat(applications): AR approval is status-only; return-to-review; admin notification"
```

---

### Task 5: Applications queue, detail page, dashboards

**Files:**
- Modify: `lib/applications.ts` (`getApplicationById` includes)
- Modify: `app/portal/(protected)/applications/page.tsx` (whole file)
- Modify: `app/portal/(protected)/applications/[id]/page.tsx` (whole file)
- Modify: `components/portal/dashboards/ArDashboard.tsx`, `components/portal/dashboards/AdminDashboard.tsx`

**Interfaces:**
- Consumes: `ApplicationDecisionForms({ id })`, `RevertApprovalForm({ id })` (Task 4); `APPLICATION_STATUS.ACCOUNT_CREATED` (Task 1).
- Produces: the admin "Create account" link target `/portal/customers/new?application=<id>` (implemented in Task 7).

- [ ] **Step 1: Extend `getApplicationById` in `lib/applications.ts`**

```ts
export function getApplicationById(id: number) {
  return db.customerApplication.findUnique({
    where: { id },
    include: {
      inquiry: { include: { items: true } },
      decidedBy: { select: { name: true } },
      accountCreatedBy: { select: { name: true } },
      company: { select: { id: true, name: true, mecAccountNumber: true } },
    },
  });
}
```

Remove `getActiveSalesReps` (no remaining callers after Task 4).

- [ ] **Step 2: Rewrite `app/portal/(protected)/applications/page.tsx`**

```tsx
import Link from "next/link";
import { requireRoleSession } from "@/lib/portal";
import { getApplications } from "@/lib/applications";
import { APPLICATION_STATUS, APPLICATION_STATUS_LABELS } from "@/lib/constants";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

type Row = Awaited<ReturnType<typeof getApplications>>[number];

function Group({
  title,
  rows,
  empty,
  createAccount,
}: {
  title: string;
  rows: Row[];
  empty: string;
  /** Admins only: render a "Create account" link per row (awaiting-setup group). */
  createAccount?: boolean;
}) {
  const cols = createAccount ? 7 : 6;
  return (
    <section className="mt-8">
      <h2 className="font-display-tight text-xl">{title}</h2>
      <div className="mt-3 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Industry</th>
              <th className="px-4 py-3">Quote</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Status</th>
              {createAccount && <th className="px-4 py-3"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (<tr><td colSpan={cols} className="px-4 py-6 text-mec-ink/60">{empty}</td></tr>)}
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-black/5">
                <td className="px-4 py-3 font-semibold"><Link href={`/portal/applications/${a.id}`} className="hover:text-mec-red">{a.companyName}</Link></td>
                <td className="px-4 py-3 text-mec-ink/70">{a.contactName} · {a.email}</td>
                <td className="px-4 py-3 text-mec-ink/70">{a.industry}</td>
                <td className="px-4 py-3 text-mec-ink/70">#{a.inquiry.id} · {a.inquiry._count.items} items</td>
                <td className="px-4 py-3 text-mec-ink/60">{formatDate(a.createdAt)}</td>
                <td className="px-4 py-3"><span className="rounded-pill bg-mec-mist px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/70">{APPLICATION_STATUS_LABELS[a.status] ?? a.status}</span></td>
                {createAccount && (
                  <td className="px-4 py-3 text-right">
                    <Link href={`/portal/customers/new?application=${a.id}`} className="font-semibold text-mec-red hover:underline">Create account</Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function ApplicationsPage() {
  const session = await requireRoleSession(["admin", "ar"]);
  const isAdmin = session.user.role === "admin";
  const all = await getApplications();
  const submitted = all.filter((a) => a.status === APPLICATION_STATUS.SUBMITTED);
  const info = all.filter((a) => a.status === APPLICATION_STATUS.INFO_REQUESTED);
  const awaitingSetup = all.filter((a) => a.status === APPLICATION_STATUS.APPROVED);
  const ts = (r: Row) => (r.accountCreatedAt ?? r.decidedAt)?.getTime() ?? 0;
  const decided = all
    .filter((a) => a.status === APPLICATION_STATUS.ACCOUNT_CREATED || a.status === APPLICATION_STATUS.REJECTED)
    .sort((a, b) => ts(b) - ts(a))
    .slice(0, 50);

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Customer applications</h1>
      <p className="mt-3 max-w-2xl text-sm text-mec-ink/60">New Customer Forms submitted from the website. Accounts Receivable approves; an admin then creates the company account, assigns the account number and rep, and sends the invite. The original quote stays attached throughout.</p>
      <Group title="Awaiting review" rows={submitted} empty="Nothing waiting." />
      <Group title="Info requested" rows={info} empty="No open information requests." />
      <Group title="Approved — awaiting account setup" rows={awaitingSetup} empty="No approved applications waiting for an account." createAccount={isAdmin} />
      <Group title="Decided" rows={decided} empty="No decisions yet." />
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `app/portal/(protected)/applications/[id]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRoleSession } from "@/lib/portal";
import { getApplicationById } from "@/lib/applications";
import { matchGuest } from "@/lib/customer-match";
import { APPLICATION_STATUS, APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { ApplicationDecisionForms } from "@/components/admin/ApplicationDecisionForms";
import { RevertApprovalForm } from "@/components/admin/RevertApprovalForm";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

const dl = "text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/50";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (<><p className={`${dl} mt-3`}>{label}</p><p className="mt-0.5 text-mec-ink/80">{value}</p></>);
}

function address(street?: string | null, city?: string | null, parish?: string | null, zip?: string | null) {
  return [street, city, parish, zip].filter(Boolean).join(", ") || null;
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRoleSession(["admin", "ar"]);
  const isAdmin = session.user.role === "admin";
  const { id } = await params;
  const appId = Number(id);
  if (!Number.isInteger(appId)) notFound();
  const app = await getApplicationById(appId);
  if (!app) notFound();

  const open = app.status === APPLICATION_STATUS.SUBMITTED || app.status === APPLICATION_STATUS.INFO_REQUESTED;
  const awaitingSetup = app.status === APPLICATION_STATUS.APPROVED && app.companyId === null;
  const hint = open || awaitingSetup ? await matchGuest({ email: app.email, phone: app.phone, company: app.companyName }) : null;
  const shipping = address(app.shippingStreet, app.shippingCity, app.shippingParish, app.shippingZip);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display-tight text-3xl">{app.companyName}</h1>
        <span className="rounded-pill bg-mec-mist px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-ink/70">{APPLICATION_STATUS_LABELS[app.status] ?? app.status}</span>
      </div>

      {awaitingSetup && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-md border border-mec-red/30 bg-mec-red/5 p-5 text-sm">
          <p className="flex-1">
            <span className="font-semibold">Approved{app.decidedBy ? ` by ${app.decidedBy.name}` : ""}{app.decidedAt ? ` · ${formatDate(app.decidedAt)}` : ""}.</span>{" "}
            {isAdmin ? "Create the company account to assign the account number, terms and rep, and send the invite." : "An admin will create the account and send the invite."}
          </p>
          {isAdmin && (
            <Link href={`/portal/customers/new?application=${app.id}`} className="bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover">Create account</Link>
          )}
          <RevertApprovalForm id={app.id} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-black/10 bg-mec-pure p-5 text-sm">
          <p className={dl}>Business</p>
          <p className="mt-1 font-semibold">{app.companyName}</p>
          <p className="text-mec-ink/70">{app.industry}{app.businessType ? ` · ${app.businessType}` : ""}</p>
          <Field label="In business since" value={app.inBusinessSince} />
          <Field label="TRN" value={app.trn} />
          <Field label="Tax exemption number" value={app.taxExemptionNumber} />
          <Field label="Billing address" value={address(app.billingStreet, app.billingCity, app.billingParish, app.billingZip) ?? app.location} />
          <Field label="Shipping address" value={shipping ?? "Same as billing"} />

          <p className={`${dl} mt-5`}>Principal contact</p>
          <p className="mt-1 font-semibold">{app.contactName}{app.principalTitle ? <span className="font-normal text-mec-ink/60"> · {app.principalTitle}</span> : null}</p>
          <p className="text-mec-ink/70"><a href={`mailto:${app.email}`} className="hover:text-mec-red">{app.email}</a> · {app.phone}</p>
          {app.accountingName && (
            <>
              <p className={`${dl} mt-4`}>Accounting contact</p>
              <p className="mt-1 font-semibold">{app.accountingName}</p>
              <p className="text-mec-ink/70">{[app.accountingEmail, app.accountingPhone].filter(Boolean).join(" · ")}</p>
            </>
          )}
          {app.notes && (<><p className={`${dl} mt-4`}>Notes</p><p className="mt-1 whitespace-pre-line text-mec-ink/80">{app.notes}</p></>)}
          {app.status === APPLICATION_STATUS.SUBMITTED && app.decisionNote && (
            <><p className={`${dl} mt-4`}>Internal note</p><p className="mt-1 whitespace-pre-line text-mec-ink/80">{app.decisionNote}</p></>
          )}
          <p className={`${dl} mt-4`}>Submitted</p>
          <p className="mt-1 text-mec-ink/70">{formatDate(app.createdAt)}</p>
        </div>

        <div className="rounded-md border border-black/10 bg-mec-pure p-5 text-sm">
          <p className={dl}>Quote request #{app.inquiry.id}</p>
          <ul className="mt-2 space-y-1 text-mec-ink/80">
            {app.inquiry.items.map((it) => (<li key={it.id}>{it.quantity} × {it.productName}</li>))}
          </ul>
          {app.inquiry.message && <p className="mt-3 whitespace-pre-line text-mec-ink/70">{app.inquiry.message}</p>}
          {hint && (
            <p className={`mt-4 rounded-sm px-3 py-2 text-xs ${hint.status === "POTENTIAL_MATCH" ? "bg-mec-red/10 text-mec-red" : "bg-mec-mist text-mec-ink/60"}`}>
              {hint.status === "POTENTIAL_MATCH"
                ? "Heads up: these details now match an existing portal record. Check Customers before creating an account to avoid a duplicate."
                : "No existing portal record matches these details."}
            </p>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-8"><ApplicationDecisionForms id={app.id} /></div>
      )}

      {!open && !awaitingSetup && (
        <div className="mt-8 rounded-md border border-black/10 bg-mec-pure p-5 text-sm">
          <p className={dl}>Decision</p>
          <p className="mt-1 font-semibold">
            {app.status === APPLICATION_STATUS.REJECTED ? "Rejected" : "Approved"}
            {app.decidedAt ? ` · ${formatDate(app.decidedAt)}` : ""}{app.decidedBy ? ` · by ${app.decidedBy.name}` : ""}
          </p>
          {app.status === APPLICATION_STATUS.ACCOUNT_CREATED && (
            <p className="mt-1 font-semibold">
              Account created{app.accountCreatedAt ? ` · ${formatDate(app.accountCreatedAt)}` : ""}{app.accountCreatedBy ? ` · by ${app.accountCreatedBy.name}` : ""}
            </p>
          )}
          {app.decisionNote && app.status === APPLICATION_STATUS.REJECTED && <p className="mt-2 whitespace-pre-line text-mec-ink/80">{app.decisionNote}</p>}
          {app.company && (
            <p className="mt-2 text-mec-ink/70">
              Company: <Link href={`/portal/customers/${app.company.id}`} className="font-semibold text-mec-red hover:underline">{app.company.name}</Link>
              {app.company.mecAccountNumber ? ` · Account ${app.company.mecAccountNumber}` : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update the dashboards**

`ArDashboard.tsx` — replace the `Promise.all` and `cards`:

```tsx
  const [submitted, infoRequested, awaitingSetup, decided] = await Promise.all([
    db.customerApplication.count({ where: { status: APPLICATION_STATUS.SUBMITTED } }),
    db.customerApplication.count({ where: { status: APPLICATION_STATUS.INFO_REQUESTED } }),
    db.customerApplication.count({ where: { status: APPLICATION_STATUS.APPROVED } }),
    db.customerApplication.count({
      where: {
        status: { in: [APPLICATION_STATUS.ACCOUNT_CREATED, APPLICATION_STATUS.REJECTED] },
        decidedAt: { gte: decidedSince30Days() },
      },
    }),
  ]);
  const cards = [
    { label: "Awaiting review", value: submitted, href: "/portal/applications" },
    { label: "Info requested", value: infoRequested, href: "/portal/applications" },
    { label: "Awaiting account setup", value: awaitingSetup, href: "/portal/applications" },
    { label: "Decided (30 days)", value: decided, href: "/portal/applications" },
  ];
```

If the card grid in that file is `sm:grid-cols-3`, change it to `sm:grid-cols-2 lg:grid-cols-4`.

`AdminDashboard.tsx` — add `APPLICATION_STATUS` to the constants import and:

```tsx
  const [products, categories, newInquiries, accountsToSetUp] = await Promise.all([
    db.product.count(),
    db.category.count(),
    db.inquiry.count({ where: { status: INQUIRY_STATUS.NEW } }),
    db.customerApplication.count({ where: { status: APPLICATION_STATUS.APPROVED } }),
  ]);

  const cards = [
    { label: "Products", value: products, href: "/portal/products" },
    { label: "Categories", value: categories, href: "/portal/categories" },
    { label: "New requests", value: newInquiries, href: "/portal/requests" },
    { label: "Accounts to set up", value: accountsToSetUp, href: "/portal/applications" },
  ];
```

and change the grid class to `grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4`.

- [ ] **Step 5: Verify and commit**

Run: `npx tsc --noEmit && npm run lint`. In the browser as the AR user (`/portal/admins` to create one if needed): approve the Task 3 application → it moves to "Approved — awaiting account setup" with no "Create account" link for AR; the detail page shows the red banner with "Return to review". Click it, confirm, and check the row is back in "Awaiting review" with the internal note shown. Approve again. Sign in as admin → the same row shows "Create account" (target 404s until Task 7), and the dashboard shows "Accounts to set up: 1".

```bash
git add lib/applications.ts "app/portal/(protected)/applications" components/portal/dashboards
git commit -m "feat(portal): awaiting-account-setup queue, expanded application detail, dashboard counts"
```

---

### Task 6: Company form + company actions persist the new fields

**Files:**
- Modify: `components/admin/CompanyForm.tsx` (whole file)
- Modify: `lib/actions/companies.ts` (`companyFields`, `createCompany` non-application path, `updateCompany`)
- Modify: `app/portal/(protected)/customers/[id]/AdminCompanyView.tsx` (the `company={...}` prop)

**Interfaces:**
- Consumes: `AddressFields`, `AddressValues`, `EMPTY_ADDRESS` (Task 2); `CREDIT_TERMS`, `GCT_STATUSES`, `isParish` (Task 1).
- Produces: `CompanyFormData` (all fields, `creditLimit: string | null`), `CompanyForm` props `{ company?, prefill?, applicationId?, salesReps }`, `CompanyPrefill` type; `companyFields(formData)` returning every persisted column; hidden field name `applicationId` (consumed in Task 7).

- [ ] **Step 1: Rewrite `components/admin/CompanyForm.tsx`**

```tsx
"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createCompany,
  updateCompany,
  type CompanyActionState,
} from "@/lib/actions/companies";
import { INDUSTRIES } from "@/lib/industries";
import { CREDIT_TERMS, GCT_STATUSES } from "@/lib/constants";
import { AddressFields, EMPTY_ADDRESS, type AddressValues } from "@/components/forms/AddressFields";

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label =
  "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";
const legend = "px-1 text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";
const fieldset = "space-y-4 rounded-md border border-black/10 p-4";

export type CompanyFormData = {
  id: number;
  name: string;
  mecAccountNumber: string | null;
  industry: string | null;
  location: string | null;
  salesRepId: number | null;
  businessType: string | null;
  inBusinessSince: string | null;
  trn: string | null;
  taxExemptionNumber: string | null;
  billing: AddressValues;
  /** null = same as billing */
  shipping: AddressValues | null;
  accountingName: string | null;
  accountingPhone: string | null;
  accountingEmail: string | null;
  sector: string | null;
  creditTerms: string | null;
  /** Decimal serialised as a string for the client boundary. */
  creditLimit: string | null;
  gctStatus: string | null;
};

/** Create-mode prefill (from an approved application). */
export type CompanyPrefill = Omit<CompanyFormData, "id" | "salesRepId" | "mecAccountNumber" | "sector" | "creditTerms" | "creditLimit" | "gctStatus"> & {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
};

export type SalesRepOption = { id: number; name: string };

/**
 * Admin form to create or edit a customer company (the account). On create it
 * can optionally provision + invite the company's first portal user — that
 * user sets their own password via the emailed invite. When `applicationId`
 * is set the form is creating the account for an approved New Customer Form:
 * the principal is required and their email is fixed.
 */
export function CompanyForm({
  company,
  prefill,
  applicationId,
  salesReps,
}: {
  company?: CompanyFormData;
  prefill?: CompanyPrefill;
  applicationId?: number;
  salesReps: SalesRepOption[];
}) {
  const editing = Boolean(company);
  const fromApplication = applicationId !== undefined;
  const v = company ?? prefill;
  const [state, formAction, pending] = useActionState<
    CompanyActionState,
    FormData
  >(editing ? updateCompany : createCompany, {});
  const [sameAsBilling, setSameAsBilling] = useState((v?.shipping ?? null) === null);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {company && <input type="hidden" name="id" value={company.id} />}
      {fromApplication && <input type="hidden" name="applicationId" value={applicationId} />}

      <fieldset className={fieldset}>
        <legend className={legend}>Business</legend>
        <label className={label}>
          Company name
          <input name="name" required defaultValue={v?.name} className={field} />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>
            Industry
            <select name="industry" defaultValue={v?.industry ?? ""} className={field}>
              <option value="">— Select —</option>
              {v?.industry && !(INDUSTRIES as readonly string[]).includes(v.industry) && (
                <option value={v.industry}>{v.industry} (legacy)</option>
              )}
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            Type of business
            <input name="businessType" defaultValue={v?.businessType ?? ""} className={field} />
          </label>
          <label className={label}>
            Sector
            <input name="sector" defaultValue={company?.sector ?? ""} className={field} />
          </label>
          <label className={label}>
            In business since
            <input name="inBusinessSince" defaultValue={v?.inBusinessSince ?? ""} className={field} />
          </label>
          <label className={label}>
            TRN
            <input name="trn" defaultValue={v?.trn ?? ""} className={field} />
          </label>
          <label className={label}>
            Tax exemption number
            <input name="taxExemptionNumber" defaultValue={v?.taxExemptionNumber ?? ""} className={field} />
          </label>
        </div>
        <label className={label}>
          Location
          <input name="location" defaultValue={v?.location ?? ""} className={field} />
        </label>
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>Billing address</legend>
        <AddressFields prefix="billing" values={v?.billing ?? EMPTY_ADDRESS} required={false} inputClass={field} labelClass={label} />
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>Shipping address</legend>
        <label className="flex items-center gap-2 text-sm text-mec-ink/80">
          <input type="checkbox" name="shippingSame" checked={sameAsBilling} onChange={(e) => setSameAsBilling(e.target.checked)} className="h-4 w-4 accent-mec-red" />
          Same as billing address
        </label>
        {!sameAsBilling && (
          <AddressFields prefix="shipping" values={v?.shipping ?? EMPTY_ADDRESS} required={false} inputClass={field} labelClass={label} />
        )}
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>Accounting contact</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className={label}>
            Name
            <input name="accountingName" defaultValue={v?.accountingName ?? ""} className={field} />
          </label>
          <label className={label}>
            Tel.
            <input name="accountingPhone" type="tel" defaultValue={v?.accountingPhone ?? ""} className={field} />
          </label>
          <label className={label}>
            Email
            <input name="accountingEmail" type="email" defaultValue={v?.accountingEmail ?? ""} className={field} />
          </label>
        </div>
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>Account terms</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>
            MEC account number
            <input
              name="mecAccountNumber"
              autoFocus={fromApplication}
              defaultValue={company?.mecAccountNumber ?? ""}
              className={field}
            />
          </label>
          <label className={label}>
            Sales rep
            <select name="salesRepId" defaultValue={company?.salesRepId ?? ""} className={field}>
              <option value="">Unassigned</option>
              {salesReps.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            Credit terms
            <select name="creditTerms" defaultValue={company?.creditTerms ?? ""} className={field}>
              <option value="">— Select —</option>
              {company?.creditTerms && !(CREDIT_TERMS as readonly string[]).includes(company.creditTerms) && (
                <option value={company.creditTerms}>{company.creditTerms} (legacy)</option>
              )}
              {CREDIT_TERMS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            Credit limit (JMD)
            <input name="creditLimit" type="number" min={0} step="0.01" defaultValue={company?.creditLimit ?? "0"} className={field} />
          </label>
          <label className={label}>
            GCT status
            <select name="gctStatus" defaultValue={company?.gctStatus ?? ""} className={field}>
              <option value="">— Select —</option>
              {GCT_STATUSES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      {!editing && (
        <fieldset className={`${fieldset} bg-mec-mist/40`}>
          <legend className={legend}>
            {fromApplication ? "Principal contact (first portal user)" : "First portal user (optional)"}
          </legend>
          <label className={label}>
            Contact name
            <input name="contactName" required={fromApplication} defaultValue={prefill?.contactName ?? ""} className={field} />
          </label>
          <label className={label}>
            Email
            <input name="contactEmail" type="email" required={fromApplication} readOnly={fromApplication} defaultValue={prefill?.contactEmail ?? ""} className={`${field} ${fromApplication ? "bg-mec-mist/60" : ""}`} />
          </label>
          <label className={label}>
            Phone
            <input name="contactPhone" type="tel" defaultValue={prefill?.contactPhone ?? ""} className={field} />
          </label>
          <p className="text-xs text-mec-ink/55">
            {fromApplication
              ? "The principal will be invited to set their password when you save. To use a different login email, add a user from the company page afterwards."
              : "If an email is provided, they'll receive an invite to set their own password. More users can be added from the company page."}
          </p>
        </fieldset>
      )}

      {state.error && <p className="text-sm text-mec-red">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover disabled:opacity-50"
        >
          {pending
            ? editing ? "Saving…" : "Creating…"
            : editing ? "Save Changes" : fromApplication ? "Create Account & Send Invite" : "Create Company"}
        </button>
        <Link
          href={fromApplication ? `/portal/applications/${applicationId}` : "/portal/customers"}
          className="px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70 hover:text-mec-red"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Expand `companyFields` in `lib/actions/companies.ts`**

Add imports: `import { isParish } from "@/lib/constants";` and keep `Prisma` (already imported). Replace `companyFields` with:

```ts
type CompanyFieldsResult =
  | { ok: true; data: Prisma.CompanyUncheckedCreateInput & { name: string } }
  | { ok: false; error: string };

/** Parse every Company column from the admin form. Shipping is nulled when "same as billing". */
function companyFields(formData: FormData): CompanyFieldsResult {
  const opt = (key: string) => str(formData, key) || null;
  const acct = str(formData, "mecAccountNumber");
  const shippingSame = formData.get("shippingSame") === "on";

  const billingParish = opt("billingParish");
  const shippingParish = shippingSame ? null : opt("shippingParish");
  if (billingParish && !isParish(billingParish)) return { ok: false, error: "Invalid billing parish." };
  if (shippingParish && !isParish(shippingParish)) return { ok: false, error: "Invalid shipping parish." };

  const limitRaw = str(formData, "creditLimit");
  let creditLimit: Prisma.Decimal | null = null;
  if (limitRaw) {
    const n = Number(limitRaw);
    if (!Number.isFinite(n)) return { ok: false, error: "Credit limit must be a number." };
    if (n < 0) return { ok: false, error: "Credit limit cannot be negative." };
    creditLimit = new Prisma.Decimal(limitRaw);
  }

  return {
    ok: true,
    data: {
      name: str(formData, "name"),
      mecAccountNumber: acct ? normalizeAccountNumber(acct) || null : null,
      industry: opt("industry"),
      location: opt("location"),
      businessType: opt("businessType"),
      inBusinessSince: opt("inBusinessSince"),
      trn: opt("trn"),
      taxExemptionNumber: opt("taxExemptionNumber"),
      billingStreet: opt("billingStreet"),
      billingCity: opt("billingCity"),
      billingParish,
      billingZip: opt("billingZip"),
      shippingStreet: shippingSame ? null : opt("shippingStreet"),
      shippingCity: shippingSame ? null : opt("shippingCity"),
      shippingParish,
      shippingZip: shippingSame ? null : opt("shippingZip"),
      accountingName: opt("accountingName"),
      accountingPhone: opt("accountingPhone"),
      accountingEmail: str(formData, "accountingEmail").toLowerCase() || null,
      sector: opt("sector"),
      creditTerms: opt("creditTerms"),
      creditLimit,
      gctStatus: opt("gctStatus"),
    },
  };
}
```

In `createCompany`, replace `const fields = companyFields(formData);` and the name check with:

```ts
  const parsed = companyFields(formData);
  if (!parsed.ok) return { error: parsed.error };
  const fields = parsed.data;
```

(and keep `if (!fields.name) return { error: "Company name is required." };`). Do the same in `updateCompany`. The `db.company.create({ data: { ...fields, salesRepId } })` and `db.company.update(...)` calls stay as they are.

- [ ] **Step 3: Add a `toCompanyFormData` helper and use it in `AdminCompanyView.tsx`**

At the bottom of `components/admin/CompanyForm.tsx` add nothing (it is a client file). Instead create `lib/company-form.ts`:

```ts
import type { Company } from "@prisma/client";
import type { CompanyFormData } from "@/components/admin/CompanyForm";

/** Serialise a Company row for the client-side CompanyForm (Decimal → string). */
export function toCompanyFormData(c: Company): CompanyFormData {
  const hasShipping = Boolean(c.shippingStreet || c.shippingCity || c.shippingParish || c.shippingZip);
  return {
    id: c.id,
    name: c.name,
    mecAccountNumber: c.mecAccountNumber,
    industry: c.industry,
    location: c.location,
    salesRepId: c.salesRepId,
    businessType: c.businessType,
    inBusinessSince: c.inBusinessSince,
    trn: c.trn,
    taxExemptionNumber: c.taxExemptionNumber,
    billing: { street: c.billingStreet ?? "", city: c.billingCity ?? "", parish: c.billingParish ?? "", zip: c.billingZip ?? "" },
    shipping: hasShipping
      ? { street: c.shippingStreet ?? "", city: c.shippingCity ?? "", parish: c.shippingParish ?? "", zip: c.shippingZip ?? "" }
      : null,
    accountingName: c.accountingName,
    accountingPhone: c.accountingPhone,
    accountingEmail: c.accountingEmail,
    sector: c.sector,
    creditTerms: c.creditTerms,
    creditLimit: c.creditLimit === null ? null : c.creditLimit.toString(),
    gctStatus: c.gctStatus,
  };
}
```

In `AdminCompanyView.tsx` import it and replace the `company={{ id: ..., salesRepId: company.salesRepId }}` object with `company={toCompanyFormData(company)}`.

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit && npm run lint`. As admin: open an existing company at `/portal/customers/<id>`, confirm the five fieldsets render with blanks and "Same as billing" checked, set credit terms Net 30, limit 250000, GCT Registered, a billing address, save, reload and confirm persistence. Create a company manually at `/portal/customers/new` without an application and confirm it still works (no `applicationId`, optional first user).

```bash
git add components/admin/CompanyForm.tsx lib/actions/companies.ts lib/company-form.ts "app/portal/(protected)/customers/[id]/AdminCompanyView.tsx"
git commit -m "feat(customers): company form captures paper-form fields and account terms"
```

---

### Task 7: Admin creates the account from an approved application

**Files:**
- Modify: `lib/actions/companies.ts` (`createCompany` application branch)
- Modify: `app/portal/(protected)/customers/new/page.tsx` (whole file)
- Modify: `app/portal/(protected)/customers/[id]/AdminCompanyView.tsx` (link back to application)
- Modify: `lib/email/send-account-invite.tsx`, `emails/account-invite.tsx`

**Interfaces:**
- Consumes: `CompanyForm` `prefill`/`applicationId` props and `CompanyPrefill` (Task 6); `getApplicationById` (Task 5); `APPLICATION_STATUS.ACCOUNT_CREATED`, `MATCH_STATUS`.
- Produces: nothing new for later tasks.

- [ ] **Step 1: Add the application branch to `createCompany`**

Add imports to `lib/actions/companies.ts`:

```ts
import { after } from "next/server";
import { getPortalSession } from "@/lib/portal";
import { APPLICATION_STATUS, MATCH_STATUS } from "@/lib/constants";
import { sendInquiryEmails } from "@/lib/email/send-inquiry-emails";
```

Inside `createCompany`, immediately after `if (!fields.name) return { error: "Company name is required." };`, insert:

```ts
  const applicationIdRaw = str(formData, "applicationId");
  if (applicationIdRaw) {
    const applicationId = Number(applicationIdRaw);
    if (!Number.isInteger(applicationId)) return { error: "Invalid application." };
    return createCompanyFromApplication(applicationId, fields, salesRepId, {
      contactName: str(formData, "contactName"),
      contactEmail: str(formData, "contactEmail").toLowerCase(),
      contactPhone: str(formData, "contactPhone"),
    });
  }
```

Then add this function below `createCompany`:

```ts
/**
 * Second step of the two-step approval: an admin turns an APPROVED application
 * into a Company + invited principal, and links the original quote. Ordered
 * writes with compensating deletes — no dangling company or user on failure.
 * Caller has already run requireAdmin() and parsed the form.
 */
async function createCompanyFromApplication(
  applicationId: number,
  fields: Prisma.CompanyUncheckedCreateInput & { name: string },
  salesRepId: number | null,
  contact: { contactName: string; contactEmail: string; contactPhone: string },
): Promise<CompanyActionState> {
  const session = await getPortalSession();
  const app = await db.customerApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, status: true, companyId: true, inquiryId: true, email: true },
  });
  if (!app || app.status !== APPLICATION_STATUS.APPROVED || app.companyId !== null)
    return { error: "This application is no longer awaiting account setup." };
  if (!contact.contactName) return { error: "Principal contact name is required." };
  if (contact.contactEmail !== app.email)
    return { error: "The principal's email must match the application. Add other users from the company page afterwards." };

  const existingUser = await db.user.findUnique({ where: { email: app.email }, select: { id: true } });
  if (existingUser)
    return { error: "An account with this email already exists — link it from Customers instead." };

  let company;
  try {
    company = await db.company.create({ data: { ...fields, salesRepId } });
  } catch (e) {
    if (isUniqueViolation(e))
      return { error: "Another company already uses that MEC account number." };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003")
      return { error: "Selected sales rep no longer exists." };
    throw e;
  }

  const provisioned = await provisionUser({
    email: app.email,
    name: contact.contactName,
    role: "customer",
    redirectTo: INVITE_REDIRECT.customer,
    data: { phone: contact.contactPhone || undefined },
    skipInvite: true,
  });
  if (!provisioned.ok) {
    await db.company.delete({ where: { id: company.id } }).catch((e) =>
      console.error(`[companies] failed to roll back company ${company.id}:`, e),
    );
    return { error: provisioned.error };
  }
  const userId = provisioned.userId;

  const rollback = async () => {
    await db.user.delete({ where: { id: userId } }).catch((e) =>
      console.error(`[companies] failed to roll back user ${userId}:`, e),
    );
    await db.company.delete({ where: { id: company.id } }).catch((e) =>
      console.error(`[companies] failed to roll back company ${company.id}:`, e),
    );
  };

  try {
    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { companyId: company.id } }),
      db.inquiry.update({
        where: { id: app.inquiryId },
        data: { companyId: company.id, userId, matchStatus: MATCH_STATUS.VERIFIED, matchedCompanyId: null },
      }),
      // Status-guarded: a concurrent create/revert leaves count 0; re-read below catches it.
      db.customerApplication.updateMany({
        where: { id: applicationId, status: APPLICATION_STATUS.APPROVED, companyId: null },
        data: {
          status: APPLICATION_STATUS.ACCOUNT_CREATED,
          companyId: company.id,
          userId,
          accountCreatedAt: new Date(),
          accountCreatedByUserId: session?.user.id ?? null,
        },
      }),
    ]);
  } catch (e) {
    console.error(`[companies] account creation failed for application ${applicationId}:`, e);
    await rollback();
    return { error: "Creating the account failed while linking the quote — nothing was created. Please try again." };
  }

  const done = await db.customerApplication.findUnique({ where: { id: applicationId }, select: { status: true, companyId: true } });
  if (done?.status !== APPLICATION_STATUS.ACCOUNT_CREATED || done.companyId !== company.id) {
    await rollback();
    return { error: "This application was handled by someone else moments ago." };
  }

  // Application is ACCOUNT_CREATED + linked, so the invite hook picks the "approved" copy.
  await sendInvite(app.email, INVITE_REDIRECT.customer);
  after(() => sendInquiryEmails(app.inquiryId, { verifiedNow: true }));

  revalidatePath("/portal/customers");
  revalidatePath("/portal/applications");
  revalidatePath(`/portal/applications/${applicationId}`);
  revalidatePath("/portal/requests");
  revalidatePath("/portal");
  redirect(`/portal/customers/${company.id}`);
}
```

Note: `redirect()` throws internally; it must not be inside the `try` above (it is not).

- [ ] **Step 2: Rewrite `app/portal/(protected)/customers/new/page.tsx`**

```tsx
import Link from "next/link";
import { CompanyForm, type CompanyPrefill } from "@/components/admin/CompanyForm";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/portal";
import { getApplicationById } from "@/lib/applications";
import { APPLICATION_STATUS } from "@/lib/constants";

export default async function NewCompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ application?: string | string[] }>;
}) {
  await requireAdminSession();
  const { application } = await searchParams;
  const applicationId = typeof application === "string" ? Number(application) : NaN;
  const app = Number.isInteger(applicationId) ? await getApplicationById(applicationId) : null;

  const salesReps = await db.salesRep.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const back = (
    <Link href="/portal/customers" className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red">
      ← Back to companies
    </Link>
  );

  if (Number.isInteger(applicationId)) {
    if (!app || app.status !== APPLICATION_STATUS.APPROVED || app.companyId !== null) {
      return (
        <div>
          {back}
          <h1 className="mt-4 font-display-tight text-3xl">Not awaiting account setup</h1>
          <p className="mt-2 max-w-xl text-sm text-mec-ink/60">
            This application is not approved, or its account has already been created.
          </p>
          <Link href={app ? `/portal/applications/${app.id}` : "/portal/applications"} className="mt-6 inline-block font-semibold text-mec-red hover:underline">
            {app ? "Open the application" : "Go to applications"}
          </Link>
        </div>
      );
    }

    const hasShipping = Boolean(app.shippingStreet || app.shippingCity || app.shippingParish || app.shippingZip);
    const prefill: CompanyPrefill = {
      name: app.companyName,
      industry: app.industry,
      location: app.location,
      businessType: app.businessType,
      inBusinessSince: app.inBusinessSince,
      trn: app.trn,
      taxExemptionNumber: app.taxExemptionNumber,
      billing: { street: app.billingStreet ?? "", city: app.billingCity ?? "", parish: app.billingParish ?? "", zip: app.billingZip ?? "" },
      shipping: hasShipping
        ? { street: app.shippingStreet ?? "", city: app.shippingCity ?? "", parish: app.shippingParish ?? "", zip: app.shippingZip ?? "" }
        : null,
      accountingName: app.accountingName,
      accountingPhone: app.accountingPhone,
      accountingEmail: app.accountingEmail,
      contactName: app.contactName,
      contactEmail: app.email,
      contactPhone: app.phone,
    };

    return (
      <div>
        <Link href={`/portal/applications/${app.id}`} className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red">
          ← Back to application
        </Link>
        <h1 className="mt-4 font-display-tight text-3xl">Create account for {app.companyName}</h1>
        <p className="mt-2 max-w-xl text-sm text-mec-ink/60">
          Creating the account for application #{app.id}. Everything below is prefilled from the New Customer Form —
          fill in the MEC account number, credit terms, credit limit, GCT status and sales rep. The principal will be
          invited to set their password when you save, and quote #{app.inquiry.id} will be attached to the company.
        </p>
        <div className="mt-8">
          <CompanyForm prefill={prefill} applicationId={app.id} salesReps={salesReps} />
        </div>
      </div>
    );
  }

  return (
    <div>
      {back}
      <h1 className="mt-4 font-display-tight text-3xl">New customer company</h1>
      <p className="mt-2 max-w-xl text-sm text-mec-ink/60">
        Create the company account, assign a sales rep, and optionally invite
        the first portal user — they&apos;ll set their own password by email.
      </p>
      <div className="mt-8">
        <CompanyForm salesReps={salesReps} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Link back from the company page**

In `AdminCompanyView.tsx`, add `applications: { where: { status: "ACCOUNT_CREATED" }, select: { id: true }, take: 1 }` to the `include` of the `findUnique`, and under the intro paragraph render:

```tsx
      {company.applications[0] && (
        <p className="mt-2 text-sm text-mec-ink/60">
          Created from{" "}
          <Link href={`/portal/applications/${company.applications[0].id}`} className="font-semibold text-mec-red hover:underline">
            application #{company.applications[0].id}
          </Link>
        </p>
      )}
```

- [ ] **Step 4: Invite email — key on `ACCOUNT_CREATED`, add the account number**

`lib/email/send-account-invite.tsx`: replace the `approvedApp` lookup with:

```ts
    const approvedApp =
      user.activatedAt === null && user.role === "customer"
        ? await db.customerApplication.findFirst({
            where: { userId, status: "ACCOUNT_CREATED" },
            select: { company: { select: { mecAccountNumber: true } } },
          })
        : null;
```

and pass `accountNumber={approvedApp?.company?.mecAccountNumber ?? null}` to `<AccountInvite …/>`.

`emails/account-invite.tsx`: add `accountNumber?: string | null;` to `AccountInviteProps`, destructure it, and insert after the body `<Text>`:

```tsx
      {variant === "approved" && accountNumber && (
        <Text style={{ color: emailColors.ink, fontSize: 14, fontWeight: 700, margin: "12px 0 0" }}>
          Your MEC account number is {accountNumber}.
        </Text>
      )}
```

- [ ] **Step 5: Verify end to end**

Run: `npx tsc --noEmit && npm run lint`. As admin, from the approved application click "Create account": the form is prefilled, principal email read-only, account-number field focused. Enter account number `MEC-1234`, Net 30, 250000, Registered, pick a rep, save. Expect a redirect to the new company page showing all fields, the "Created from application #N" link, and the principal listed as pending. Console (no `RESEND_API_KEY`) logs the invite skip. `/portal/applications` shows the row under Decided as "Account created"; its detail shows both audit lines and the company link with the account number. `/portal/requests` shows the quote as Verified and attached. Reload `/portal/customers/new?application=<id>` → "Not awaiting account setup".

Negative: in `db:studio` set another application to APPROVED and, in a second tab, open the create form twice; submit both → the second gets "This application was handled by someone else moments ago." and `db:studio` shows exactly one company/user for that email.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/companies.ts "app/portal/(protected)/customers/new/page.tsx" "app/portal/(protected)/customers/[id]/AdminCompanyView.tsx" lib/email/send-account-invite.tsx emails/account-invite.tsx
git commit -m "feat(customers): admin creates the account from an approved application"
```

---

### Task 8: Docs, migration check on a copied DB, full verification

**Files:**
- Modify: `CLAUDE.md` (repo root, "Guest quote funnel" bullet and "Company" bullet)
- Create (throwaway, not committed): `scripts/check-two-step.ts`

- [ ] **Step 1: Update `CLAUDE.md`**

In the "Guest quote funnel" bullet, replace the sentence starting "No-match guests go to `/register?ref=…`" through "…notifies the rep;" with:

```
No-match guests go to `/register?ref=…` (prefilled New Customer Form mirroring MEC's paper form — business/TRN/billing+shipping address/principal/accounting contact → `CustomerApplication`), reviewed at `/portal/applications` by admins and the `ar` role. Approval is two-step: **Approve** (admin or ar) only marks the application `APPROVED` and emails admins; an admin then opens `/portal/customers/new?application=<id>` (prefilled `CompanyForm`), fills the internal fields (MEC account number, credit terms, credit limit, GCT status, sector, sales rep) and saves — `createCompany` creates the `Company`, provisions the principal (approved-copy invite with the account number), links the quote as VERIFIED, and stamps `ACCOUNT_CREATED` + `accountCreatedBy`. An approved-but-not-created application can be returned to review (`revertApplicationApproval`).
```

In the "Company" bullet, after "(name, unique MEC account number, industry, location, sales-rep assignment via `salesRepId`)", append: ", plus the paper-form fields (business type, TRN, tax exemption #, billing/shipping address, accounting contact) and admin-only account terms (sector, credit terms, credit limit, GCT status)".

- [ ] **Step 2: Migration check against a copy of the dev DB**

```bash
cp "$(node -e 'console.log(require("./prisma.config.ts").default?.datasource?.url ?? "")' 2>/dev/null || echo prisma/dev.db)" /tmp/minott-premigration.db 2>/dev/null || true
```

If that copy step is awkward, instead: `git stash` is not needed — simply run against the real dev DB, which Task 1 already migrated. Verify with:

```bash
sqlite3 prisma/dev.db "SELECT id, status, companyId, accountCreatedAt FROM CustomerApplication;"
```

Expected: no row has `status='APPROVED'` together with a non-null `companyId`; every pre-existing approved row reads `ACCOUNT_CREATED` with `accountCreatedAt` populated.

- [ ] **Step 3: Full build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all three succeed. If `next build` complains about `Prisma.Decimal` in a client bundle, the leak is a server row passed to `CompanyForm` without `toCompanyFormData` — fix at the call site.

- [ ] **Step 4: Final click-through (spec §10, step 3)**

With `npm run dev`: guest quote → `/register` → submit (shipping same as billing) → AR approve (no rep select; console shows the "approved" internal email skipped or sent) → applicant status page shows "setting up your account" → admin "Accounts to set up: 1" on the dashboard → Create account → save → company page complete, principal pending, invite "approved" variant → quote Verified in `/portal/requests` → application detail shows both audit lines. Also: AR user does not see "Create account"; public form rejects a missing TRN server-side; manual `/portal/customers/new` still works.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: two-step application approval and expanded customer form"
```
