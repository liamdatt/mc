# Sales Rep Portal & Email-Based Account Onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/sales` rep portal (CRM-lite, quotes only) and replace admin-typed temporary passwords with an emailed, token-gated "set your password" onboarding flow for both customers and reps.

**Architecture:** Reps become better-auth `User`s with `role="rep"` linked one-to-one to their existing `SalesRep` directory record. The onboarding link reuses better-auth's built-in password-reset infrastructure (Approach A): admins provision an account with a random password, then `requestPasswordReset` mints a token and calls our `sendResetPassword` hook, which emails a branded invite. The `/sales` portal mirrors the existing `/portal` conventions (layout-gated session, scoped reads in `lib/sales.ts`, ownership-checked server actions in `lib/actions/sales.ts`).

**Tech Stack:** Next.js 16 (App Router, `proxy.ts`, async `cookies`/`headers`/`params`), React 19, Prisma 7 + SQLite (better-sqlite3 adapter), better-auth 1.6.15 (`admin` plugin, email/password), Resend + React Email, Tailwind v4.

**Testing note:** This repo has **no automated test suite** (per `CLAUDE.md`). Verification per task is `npx tsc --noEmit` (from `minott-web/`), `npm run lint` where UI changed, and a final `npm run build`, plus the manual click-through in Task 10. Every task ends with a commit. **All commands run from `minott-web/`.**

**Suggested agent tiers (for subagent-driven execution):** Tasks 1, 2, 3, 6, 9 are logic/auth-heavy → **Opus**. Tasks 4, 5, 7, 8, 10 are more mechanical UI/wiring → **Sonnet**.

---

## File structure

**Created:**
- `emails/account-invite.tsx` — branded invite/activation React Email template.
- `lib/email/send-account-invite.tsx` — best-effort sender for the invite email.
- `lib/auth/provision.ts` — shared provisioning helper (create user + fire invite + resend).
- `app/set-password/page.tsx` — public token-gated set-password page (server).
- `components/auth/SetPasswordForm.tsx` — client form calling `resetPassword`.
- `lib/sales.ts` — rep-scoped reads + `getSalesSession()` gate helper.
- `lib/actions/sales.ts` — rep mutations (customer profile, quote status, notes).
- `app/sales/sign-in/page.tsx` + `components/sales/SalesSignInForm.tsx` — rep sign-in.
- `app/sales/(protected)/layout.tsx` — rep portal gate + nav.
- `components/sales/SalesSignOutButton.tsx` — rep sign-out.
- `app/sales/(protected)/page.tsx` — dashboard (tiles + latest quotes).
- `app/sales/(protected)/customers/page.tsx` + `[id]/page.tsx` — rep customer list + edit.
- `components/sales/RepCustomerForm.tsx` — rep-editable customer profile form.
- `app/sales/(protected)/quotes/page.tsx` + `[id]/page.tsx` — quote history + detail.
- `components/sales/QuoteStatusForm.tsx` + `components/sales/AddNoteForm.tsx` — quote detail controls.
- `lib/actions/sales-auth.ts` — `salesSignOut` server action.

**Modified:**
- `prisma/schema.prisma` — `SalesRep.userId`+email-required, `User.activatedAt`, `InquiryNote`.
- `lib/auth/portal.ts` — `sendResetPassword`, `resetPasswordTokenExpiresIn`, `onPasswordReset`.
- `lib/auth/portal-client.ts` — export `resetPassword`.
- `lib/actions/customers.ts` — drop temp/new password; invite on create; keep resend.
- `lib/actions/admin-sales-reps.ts` — provision rep user + invite; require email.
- `lib/portal.ts` — `getPortalUsers()` include `activatedAt`.
- `components/admin/CustomerForm.tsx` — remove password field; show pending badge on edit.
- `components/admin/SalesRepForm.tsx` — email required; helper copy.
- `app/admin/(protected)/customers/page.tsx` + `[id]/page.tsx` — status column + resend/badge.
- `app/admin/(protected)/sales-reps/page.tsx` + `[id]/edit/page.tsx` — status column + resend/badge.
- `components/admin/ResendInviteButton.tsx` (new, but grouped here) — shared resend control.
- `app/portal/(protected)/layout.tsx` — bounce reps to `/sales`.
- `components/layout/PublicChrome.tsx` — hide public chrome under `/sales`.
- `app/admin/(protected)/requests/page.tsx` — show `InquiryNote` threads read-only.
- `CLAUDE.md` — document the portal + onboarding in "Known open items".

---

## Task 1: Data model — schema, migration, backfill

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_sales_portal_onboarding/migration.sql` (generated, then edited)

- [ ] **Step 1: Edit `SalesRep` model** — make `email` required, add the login link.

Replace the `SalesRep` model (currently `prisma/schema.prisma:103-112`) with:

```prisma
model SalesRep {
  id        Int      @id @default(autoincrement())
  name      String
  email     String
  phone     String?
  active    Boolean  @default(true)
  clients   User[]   @relation("ClientRep")
  // The rep's own portal login (BetterAuth User with role="rep"). One-to-one.
  userId    String?  @unique
  user      User?    @relation("RepAccount", fields: [userId], references: [id], onDelete: SetNull)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Edit `User` model** — name the existing customer→rep relation, add the rep-account back-relation and `activatedAt`.

In the `User` model (`prisma/schema.prisma:120-144`), change the `salesRep` relation line and add two lines. The relation field currently reads:

```prisma
  salesRep      SalesRep? @relation(fields: [salesRepId], references: [id], onDelete: SetNull)
  salesRepId    Int?
```

Replace with (note the named relation `"ClientRep"` matching Step 1, plus the new back-relation + column):

```prisma
  salesRep      SalesRep? @relation("ClientRep", fields: [salesRepId], references: [id], onDelete: SetNull)
  salesRepId    Int?
  // If this user IS a sales rep, the SalesRep record they log in as.
  repAccount    SalesRep? @relation("RepAccount")
  // Null until the invitee sets their password; stamped on first password set.
  activatedAt   DateTime?
```

- [ ] **Step 3: Add the `InquiryNote` model** — append after the `InquiryItem` model (`prisma/schema.prisma:101`).

```prisma
model InquiryNote {
  id          Int      @id @default(autoincrement())
  inquiry     Inquiry  @relation(fields: [inquiryId], references: [id], onDelete: Cascade)
  inquiryId   Int
  body        String
  authorLabel String
  createdAt   DateTime @default(now())

  @@index([inquiryId])
}
```

- [ ] **Step 4: Add the `notes` back-relation to `Inquiry`** — inside the `Inquiry` model (`prisma/schema.prisma:72-89`), add one line just after the `items InquiryItem[]` line:

```prisma
  notes     InquiryNote[]
```

- [ ] **Step 5: Generate the migration WITHOUT applying it**

Run: `npx prisma migrate dev --create-only --name sales_portal_onboarding`
Expected: prints "The following migration(s) have been created" and a path under `prisma/migrations/`. It does NOT apply yet. (If it errors that the schema is invalid, fix the schema first.)

- [ ] **Step 6: Edit the generated `migration.sql` to backfill before the NOT-NULL rebuild**

Open the new `prisma/migrations/<timestamp>_sales_portal_onboarding/migration.sql`. Because `SalesRep.email` becomes `NOT NULL`, Prisma emits a table-rebuild (`CREATE TABLE "new_SalesRep" ... INSERT INTO "new_SalesRep" SELECT ... FROM "SalesRep"`). Any existing rep row with a NULL/blank email would fail the copy. **At the very top of the file, before any other statement**, add:

```sql
-- Backfill: reps must have an email before the NOT NULL constraint applies.
UPDATE "SalesRep" SET "email" = 'rep-' || "id" || '@placeholder.invalid'
WHERE "email" IS NULL OR trim("email") = '';
```

Then, **at the very bottom of the file** (after the `user` table rebuild that adds `activatedAt`), add — DateTime is stored as RFC3339 TEXT in this DB, so a `strftime` literal is safe and Prisma-readable:

```sql
-- Backfill: existing users are already active (they have real passwords),
-- so they must not show as "Pending". New invitees are created with NULL.
UPDATE "user" SET "activatedAt" = strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE "activatedAt" IS NULL;
```

- [ ] **Step 7: Apply the migration + regenerate the client**

Run: `npx prisma migrate dev`
Expected: "Applying migration ...", then "Your database is now in sync with your schema" and "Generated Prisma Client". No errors.

- [ ] **Step 8: Verify the backfill + typecheck**

Run:
```bash
node -e 'const D=require("better-sqlite3");const db=new D("prisma/app.db",{readonly:true});console.log("users pending:",db.prepare("SELECT count(*) c FROM \"user\" WHERE activatedAt IS NULL").get().c);console.log("reps no-email:",db.prepare("SELECT count(*) c FROM \"SalesRep\" WHERE email IS NULL").get().c);'
npx tsc --noEmit
```
Expected: `users pending: 0`, `reps no-email: 0`, and `tsc` exits clean (0 errors).

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): rep login link, user activatedAt, InquiryNote model"
```

---

## Task 2: better-auth invite/reset infrastructure + invite email

**Files:**
- Create: `emails/account-invite.tsx`
- Create: `lib/email/send-account-invite.tsx`
- Modify: `lib/auth/portal.ts`
- Modify: `lib/auth/portal-client.ts`

- [ ] **Step 1: Create the invite email template** — `emails/account-invite.tsx`

```tsx
import { Button, Heading, Hr, Text } from "@react-email/components";
import { EmailLayout, emailColors } from "./components/EmailLayout";

export type AccountInviteProps = {
  /** Recipient's display name. */
  name: string;
  /** The tokened set-password link (BetterAuth reset URL). */
  url: string;
  /** Which portal they're being onboarded to. */
  portal: "customer" | "sales";
  /** First-time activation vs. a later password reset — changes the copy. */
  isInvite: boolean;
};

const COPY = {
  customer: {
    invite: {
      heading: "Activate your Minott account",
      body: "An account has been created for you on the Minott Equipment & Chemicals customer portal, where you can track your quote requests and order history. Set your password to get started.",
      cta: "Set your password",
    },
    reset: {
      heading: "Reset your Minott password",
      body: "We received a request to reset the password for your Minott customer portal account. Choose a new password below.",
      cta: "Choose a new password",
    },
  },
  sales: {
    invite: {
      heading: "Set up your MEC sales portal access",
      body: "You've been added as a sales representative for Minott Equipment & Chemicals. Set your password to access your sales portal, where you can see your customers and their quotes.",
      cta: "Set your password",
    },
    reset: {
      heading: "Reset your sales portal password",
      body: "We received a request to reset the password for your MEC sales portal account. Choose a new password below.",
      cta: "Choose a new password",
    },
  },
} as const;

export function AccountInvite({ name, url, portal, isInvite }: AccountInviteProps) {
  const copy = COPY[portal][isInvite ? "invite" : "reset"];
  return (
    <EmailLayout preview={copy.heading}>
      <Heading as="h1" style={{ color: emailColors.ink, fontSize: 22, margin: "0 0 8px" }}>
        {copy.heading}
      </Heading>
      <Text style={{ color: emailColors.graphite, fontSize: 14, margin: 0 }}>
        Hi {name}, {copy.body}
      </Text>
      <Button
        href={url}
        style={{
          backgroundColor: emailColors.red,
          borderRadius: 4,
          color: emailColors.pure,
          display: "inline-block",
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "0.08em",
          margin: "24px 0",
          padding: "12px 28px",
          textDecoration: "none",
          textTransform: "uppercase",
        }}
      >
        {copy.cta}
      </Button>
      <Hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "20px 0" }} />
      <Text style={{ color: emailColors.graphite, fontSize: 13, margin: 0 }}>
        This link expires in 72 hours. If it lapses, ask a MEC administrator to
        resend your invitation. If you weren&apos;t expecting this email, you can
        safely ignore it.
      </Text>
    </EmailLayout>
  );
}
```

- [ ] **Step 2: Create the invite sender** — `lib/email/send-account-invite.tsx`. Re-fetches the user so copy adapts to role (`rep` → sales portal) and activation state.

```tsx
import { getResend } from "@/lib/email/resend";
import { getEmailSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { AccountInvite } from "@/emails/account-invite";

/**
 * Best-effort invite/reset email, called from BetterAuth's `sendResetPassword`
 * hook. Must never throw — provisioning succeeds even if email is unconfigured.
 * `url` is the BetterAuth reset URL (points at /api/auth/reset-password/:token
 * and redirects to our /set-password page with the token appended).
 */
export async function sendAccountInvite(
  userId: string,
  url: string,
): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) {
      console.warn(`[email] RESEND_API_KEY unset — skipping invite for user ${userId}`);
      return;
    }
    const settings = await getEmailSettings();
    if (!settings.fromEmail) {
      console.warn(`[email] fromEmail not configured — skipping invite for user ${userId}`);
      return;
    }
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, role: true, activatedAt: true },
    });
    if (!user) {
      console.error(`[email] user ${userId} not found — skipping invite`);
      return;
    }

    const portal = user.role === "rep" ? "sales" : "customer";
    const isInvite = user.activatedAt === null;
    const from = settings.fromName
      ? `${settings.fromName} <${settings.fromEmail}>`
      : settings.fromEmail;

    const { error } = await resend.emails.send({
      from,
      to: [user.email],
      replyTo: settings.generalInboxEmail ?? undefined,
      subject: isInvite
        ? portal === "sales"
          ? "Set up your MEC sales portal access"
          : "Activate your Minott account"
        : "Reset your Minott password",
      react: (
        <AccountInvite name={user.name} url={url} portal={portal} isInvite={isInvite} />
      ),
    });
    if (error) console.error(`[email] invite failed for user ${userId}:`, error);
  } catch (e) {
    console.error(`[email] invite threw for user ${userId}:`, e);
  }
}
```

- [ ] **Step 3: Wire the hooks into the portal auth config** — `lib/auth/portal.ts`. Add an import and expand `emailAndPassword`.

Add near the top imports:
```tsx
import { sendAccountInvite } from "@/lib/email/send-account-invite";
```

Replace the `emailAndPassword` block (`lib/auth/portal.ts:30-34`) with:
```tsx
  emailAndPassword: {
    enabled: true,
    // Accounts are provisioned by MEC admins, not self-service.
    disableSignUp: true,
    // Invite/reset links are valid for 72h (covers onboarding lead time).
    resetPasswordTokenExpiresIn: 60 * 60 * 72,
    // Emails the branded invite/reset link. `user.id` + `url` are enough; the
    // sender re-reads role/activation to pick copy. Best-effort (never throws).
    sendResetPassword: async ({ user, url }) => {
      await sendAccountInvite(user.id, url);
    },
    // Fires after a successful password set/reset — marks the account activated
    // so it stops showing as "Pending" and can sign in.
    onPasswordReset: async ({ user }) => {
      await db.user.update({
        where: { id: user.id },
        data: { activatedAt: new Date() },
      });
    },
  },
```

- [ ] **Step 4: Export `resetPassword` from the portal client** — `lib/auth/portal-client.ts`. Change the last line (`lib/auth/portal-client.ts:21`) to add `resetPassword`:

```tsx
export const { signIn, signOut, useSession, getSession, resetPassword } =
  portalAuthClient;
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (0 errors).

- [ ] **Step 6: Commit**

```bash
git add emails/account-invite.tsx lib/email/send-account-invite.tsx lib/auth/portal.ts lib/auth/portal-client.ts
git commit -m "feat(email): branded account-invite template + BetterAuth reset hooks"
```

---

## Task 3: Provisioning helper + refactor customer/rep actions

**Files:**
- Create: `lib/auth/provision.ts`
- Modify: `lib/actions/customers.ts`
- Modify: `lib/actions/admin-sales-reps.ts`

- [ ] **Step 1: Create the provisioning helper** — `lib/auth/provision.ts`. Centralizes create-user, role assignment, and the invite trigger.

```tsx
import { randomBytes } from "crypto";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth/portal";
import { db } from "@/lib/db";

/** A random, never-shared password. The invitee sets their own via email. */
function randomPassword(): string {
  return randomBytes(24).toString("hex");
}

export type ProvisionResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

/**
 * Create a BetterAuth portal user with a random password and send the
 * set-password invite. `role` is applied after creation (the admin plugin's
 * createUser typings only allow "user"|"admin"). `redirectTo` decides which
 * portal the set-password link lands on. Never sets a usable password itself.
 */
export async function provisionUser(opts: {
  email: string;
  name: string;
  role: "customer" | "rep";
  redirectTo: string;
  data?: { companyName?: string; phone?: string; whatsapp?: string };
}): Promise<ProvisionResult> {
  const { email, name, role, redirectTo, data } = opts;
  try {
    await auth.api.createUser({
      body: { email, password: randomPassword(), name, data: data ?? {} },
      // No `headers` — headerless admin escape hatch (see lib/auth/portal.ts).
    });
  } catch (e) {
    if (e instanceof APIError) {
      const msg = e.message || "";
      if (/already exists|existing/i.test(msg))
        return { ok: false, error: "An account with that email already exists." };
      return { ok: false, error: msg || "Could not create the account." };
    }
    throw e;
  }

  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return { ok: false, error: "Account creation did not persist." };

  if (role !== "customer") {
    await db.user.update({ where: { id: user.id }, data: { role } });
  }

  await sendInvite(email, redirectTo);
  return { ok: true, userId: user.id };
}

/**
 * Fire BetterAuth's password-reset flow, which mints a token and calls our
 * `sendResetPassword` hook (the invite email). Used for first invite AND for
 * admin "resend invite". Best-effort — a missing email must not hard-fail the
 * surrounding admin action.
 */
export async function sendInvite(email: string, redirectTo: string): Promise<void> {
  try {
    await auth.api.requestPasswordReset({ body: { email, redirectTo } });
  } catch (e) {
    console.error(`[invite] requestPasswordReset failed for ${email}:`, e);
  }
}

/** Portal-specific set-password landing paths (token is appended by BetterAuth). */
export const INVITE_REDIRECT = {
  customer: "/set-password?portal=customer",
  sales: "/set-password?portal=sales",
} as const;
```

- [ ] **Step 2: Refactor `lib/actions/customers.ts`** — drop the admin-typed password; invite on create; replace password-reset-on-edit with an explicit resend action.

Replace the entire file with:

```tsx
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { provisionUser, sendInvite, INVITE_REDIRECT } from "@/lib/auth/provision";

export type CreateCustomerState = { error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** "" → null (Unassigned); otherwise a positive int or an error sentinel. */
function parseSalesRepId(formData: FormData): number | null | "invalid" {
  const raw = str(formData, "salesRepId");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : "invalid";
}

/**
 * Provision a portal customer from the (password-gated) MEC admin. The customer
 * sets their own password via the emailed invite — no admin-typed credential.
 */
export async function createCustomer(
  _prev: CreateCustomerState,
  formData: FormData,
): Promise<CreateCustomerState> {
  await requireAdmin();

  const email = str(formData, "email").toLowerCase();
  const name = str(formData, "name");
  const companyName = str(formData, "companyName");
  const phone = str(formData, "phone");
  const whatsapp = str(formData, "whatsapp");
  const salesRepId = parseSalesRepId(formData);
  if (salesRepId === "invalid") return { error: "Invalid sales rep." };
  if (!email) return { error: "Email is required." };
  if (!name) return { error: "Contact name is required." };

  const result = await provisionUser({
    email,
    name,
    role: "customer",
    redirectTo: INVITE_REDIRECT.customer,
    data: {
      companyName: companyName || undefined,
      phone: phone || undefined,
      whatsapp: whatsapp || undefined,
    },
  });
  if (!result.ok) return { error: result.error };

  if (salesRepId !== null) {
    try {
      await db.user.update({ where: { email }, data: { salesRepId } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003")
        return {
          error:
            "Customer created & invited, but the selected sales rep no longer exists. Assign one from the customer's edit page.",
        };
      throw e;
    }
  }

  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/**
 * Update a portal customer's profile from the MEC admin. Passwords are no longer
 * set here — use `resendInvite` to send a fresh set-password link instead.
 */
export async function updateCustomer(
  _prev: CreateCustomerState,
  formData: FormData,
): Promise<CreateCustomerState> {
  await requireAdmin();

  const id = str(formData, "id");
  const email = str(formData, "email").toLowerCase();
  const name = str(formData, "name");
  const companyName = str(formData, "companyName");
  const phone = str(formData, "phone");
  const whatsapp = str(formData, "whatsapp");
  const salesRepId = parseSalesRepId(formData);
  if (salesRepId === "invalid") return { error: "Invalid sales rep." };
  if (!id) return { error: "Missing customer id." };
  if (!email) return { error: "Email is required." };
  if (!name) return { error: "Contact name is required." };

  try {
    await db.user.update({
      where: { id },
      data: {
        email,
        name,
        companyName: companyName || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        salesRepId,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e))
      return { error: "Another customer already uses that email." };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025")
      return { error: "Customer not found." };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003")
      return { error: "Selected sales rep no longer exists." };
    throw e;
  }

  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}

export type ResendInviteState = { error?: string; success?: boolean };

/**
 * Re-send the set-password invite to a provisioned user (customer or rep). The
 * redirect portal is derived from the user's role so reps land on /sales.
 */
export async function resendInvite(
  _prev: ResendInviteState,
  formData: FormData,
): Promise<ResendInviteState> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) return { error: "Missing user id." };
  const user = await db.user.findUnique({
    where: { id },
    select: { email: true, role: true },
  });
  if (!user) return { error: "User not found." };
  await sendInvite(
    user.email,
    user.role === "rep" ? INVITE_REDIRECT.sales : INVITE_REDIRECT.customer,
  );
  revalidatePath("/admin/customers");
  revalidatePath("/admin/sales-reps");
  return { success: true };
}
```

- [ ] **Step 3: Refactor `lib/actions/admin-sales-reps.ts`** — require email; on create, provision a rep login + invite and link it; keep delete cleaning up the linked user.

Replace the entire file with:

```tsx
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { provisionUser, INVITE_REDIRECT } from "@/lib/auth/provision";

export type SalesRepFormState = { error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function buildData(formData: FormData) {
  return {
    name: str(formData, "name"),
    email: str(formData, "email").toLowerCase(),
    phone: str(formData, "phone") || null,
    active: formData.get("active") !== null,
  };
}

/**
 * Create a sales rep: a directory record PLUS a portal login (role="rep") that
 * receives a set-password invite. Email is required — it's the invite address.
 */
export async function createSalesRep(
  _prev: SalesRepFormState,
  formData: FormData,
): Promise<SalesRepFormState> {
  await requireAdmin();
  const data = buildData(formData);
  if (!data.name) return { error: "Name is required." };
  if (!data.email) return { error: "Email is required (used to send the portal invite)." };

  const rep = await db.salesRep.create({ data });

  const result = await provisionUser({
    email: data.email,
    name: data.name,
    role: "rep",
    redirectTo: INVITE_REDIRECT.sales,
  });
  if (!result.ok) {
    // Roll back the directory record so the admin can correct and retry cleanly.
    await db.salesRep.delete({ where: { id: rep.id } });
    return { error: result.error };
  }

  await db.salesRep.update({ where: { id: rep.id }, data: { userId: result.userId } });

  revalidatePath("/admin/sales-reps");
  redirect("/admin/sales-reps");
}

export async function updateSalesRep(
  _prev: SalesRepFormState,
  formData: FormData,
): Promise<SalesRepFormState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { error: "Invalid sales rep id." };
  const data = buildData(formData);
  if (!data.name) return { error: "Name is required." };
  if (!data.email) return { error: "Email is required." };

  const existing = await db.salesRep.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!existing) return { error: "Sales rep not found." };

  try {
    await db.salesRep.update({ where: { id }, data });
    // Keep the linked login's name/email in sync with the directory record.
    if (existing.userId) {
      await db.user.update({
        where: { id: existing.userId },
        data: { name: data.name, email: data.email },
      });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025")
      return { error: "Sales rep not found." };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { error: "Another account already uses that email." };
    throw e;
  }
  revalidatePath("/admin/sales-reps");
  revalidatePath("/admin/customers");
  redirect("/admin/sales-reps");
}

/**
 * Delete a rep: removes the directory record AND its login account (their
 * clients are un-assigned via User.salesRepId SetNull; the rep-account FK is
 * SetNull, so we delete the login explicitly).
 */
export async function deleteSalesRep(
  _prev: SalesRepFormState,
  formData: FormData,
): Promise<SalesRepFormState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { error: "Invalid sales rep id." };
  const rep = await db.salesRep.findUnique({
    where: { id },
    select: { userId: true },
  });
  await db.salesRep.delete({ where: { id } });
  if (rep?.userId) {
    // Cascades delete the rep's sessions/accounts too.
    await db.user.delete({ where: { id: rep.userId } }).catch(() => {});
  }
  revalidatePath("/admin/sales-reps");
  revalidatePath("/admin/customers");
  return {};
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. (If `customers.ts` errors about the removed `auth`/`APIError` imports, ensure the whole-file replacement in Step 2 was applied — those imports are gone.)

- [ ] **Step 5: Commit**

```bash
git add lib/auth/provision.ts lib/actions/customers.ts lib/actions/admin-sales-reps.ts
git commit -m "feat(auth): email-invite provisioning for customers + rep logins"
```

---

## Task 4: Set-password page (token-gated)

**Files:**
- Create: `components/auth/SetPasswordForm.tsx`
- Create: `app/set-password/page.tsx`

Note: `proxy.ts`'s matcher is `["/admin/:path*"]`, so `/set-password` is already public — no proxy change needed.

- [ ] **Step 1: Create the client form** — `components/auth/SetPasswordForm.tsx`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { portalAuthClient } from "@/lib/auth/portal-client";

/**
 * Token-gated set-password form. The token comes from the emailed invite link
 * (BetterAuth appends it to our /set-password redirect). Only a valid, unexpired
 * token lets a password be set — that IS the access gate; no session required.
 * On success we route to the correct sign-in based on `portal`.
 */
export function SetPasswordForm({
  token,
  portal,
}: {
  token: string | null;
  portal: "customer" | "sales";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const signInPath = portal === "sales" ? "/sales/sign-in" : "/portal/sign-in";

  if (!token) {
    return (
      <p className="mt-6 rounded-sm border border-mec-red/30 bg-mec-red/5 px-4 py-3 text-sm text-mec-red">
        This link is invalid or has expired. Ask a MEC administrator to resend
        your invitation.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    const { error: authError } = await portalAuthClient.resetPassword({
      newPassword: password,
      token: token!,
    });
    if (authError) {
      setPending(false);
      setError(
        authError.code === "INVALID_TOKEN"
          ? "This link is invalid or has expired. Ask a MEC administrator to resend your invitation."
          : authError.message || "We couldn't set your password. Please try again.",
      );
      return;
    }
    setDone(true);
    setTimeout(() => router.push(signInPath), 1500);
  }

  if (done) {
    return (
      <p className="mt-6 rounded-sm border border-mec-ink/15 bg-mec-mist px-4 py-3 text-sm text-mec-ink">
        Password set. Redirecting you to sign in…
      </p>
    );
  }

  const inputCls =
    "mt-2 w-full rounded-sm border border-mec-ink/20 bg-mec-pure px-4 py-3 text-mec-ink outline-none transition-colors focus:border-mec-red";
  const labelCls =
    "mt-6 block text-xs font-semibold uppercase tracking-[0.16em] text-mec-ink/60 first:mt-0";

  return (
    <form onSubmit={handleSubmit} className="mt-8" noValidate>
      <label htmlFor="password" className={labelCls}>New password</label>
      <input id="password" name="password" type="password" autoComplete="new-password" autoFocus required minLength={8} className={inputCls} />
      <label htmlFor="confirm" className={labelCls}>Confirm password</label>
      <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} className={inputCls} />
      {error && (
        <p role="alert" className="mt-5 rounded-sm border border-mec-red/30 bg-mec-red/5 px-4 py-3 text-sm text-mec-red">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="mt-7 w-full bg-mec-red px-6 py-3.5 font-semibold uppercase tracking-[0.14em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50">
        {pending ? "Setting password…" : "Set password"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create the page** — `app/set-password/page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";

export const metadata: Metadata = {
  title: "Set Your Password | Minott Equipment & Chemicals",
};

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; portal?: string; error?: string }>;
}) {
  const { token, portal, error } = await searchParams;
  const isSales = portal === "sales";
  // BetterAuth redirects here with ?error=INVALID_TOKEN when the link is bad.
  const validToken = error ? null : token ?? null;

  return (
    <section className="grid min-h-[80vh] place-items-center bg-mec-mist px-6 py-[var(--spacing-section-y)] text-mec-ink">
      <div className="w-full max-w-md">
        <div className="rounded-md border border-mec-ink/10 bg-mec-pure p-8 shadow-[0_24px_48px_-12px_rgba(13,13,13,0.08)] md:p-10">
          <Eyebrow>{isSales ? "Sales Portal" : "Customer Portal"}</Eyebrow>
          <h1 className="mt-4 font-display-tight text-4xl leading-none tracking-tight md:text-5xl">
            Set your password
          </h1>
          <p className="mt-3 text-sm text-mec-ink/65">
            Choose a password to activate your Minott Equipment &amp; Chemicals
            account.
          </p>
          <SetPasswordForm token={validToken} portal={isSales ? "sales" : "customer"} />
        </div>
        <p className="mt-6 text-center text-xs text-mec-ink/50">
          <Link href="/" className="hover:text-mec-red">← Back to minottequipment.com</Link>
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/set-password components/auth/SetPasswordForm.tsx
git commit -m "feat(auth): token-gated set-password page for invites"
```

---

## Task 5: Admin UI — remove passwords, add invite status + resend

**Files:**
- Create: `components/admin/ResendInviteButton.tsx`
- Modify: `components/admin/CustomerForm.tsx`
- Modify: `components/admin/SalesRepForm.tsx`
- Modify: `lib/portal.ts`
- Modify: `app/admin/(protected)/customers/page.tsx`
- Modify: `app/admin/(protected)/customers/[id]/page.tsx`
- Modify: `app/admin/(protected)/sales-reps/page.tsx`
- Modify: `app/admin/(protected)/sales-reps/[id]/edit/page.tsx`

- [ ] **Step 1: Shared resend-invite button** — `components/admin/ResendInviteButton.tsx`

```tsx
"use client";

import { useActionState } from "react";
import { resendInvite, type ResendInviteState } from "@/lib/actions/customers";

/**
 * Re-sends the set-password invite for a provisioned user. Shown on the customer
 * and sales-rep edit pages. `userId` is the BetterAuth User id.
 */
export function ResendInviteButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState<ResendInviteState, FormData>(
    resendInvite,
    {},
  );
  return (
    <form action={formAction} className="inline-flex items-center gap-3">
      <input type="hidden" name="id" value={userId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-sm border border-mec-ink/20 px-4 py-2 text-sm font-semibold text-mec-ink/80 transition-colors hover:border-mec-red hover:text-mec-red disabled:opacity-50"
      >
        {pending ? "Sending…" : "Resend invite"}
      </button>
      {state.success && <span className="text-sm text-mec-ink/60">Invite sent.</span>}
      {state.error && <span className="text-sm text-mec-red">{state.error}</span>}
    </form>
  );
}
```

- [ ] **Step 2: Remove the password field from `CustomerForm`** — `components/admin/CustomerForm.tsx`. Delete the entire password `<label>` block (`components/admin/CustomerForm.tsx:71-86`). Also update the doc comment (`:28-35`) to drop the temp-password wording. No other change — the form still posts create/update.

- [ ] **Step 3: `getPortalUsers` — include activation state** — `lib/portal.ts`. In the `select` of `getPortalUsers` (`lib/portal.ts:155-169`), add `activatedAt: true,` (e.g. right after `role: true,`).

- [ ] **Step 4: Customers list — invite status column** — `app/admin/(protected)/customers/page.tsx`. Add a "Status" header after "Sales rep" (after `:40`), a cell rendering the badge, and bump the empty-state `colSpan` from 7 to 8.

Add this cell inside the row map, right after the Sales rep `<td>` (after `:76`):
```tsx
                <td className="px-4 py-3">
                  {c.activatedAt ? (
                    <span className="rounded-pill bg-mec-ink/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/60">
                      active
                    </span>
                  ) : (
                    <span className="rounded-pill bg-mec-red/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-red">
                      pending
                    </span>
                  )}
                </td>
```
Add `<th className="px-4 py-3">Status</th>` after the Sales rep `<th>` (`:40`), and change `colSpan={7}` to `colSpan={8}` (`:51`). Update the intro paragraph (`:27-31`) to say customers are invited by email to set their own password.

- [ ] **Step 5: Customer edit page — badge + resend** — `app/admin/(protected)/customers/[id]/page.tsx`. Add `activatedAt: true` to the `select` (`:14-22`), and render the badge + `ResendInviteButton` above the form. Add the import `import { ResendInviteButton } from "@/components/admin/ResendInviteButton";` and replace the intro paragraph + form wrapper (`:43-49`) with:

```tsx
      <p className="mt-2 max-w-xl text-sm text-mec-ink/60">
        Update {customer.name}&apos;s account details. They set their own password
        via the emailed invite — use “Resend invite” to send a fresh link.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {customer.activatedAt ? (
          <span className="rounded-pill bg-mec-ink/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/60">
            Active
          </span>
        ) : (
          <span className="rounded-pill bg-mec-red/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-mec-red">
            Invite pending
          </span>
        )}
        <ResendInviteButton userId={customer.id} />
      </div>
      <div className="mt-8">
        <CustomerForm customer={customer} salesReps={salesReps} />
      </div>
```

- [ ] **Step 6: `SalesRepForm` — email required + copy** — `components/admin/SalesRepForm.tsx`. On the email `<input>` (`:40-45`) add `required`, and change the "Active" label copy (`:63`) to note it also controls portal access. Add a helper line under the form title area is optional; minimum change is `required` on email:

```tsx
        <input
          name="email"
          type="email"
          required
          defaultValue={rep?.email ?? ""}
          className={field}
        />
```
And change the active label text to: `Active (can sign in to the sales portal & receive new clients)`.

- [ ] **Step 7: Sales-reps list — status column** — `app/admin/(protected)/sales-reps/page.tsx`. Include the login on the query and add a Status column.

Change the query (`:6-9`) to:
```tsx
  const reps = await db.salesRep.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { clients: true } },
      user: { select: { activatedAt: true } },
    },
  });
```
Add `<th className="px-4 py-3">Portal</th>` after the Clients `<th>` (`:36`), bump the empty `colSpan` from 5 to 6 (`:45`), and add this cell after the Clients `<td>` (`:72`):
```tsx
                <td className="px-4 py-3">
                  {!r.user ? (
                    <span className="text-xs text-mec-ink/40">—</span>
                  ) : r.user.activatedAt ? (
                    <span className="rounded-pill bg-mec-ink/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/60">active</span>
                  ) : (
                    <span className="rounded-pill bg-mec-red/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-red">pending</span>
                  )}
                </td>
```

- [ ] **Step 8: Sales-rep edit page — badge + resend** — `app/admin/(protected)/sales-reps/[id]/edit/page.tsx`. Extend the `select` to fetch the linked user, and render the badge + resend. Change the query (`:15-18`) to:
```tsx
  const rep = await db.salesRep.findUnique({
    where: { id: repId },
    select: {
      id: true, name: true, email: true, phone: true, active: true,
      user: { select: { id: true, activatedAt: true } },
    },
  });
```
Add `import { ResendInviteButton } from "@/components/admin/ResendInviteButton";`, and insert before `<div className="mt-8">` (`:30`):
```tsx
      {rep.user && (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {rep.user.activatedAt ? (
            <span className="rounded-pill bg-mec-ink/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/60">Portal active</span>
          ) : (
            <span className="rounded-pill bg-mec-red/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-mec-red">Invite pending</span>
          )}
          <ResendInviteButton userId={rep.user.id} />
        </div>
      )}
```
Note: `SalesRepForm` only consumes `{id,name,email,phone,active}`; passing the extra `user` field to it is fine because it destructures — but to keep types exact, pass `rep={{ id: rep.id, name: rep.name, email: rep.email, phone: rep.phone, active: rep.active }}`.

- [ ] **Step 9: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 10: Commit**

```bash
git add components/admin lib/portal.ts "app/admin/(protected)/customers" "app/admin/(protected)/sales-reps"
git commit -m "feat(admin): invite-based provisioning UI (pending/active + resend)"
```

---

## Task 6: Sales portal reads + auth gate

**Files:**
- Create: `lib/sales.ts`
- Modify: `app/portal/(protected)/layout.tsx`

- [ ] **Step 1: Create `lib/sales.ts`** — the rep session gate + rep-scoped reads.

```tsx
import { db } from "@/lib/db";
import { getPortalSession } from "@/lib/portal";
import type { HistoryFilters } from "@/lib/portal";

/**
 * Sales-portal read module (reads only). `getSalesSession()` is the gate: a
 * valid BetterAuth session whose user has role="rep" AND an active linked
 * SalesRep. Returns the session + the rep record, or null. Every other helper
 * is scoped to a rep id so a rep can only ever see their own book of business.
 */
export async function getSalesSession() {
  const session = await getPortalSession();
  if (!session || session.user.role !== "rep") return null;
  const rep = await db.salesRep.findUnique({
    where: { userId: session.user.id },
    select: { id: true, name: true, email: true, active: true },
  });
  if (!rep || !rep.active) return null;
  return { session, rep };
}

/** A rep's assigned customers (newest first) with their quote counts. */
export function getRepCustomers(repId: number) {
  return db.user.findMany({
    where: { salesRepId: repId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, companyName: true,
      phone: true, whatsapp: true, activatedAt: true, createdAt: true,
      _count: { select: { inquiries: true } },
    },
  });
}

/** One of a rep's customers, or null if not theirs (maps to notFound()). */
export async function getRepCustomerById(repId: number, id: string) {
  const customer = await db.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, companyName: true,
      phone: true, whatsapp: true, salesRepId: true, activatedAt: true,
    },
  });
  if (!customer || customer.salesRepId !== repId) return null;
  return customer;
}

function buildRepQuoteWhere(repId: number, filters: HistoryFilters) {
  const where: import("@prisma/client").Prisma.InquiryWhereInput = {
    type: "QUOTE",
    user: { salesRepId: repId },
  };
  if (filters.status) where.status = filters.status;
  if (filters.from || filters.to) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (filters.from) {
      const d = new Date(`${filters.from}T00:00:00`);
      if (!Number.isNaN(d.getTime())) createdAt.gte = d;
    }
    if (filters.to) {
      const d = new Date(`${filters.to}T23:59:59.999`);
      if (!Number.isNaN(d.getTime())) createdAt.lte = d;
    }
    if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;
  }
  return where;
}

/** A rep's customers' quote inquiries (newest first), filtered. */
export function getRepQuotes(repId: number, filters: HistoryFilters = {}) {
  return db.inquiry.findMany({
    where: buildRepQuoteWhere(repId, filters),
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, companyName: true } },
      items: { include: { variant: true } },
      _count: { select: { items: true } },
    },
  });
}

/** The most recent quotes across a rep's customers, for the dashboard feed. */
export function getLatestRepQuotes(repId: number, take = 8) {
  return db.inquiry.findMany({
    where: { type: "QUOTE", user: { salesRepId: repId } },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      user: { select: { name: true, companyName: true } },
      _count: { select: { items: true } },
    },
  });
}

/** A single quote scoped to the rep, with items + notes, or null if not theirs. */
export async function getRepQuoteById(repId: number, id: number) {
  const quote = await db.inquiry.findUnique({
    where: { id },
    include: {
      user: { select: { salesRepId: true, name: true, email: true, companyName: true, phone: true } },
      items: { include: { product: { include: { category: true } }, variant: true } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!quote || quote.type !== "QUOTE" || quote.user?.salesRepId !== repId) return null;
  return quote;
}

/** Dashboard tile counts for a rep. */
export async function getRepStats(repId: number) {
  const [customers, openQuotes, totalQuotes] = await Promise.all([
    db.user.count({ where: { salesRepId: repId } }),
    db.inquiry.count({
      where: { type: "QUOTE", user: { salesRepId: repId }, status: { not: "CLOSED" } },
    }),
    db.inquiry.count({ where: { type: "QUOTE", user: { salesRepId: repId } } }),
  ]);
  return { customers, openQuotes, totalQuotes };
}
```

- [ ] **Step 2: Bounce reps out of the customer portal** — `app/portal/(protected)/layout.tsx`. After the existing session check (`app/portal/(protected)/layout.tsx:26-27`), add a role redirect:

```tsx
  const session = await getPortalSession();
  if (!session) redirect("/portal/sign-in");
  if (session.user.role === "rep") redirect("/sales");
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add lib/sales.ts "app/portal/(protected)/layout.tsx"
git commit -m "feat(sales): rep-scoped read module + portal role gate"
```

---

## Task 7: Sales sign-in, sign-out, layout gate, chrome

**Files:**
- Create: `lib/actions/sales-auth.ts`
- Create: `components/sales/SalesSignInForm.tsx`
- Create: `components/sales/SalesSignOutButton.tsx`
- Create: `app/sales/sign-in/page.tsx`
- Create: `app/sales/(protected)/layout.tsx`
- Modify: `components/layout/PublicChrome.tsx`

- [ ] **Step 1: Sales sign-out action** — `lib/actions/sales-auth.ts`

```tsx
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/portal";

/** Sign the current rep out and return to the sales sign-in page. */
export async function salesSignOut(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/sales/sign-in");
}
```

- [ ] **Step 2: Sales sign-in form** — `components/sales/SalesSignInForm.tsx`. Mirrors the portal form but rejects non-reps after sign-in.

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { portalAuthClient } from "@/lib/auth/portal-client";

/**
 * Sales-rep sign-in. Authenticates via BetterAuth, then confirms the account is
 * a rep (role="rep"). A customer signing in here is immediately signed back out
 * with a clear message — reps and customers share the credential store but not
 * the portal.
 */
export function SalesSignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    const { data, error: authError } = await portalAuthClient.signIn.email({
      email,
      password,
      rememberMe: true,
    });
    if (authError) {
      setPending(false);
      setError(
        authError.code === "INVALID_EMAIL_OR_PASSWORD" || authError.status === 401
          ? "That email and password don't match. Please try again."
          : authError.message || "We couldn't sign you in. Please try again.",
      );
      return;
    }
    if (data?.user?.role !== "rep") {
      await portalAuthClient.signOut();
      setPending(false);
      setError("This sign-in is for MEC sales representatives. Customers should use the customer portal.");
      return;
    }
    router.push("/sales");
    router.refresh();
  }

  const inputCls =
    "mt-2 w-full rounded-sm border border-mec-ink/20 bg-mec-pure px-4 py-3 text-mec-ink outline-none transition-colors focus:border-mec-red";

  return (
    <form onSubmit={handleSubmit} className="mt-8" noValidate>
      <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-[0.16em] text-mec-ink/60">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" autoFocus required className={inputCls} />
      <label htmlFor="password" className="mt-6 block text-xs font-semibold uppercase tracking-[0.16em] text-mec-ink/60">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required className={inputCls} />
      {error && (
        <p role="alert" className="mt-5 rounded-sm border border-mec-red/30 bg-mec-red/5 px-4 py-3 text-sm text-mec-red">{error}</p>
      )}
      <button type="submit" disabled={pending} className="mt-7 w-full bg-mec-red px-6 py-3.5 font-semibold uppercase tracking-[0.14em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Sales sign-out button** — `components/sales/SalesSignOutButton.tsx`

```tsx
"use client";

import { LogOut } from "lucide-react";
import { salesSignOut } from "@/lib/actions/sales-auth";

export function SalesSignOutButton() {
  return (
    <form action={salesSignOut}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-pill border border-mec-ink/15 px-4 py-2 text-sm font-semibold text-mec-ink/70 transition-colors hover:border-mec-red hover:text-mec-red"
      >
        <LogOut aria-hidden className="h-4 w-4" />
        Sign out
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Sales sign-in page** — `app/sales/sign-in/page.tsx`. Already-signed-in reps skip the form.

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { SalesSignInForm } from "@/components/sales/SalesSignInForm";
import { getSalesSession } from "@/lib/sales";

export const metadata: Metadata = {
  title: "Sales Portal Sign In | Minott Equipment & Chemicals",
};

export default async function SalesSignInPage() {
  const sales = await getSalesSession();
  if (sales) redirect("/sales");

  return (
    <section className="grid min-h-[80vh] place-items-center bg-mec-mist px-6 py-[var(--spacing-section-y)] text-mec-ink">
      <div className="w-full max-w-md">
        <div className="rounded-md border border-mec-ink/10 bg-mec-pure p-8 shadow-[0_24px_48px_-12px_rgba(13,13,13,0.08)] md:p-10">
          <Eyebrow>Sales Portal</Eyebrow>
          <h1 className="mt-4 font-display-tight text-4xl leading-none tracking-tight md:text-5xl">
            Rep sign in
          </h1>
          <p className="mt-3 text-sm text-mec-ink/65">
            Sign in to manage your customers and their quote requests.
          </p>
          <SalesSignInForm />
        </div>
        <p className="mt-6 text-center text-xs text-mec-ink/50">
          <Link href="/" className="hover:text-mec-red">← Back to minottequipment.com</Link>
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Sales protected layout** — `app/sales/(protected)/layout.tsx`

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/primitives/Container";
import { SalesSignOutButton } from "@/components/sales/SalesSignOutButton";
import { getSalesSession } from "@/lib/sales";

const NAV = [
  { href: "/sales", label: "Dashboard" },
  { href: "/sales/customers", label: "My customers" },
  { href: "/sales/quotes", label: "Quotes" },
];

/**
 * Gate for the sales-rep portal. Mirrors the customer portal layout: the rep
 * session is verified server-side (valid session + role="rep" + active rep) and
 * everyone else is redirected to sign-in.
 */
export default async function SalesProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sales = await getSalesSession();
  if (!sales) redirect("/sales/sign-in");

  return (
    <div className="min-h-screen bg-mec-mist pt-8 text-mec-ink">
      <Container className="pb-[var(--spacing-section-y)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-mec-ink/10 pb-4 pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-display-tight text-lg tracking-tight">
              <span className="text-mec-red">MEC</span> Sales
            </span>
            <nav aria-label="Sales portal" className="flex flex-wrap items-center gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-pill px-3.5 py-1.5 text-sm font-semibold text-mec-ink/70 transition-colors hover:bg-mec-pure hover:text-mec-ink"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-mec-ink/60 sm:inline">{sales.rep.name}</span>
            <SalesSignOutButton />
          </div>
        </div>
        <div className="pt-10">{children}</div>
      </Container>
    </div>
  );
}
```

- [ ] **Step 6: Hide public chrome under `/sales`** — `components/layout/PublicChrome.tsx`. Change the `isAdmin` guard (`components/layout/PublicChrome.tsx:16-17`) to also cover `/sales`:

```tsx
  const pathname = usePathname();
  // The admin and sales portals render their own chrome.
  const isPortalChrome =
    pathname.startsWith("/admin") || pathname.startsWith("/sales");
  if (isPortalChrome) return <>{children}</>;
```

- [ ] **Step 7: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add lib/actions/sales-auth.ts components/sales "app/sales/sign-in" "app/sales/(protected)/layout.tsx" components/layout/PublicChrome.tsx
git commit -m "feat(sales): rep sign-in, sign-out, portal gate + chrome"
```

---

## Task 8: Sales dashboard + customers pages

**Files:**
- Create: `app/sales/(protected)/page.tsx`
- Create: `app/sales/(protected)/customers/page.tsx`
- Create: `app/sales/(protected)/customers/[id]/page.tsx`
- Create: `components/sales/RepCustomerForm.tsx`
- Modify: `lib/actions/sales.ts` (created here; extended in Task 9)

- [ ] **Step 1: `updateRepCustomer` action** — create `lib/actions/sales.ts` with the customer-profile mutation (ownership-checked).

```tsx
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSalesSession } from "@/lib/sales";

export type RepCustomerState = { error?: string; success?: boolean };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Update one of the signed-in rep's customers' profile fields. The rep is
 * re-derived from the session and the target customer's salesRepId is verified
 * against it — an id from the form is never trusted. Email and rep-assignment
 * stay admin-only.
 */
export async function updateRepCustomer(
  _prev: RepCustomerState,
  formData: FormData,
): Promise<RepCustomerState> {
  const sales = await getSalesSession();
  if (!sales) redirect("/sales/sign-in");

  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!id) return { error: "Missing customer id." };
  if (!name) return { error: "Contact name is required." };

  const customer = await db.user.findUnique({
    where: { id },
    select: { salesRepId: true },
  });
  if (!customer || customer.salesRepId !== sales.rep.id)
    return { error: "That customer is not assigned to you." };

  await db.user.update({
    where: { id },
    data: {
      name,
      companyName: str(formData, "companyName") || null,
      phone: str(formData, "phone") || null,
      whatsapp: str(formData, "whatsapp") || null,
    },
  });

  revalidatePath("/sales/customers");
  revalidatePath(`/sales/customers/${id}`);
  return { success: true };
}
```

- [ ] **Step 2: Dashboard** — `app/sales/(protected)/page.tsx`

```tsx
import Link from "next/link";
import { getSalesSession, getRepStats, getLatestRepQuotes } from "@/lib/sales";
import { redirect } from "next/navigation";
import { INQUIRY_STATUS_LABELS } from "@/lib/constants";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function SalesDashboardPage() {
  const sales = await getSalesSession();
  if (!sales) redirect("/sales/sign-in");
  const [stats, latest] = await Promise.all([
    getRepStats(sales.rep.id),
    getLatestRepQuotes(sales.rep.id, 8),
  ]);

  const tiles = [
    { label: "My customers", value: stats.customers, href: "/sales/customers" },
    { label: "Open quotes", value: stats.openQuotes, href: "/sales/quotes" },
    { label: "Total quotes", value: stats.totalQuotes, href: "/sales/quotes" },
  ];

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Welcome, {sales.rep.name}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="rounded-md border border-black/10 bg-mec-pure p-5 transition-colors hover:border-mec-red/40">
            <div className="font-display-tight text-4xl">{t.value}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/60">{t.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display-tight text-2xl">Latest quotes</h2>
        <Link href="/sales/quotes" className="text-sm font-semibold text-mec-red hover:underline">View all</Link>
      </div>
      <div className="mt-4 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {latest.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-mec-ink/60">No quotes from your customers yet.</td></tr>
            )}
            {latest.map((q) => (
              <tr key={q.id} className="border-b border-black/5 hover:bg-mec-mist/50">
                <td className="px-4 py-3">
                  <Link href={`/sales/quotes/${q.id}`} className="font-semibold hover:text-mec-red">
                    {q.user?.name ?? q.name}
                  </Link>
                  {q.user?.companyName ? <span className="block text-xs text-mec-ink/50">{q.user.companyName}</span> : null}
                </td>
                <td className="px-4 py-3 text-mec-ink/70">{q._count.items}</td>
                <td className="px-4 py-3 text-mec-ink/70">{INQUIRY_STATUS_LABELS[q.status] ?? q.status}</td>
                <td className="px-4 py-3 text-mec-ink/60">{formatDate(q.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Customers list** — `app/sales/(protected)/customers/page.tsx`

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSalesSession, getRepCustomers } from "@/lib/sales";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function SalesCustomersPage() {
  const sales = await getSalesSession();
  if (!sales) redirect("/sales/sign-in");
  const customers = await getRepCustomers(sales.rep.id);

  return (
    <div>
      <h1 className="font-display-tight text-3xl">My customers</h1>
      <div className="mt-6 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Quotes</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-mec-ink/60">No customers assigned to you yet.</td></tr>
            )}
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-black/5">
                <td className="px-4 py-3 font-semibold">{c.name}</td>
                <td className="px-4 py-3 text-mec-ink/70">{c.companyName ?? "—"}</td>
                <td className="px-4 py-3 text-mec-ink/70"><a href={`mailto:${c.email}`} className="hover:text-mec-red">{c.email}</a></td>
                <td className="px-4 py-3 text-mec-ink/70">{c._count.inquiries}</td>
                <td className="px-4 py-3 text-mec-ink/60">{formatDate(c.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/sales/customers/${c.id}`} className="font-semibold text-mec-red hover:underline">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rep customer form** — `components/sales/RepCustomerForm.tsx`

```tsx
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateRepCustomer, type RepCustomerState } from "@/lib/actions/sales";

const field = "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label = "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";

export type RepCustomerFormData = {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  phone: string | null;
  whatsapp: string | null;
};

/** Rep-editable customer profile. Email is read-only (admin-managed). */
export function RepCustomerForm({ customer }: { customer: RepCustomerFormData }) {
  const [state, formAction, pending] = useActionState<RepCustomerState, FormData>(updateRepCustomer, {});
  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <input type="hidden" name="id" value={customer.id} />
      <label className={label}>
        Contact name
        <input name="name" required defaultValue={customer.name} className={field} />
      </label>
      <div>
        <span className={label}>Email (managed by MEC admin)</span>
        <p className="mt-1 rounded-sm border border-black/10 bg-mec-mist px-3 py-2 text-sm text-mec-ink/60">{customer.email}</p>
      </div>
      <label className={label}>
        Company name
        <input name="companyName" defaultValue={customer.companyName ?? ""} className={field} />
      </label>
      <label className={label}>
        Phone
        <input name="phone" type="tel" defaultValue={customer.phone ?? ""} className={field} />
      </label>
      <label className={label}>
        WhatsApp
        <input name="whatsapp" type="tel" defaultValue={customer.whatsapp ?? ""} className={field} />
      </label>
      {state.error && <p className="text-sm text-mec-red">{state.error}</p>}
      {state.success && <p className="text-sm text-mec-ink/60">Saved.</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover disabled:opacity-50">
          {pending ? "Saving…" : "Save Changes"}
        </button>
        <Link href="/sales/customers" className="px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70 hover:text-mec-red">Cancel</Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Customer edit page** — `app/sales/(protected)/customers/[id]/page.tsx`

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSalesSession, getRepCustomerById } from "@/lib/sales";
import { RepCustomerForm } from "@/components/sales/RepCustomerForm";

export default async function SalesEditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sales = await getSalesSession();
  if (!sales) redirect("/sales/sign-in");
  const { id } = await params;
  const customer = await getRepCustomerById(sales.rep.id, id);
  if (!customer) notFound();

  return (
    <div>
      <Link href="/sales/customers" className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red">← Back to my customers</Link>
      <h1 className="mt-4 font-display-tight text-3xl">{customer.name}</h1>
      <div className="mt-8">
        <RepCustomerForm
          customer={{
            id: customer.id,
            name: customer.name,
            email: customer.email,
            companyName: customer.companyName,
            phone: customer.phone,
            whatsapp: customer.whatsapp,
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add "app/sales/(protected)/page.tsx" "app/sales/(protected)/customers" components/sales/RepCustomerForm.tsx lib/actions/sales.ts
git commit -m "feat(sales): dashboard + customers list/edit"
```

---

## Task 9: Sales quotes — history, detail, status, notes

**Files:**
- Modify: `lib/actions/sales.ts` (add status + note mutations)
- Create: `components/sales/QuoteStatusForm.tsx`
- Create: `components/sales/AddNoteForm.tsx`
- Create: `app/sales/(protected)/quotes/page.tsx`
- Create: `app/sales/(protected)/quotes/[id]/page.tsx`
- Modify: `app/admin/(protected)/requests/page.tsx`

- [ ] **Step 1: Add status + note mutations to `lib/actions/sales.ts`** — append to the file (keep the existing `updateRepCustomer`). Add these imports at the top if not present: `import { INQUIRY_STATUS } from "@/lib/constants";`.

```tsx
async function assertRepOwnsQuote(repId: number, inquiryId: number) {
  const quote = await db.inquiry.findUnique({
    where: { id: inquiryId },
    select: { type: true, user: { select: { salesRepId: true } } },
  });
  if (!quote || quote.type !== "QUOTE" || quote.user?.salesRepId !== repId) return false;
  return true;
}

export type QuoteActionState = { error?: string; success?: boolean };

/** Update the status of one of the rep's quotes (ownership-checked). */
export async function updateRepQuoteStatus(
  _prev: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const sales = await getSalesSession();
  if (!sales) redirect("/sales/sign-in");

  const inquiryId = Number(formData.get("inquiryId"));
  const status = str(formData, "status");
  if (!Number.isFinite(inquiryId)) return { error: "Invalid quote id." };
  if (!(status in INQUIRY_STATUS)) return { error: "Invalid status." };
  if (!(await assertRepOwnsQuote(sales.rep.id, inquiryId)))
    return { error: "That quote is not assigned to you." };

  await db.inquiry.update({ where: { id: inquiryId }, data: { status } });
  revalidatePath(`/sales/quotes/${inquiryId}`);
  revalidatePath("/sales/quotes");
  revalidatePath("/sales");
  return { success: true };
}

/** Add a note to one of the rep's quotes (ownership-checked). */
export async function addQuoteNote(
  _prev: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const sales = await getSalesSession();
  if (!sales) redirect("/sales/sign-in");

  const inquiryId = Number(formData.get("inquiryId"));
  const body = str(formData, "body");
  if (!Number.isFinite(inquiryId)) return { error: "Invalid quote id." };
  if (!body) return { error: "Note cannot be empty." };
  if (!(await assertRepOwnsQuote(sales.rep.id, inquiryId)))
    return { error: "That quote is not assigned to you." };

  await db.inquiryNote.create({
    data: { inquiryId, body: body.slice(0, 2000), authorLabel: sales.rep.name },
  });
  revalidatePath(`/sales/quotes/${inquiryId}`);
  return { success: true };
}
```

- [ ] **Step 2: Quote status form** — `components/sales/QuoteStatusForm.tsx`

```tsx
"use client";

import { useActionState } from "react";
import { updateRepQuoteStatus, type QuoteActionState } from "@/lib/actions/sales";
import { INQUIRY_STATUS, INQUIRY_STATUS_LABELS } from "@/lib/constants";

export function QuoteStatusForm({ inquiryId, status }: { inquiryId: number; status: string }) {
  const [state, formAction, pending] = useActionState<QuoteActionState, FormData>(updateRepQuoteStatus, {});
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <select name="status" defaultValue={status} className="rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-sm text-mec-ink outline-none focus:border-mec-red">
        {Object.keys(INQUIRY_STATUS).map((s) => (
          <option key={s} value={s}>{INQUIRY_STATUS_LABELS[s] ?? s}</option>
        ))}
      </select>
      <button type="submit" disabled={pending} className="rounded-sm bg-mec-red px-4 py-2 text-sm font-semibold uppercase tracking-[0.1em] text-mec-pure hover:bg-mec-red-hover disabled:opacity-50">
        {pending ? "Saving…" : "Update"}
      </button>
      {state.success && <span className="text-sm text-mec-ink/60">Updated.</span>}
      {state.error && <span className="text-sm text-mec-red">{state.error}</span>}
    </form>
  );
}
```

- [ ] **Step 3: Add-note form** — `components/sales/AddNoteForm.tsx`

```tsx
"use client";

import { useActionState, useRef, useEffect } from "react";
import { addQuoteNote, type QuoteActionState } from "@/lib/actions/sales";

export function AddNoteForm({ inquiryId }: { inquiryId: number }) {
  const [state, formAction, pending] = useActionState<QuoteActionState, FormData>(addQuoteNote, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state.success]);
  return (
    <form ref={ref} action={formAction} className="space-y-3">
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <textarea name="body" rows={3} required placeholder="Add a note about this quote…" className="w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-sm text-mec-ink outline-none focus:border-mec-red" />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-sm bg-mec-ink px-4 py-2 text-sm font-semibold uppercase tracking-[0.1em] text-mec-pure hover:bg-mec-graphite disabled:opacity-50">
          {pending ? "Adding…" : "Add note"}
        </button>
        {state.error && <span className="text-sm text-mec-red">{state.error}</span>}
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Quotes list** — `app/sales/(protected)/quotes/page.tsx`. Reuses the portal `HistoryFilters` shape via `getRepQuotes`; supports `?status=&from=&to=`.

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSalesSession, getRepQuotes } from "@/lib/sales";
import { INQUIRY_STATUS, INQUIRY_STATUS_LABELS } from "@/lib/constants";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function SalesQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
}) {
  const sales = await getSalesSession();
  if (!sales) redirect("/sales/sign-in");
  const sp = await searchParams;
  const status = sp.status && sp.status in INQUIRY_STATUS ? sp.status : undefined;
  const quotes = await getRepQuotes(sales.rep.id, { status, from: sp.from, to: sp.to });

  const filterCls = "rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-sm text-mec-ink outline-none focus:border-mec-red";

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Quotes</h1>
      <form className="mt-6 flex flex-wrap items-end gap-3" method="get">
        <label className="text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/60">
          Status
          <select name="status" defaultValue={status ?? ""} className={`mt-1 block ${filterCls}`}>
            <option value="">All</option>
            {Object.keys(INQUIRY_STATUS).map((s) => (
              <option key={s} value={s}>{INQUIRY_STATUS_LABELS[s] ?? s}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/60">
          From
          <input type="date" name="from" defaultValue={sp.from ?? ""} className={`mt-1 block ${filterCls}`} />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/60">
          To
          <input type="date" name="to" defaultValue={sp.to ?? ""} className={`mt-1 block ${filterCls}`} />
        </label>
        <button type="submit" className="rounded-sm bg-mec-ink px-4 py-2 text-sm font-semibold uppercase tracking-[0.1em] text-mec-pure hover:bg-mec-graphite">Filter</button>
        <Link href="/sales/quotes" className="px-2 py-2 text-sm font-semibold text-mec-ink/60 hover:text-mec-red">Reset</Link>
      </form>

      <div className="mt-6 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-mec-ink/60">No quotes match these filters.</td></tr>
            )}
            {quotes.map((q) => (
              <tr key={q.id} className="border-b border-black/5 hover:bg-mec-mist/50">
                <td className="px-4 py-3">
                  <Link href={`/sales/quotes/${q.id}`} className="font-semibold hover:text-mec-red">{q.user?.name ?? q.name}</Link>
                  {q.user?.companyName ? <span className="block text-xs text-mec-ink/50">{q.user.companyName}</span> : null}
                </td>
                <td className="px-4 py-3 text-mec-ink/70">{q._count.items}</td>
                <td className="px-4 py-3 text-mec-ink/70">{INQUIRY_STATUS_LABELS[q.status] ?? q.status}</td>
                <td className="px-4 py-3 text-mec-ink/60">{formatDate(q.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Quote detail** — `app/sales/(protected)/quotes/[id]/page.tsx`

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSalesSession, getRepQuoteById } from "@/lib/sales";
import { QuoteStatusForm } from "@/components/sales/QuoteStatusForm";
import { AddNoteForm } from "@/components/sales/AddNoteForm";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-JM", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export default async function SalesQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sales = await getSalesSession();
  if (!sales) redirect("/sales/sign-in");
  const { id } = await params;
  const quoteId = Number(id);
  if (!Number.isFinite(quoteId)) notFound();
  const quote = await getRepQuoteById(sales.rep.id, quoteId);
  if (!quote) notFound();

  return (
    <div>
      <Link href="/sales/quotes" className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red">← Back to quotes</Link>
      <h1 className="mt-4 font-display-tight text-3xl">Quote #{quote.id}</h1>
      <p className="mt-1 text-sm text-mec-ink/60">{formatDateTime(quote.createdAt)}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <section className="rounded-md border border-black/10 bg-mec-pure p-5">
            <h2 className="font-display-tight text-xl">Requested items</h2>
            <ul className="mt-3 divide-y divide-black/5">
              {quote.items.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{i.productName}{i.variant?.label ? ` — ${i.variant.label}` : i.variant?.size ? ` — ${i.variant.size}` : ""}</span>
                  <span className="font-semibold text-mec-ink/70">× {i.quantity}</span>
                </li>
              ))}
              {quote.items.length === 0 && <li className="py-2 text-sm text-mec-ink/60">No line items.</li>}
            </ul>
            {quote.message && (
              <p className="mt-4 rounded-sm bg-mec-mist p-3 text-sm text-mec-ink/70">“{quote.message}”</p>
            )}
          </section>

          <section className="rounded-md border border-black/10 bg-mec-pure p-5">
            <h2 className="font-display-tight text-xl">Notes</h2>
            <div className="mt-4"><AddNoteForm inquiryId={quote.id} /></div>
            <ul className="mt-5 space-y-3">
              {quote.notes.length === 0 && <li className="text-sm text-mec-ink/60">No notes yet.</li>}
              {quote.notes.map((n) => (
                <li key={n.id} className="rounded-sm border border-black/5 bg-mec-mist/50 p-3">
                  <p className="text-sm text-mec-ink">{n.body}</p>
                  <p className="mt-1 text-xs text-mec-ink/50">{n.authorLabel} · {formatDateTime(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-md border border-black/10 bg-mec-pure p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/60">Status</h2>
            <div className="mt-3"><QuoteStatusForm inquiryId={quote.id} status={quote.status} /></div>
          </section>
          <section className="rounded-md border border-black/10 bg-mec-pure p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/60">Customer</h2>
            <p className="mt-3 font-semibold">{quote.user?.name ?? quote.name}</p>
            {quote.user?.companyName ? <p className="text-sm text-mec-ink/60">{quote.user.companyName}</p> : null}
            <p className="mt-2 text-sm"><a href={`mailto:${quote.user?.email ?? quote.email}`} className="text-mec-red hover:underline">{quote.user?.email ?? quote.email}</a></p>
            {quote.user?.phone ? <p className="text-sm text-mec-ink/70">{quote.user.phone}</p> : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Surface notes read-only in the admin inbox** — `app/admin/(protected)/requests/page.tsx`. First read the file to find the inquiry query's `include` and the per-inquiry render block. Add `notes: { orderBy: { createdAt: "desc" } },` to the `include`, and render the notes under each inquiry's details, e.g.:

```tsx
{inquiry.notes.length > 0 && (
  <div className="mt-3 space-y-1.5 border-t border-black/5 pt-3">
    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/50">Rep notes</p>
    {inquiry.notes.map((n) => (
      <p key={n.id} className="text-sm text-mec-ink/70">
        <span className="text-mec-ink">{n.body}</span>{" "}
        <span className="text-xs text-mec-ink/45">— {n.authorLabel}</span>
      </p>
    ))}
  </div>
)}
```
Adapt the placement/markup to match the file's existing per-inquiry layout. If the query uses a shared `include` object, add `notes` there.

- [ ] **Step 7: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add lib/actions/sales.ts components/sales "app/sales/(protected)/quotes" "app/admin/(protected)/requests/page.tsx"
git commit -m "feat(sales): quote history, detail, status updates + notes"
```

---

## Task 10: Final verification + docs

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: compiles successfully (Prisma generate + migrate deploy + next build), no type or lint errors. Address any failures before proceeding.

- [ ] **Step 2: Manual click-through** (dev server: `npm run dev`). Confirm each:
  - **Customer invite:** `/admin/customers/new` → create a customer (no password field). With Resend + `/admin/settings` configured, an invite email arrives; the link opens `/set-password?portal=customer&token=…`. Set a password → land on `/portal/sign-in` → sign in → dashboard. Customer shows **Active** in `/admin/customers`.
  - **Bad token:** visit `/set-password?portal=customer` with no/garbage token → "invalid or expired" message, no form submit possible.
  - **Rep invite:** `/admin/sales-reps/new` → create a rep (email required). Invite arrives → `/set-password?portal=sales` → set password → `/sales/sign-in` → dashboard shows tiles + latest quotes.
  - **Rep scope:** rep sees only their assigned customers' quotes; opening `/sales/quotes/<id>` for another rep's quote → 404. Update a quote status, add a note, edit a customer profile — all persist. The note appears read-only in `/admin/requests`.
  - **Cross-role:** a customer visiting `/sales` → redirected to `/portal`; a rep visiting `/portal` → redirected to `/sales`; a customer signing in at `/sales/sign-in` → signed out with the "reps only" message.
  - **Resend + deactivate:** "Resend invite" on an edit page sends a fresh link; setting a rep inactive blocks their `/sales` sign-in.
  - **Email unconfigured:** with `RESEND_API_KEY` unset, creating a customer/rep still succeeds and logs a console warning (no crash).

- [ ] **Step 3: Update `CLAUDE.md`** — in the "Known open items" / data & admin sections, document: reps now have logins (`role="rep"`, linked to `SalesRep.userId`); `/sales` is the rep portal (CRM-lite, quotes only); customers and reps are onboarded via emailed set-password links (better-auth reset flow, 72h) rather than admin-typed passwords; `activatedAt` tracks pending/active; `InquiryNote` stores rep notes. Note that provisioning is best-effort on email (Resend optional).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document sales portal + invite onboarding"
```

---

## Self-review notes (addressed in this plan)

- **Spec coverage:** data model (Task 1), better-auth reset + 72h + invite email (Task 2), provisioning + resend for customers & reps (Task 3), token-gated set-password page (Task 4), admin pending/active + resend UI (Task 5), rep-scoped reads + role gate + cross-portal redirects (Tasks 6–7), dashboard/customers/quotes with status + notes (Tasks 8–9), notes surfaced in admin (Task 9), verification + docs (Task 10). Security items (ownership checks, un-activated block via `activatedAt`, inactive-rep block, token-only gate) are enforced in `getSalesSession`, `provisionUser`, and each `lib/actions/sales.ts` mutation.
- **Type consistency:** `getSalesSession()` returns `{ session, rep }` and is used uniformly across pages/actions; `HistoryFilters` is imported from `lib/portal` and reused by `lib/sales`; `provisionUser`/`sendInvite`/`INVITE_REDIRECT` signatures match all call sites; `ResendInviteState`/`RepCustomerState`/`QuoteActionState` match their form consumers.
- **Note on un-activated sign-in:** because `provisionUser` seeds a random password, an un-activated account cannot be signed into in practice (nobody knows the password); `activatedAt` additionally drives the admin badge. If stricter enforcement is later wanted, add an `activatedAt`-null check in the sign-in forms.
