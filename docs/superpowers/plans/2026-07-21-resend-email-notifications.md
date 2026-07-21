# Resend Email Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send Resend transactional emails for all three inquiry types — internal notifications routed to the assigned sales rep (CC general inbox) or the general inbox, plus a customer confirmation — with addresses admin-editable in a new `/admin/settings` section.

**Architecture:** A `Setting` key-value Prisma table stores `fromEmail` / `fromName` / `generalInboxEmail`. A `lib/email/` module owns the Resend client singleton and one orchestrator, `sendInquiryEmails(inquiryId)`, called from the three inquiry server actions via Next 16's `after()` so the response never waits on email. React Email components in `emails/` render both messages. Everything is best-effort: missing config or send failures log to the server console and never surface to the user.

**Tech Stack:** Next.js 16 (App Router, Server Actions, `after()` from `next/server`), Prisma 7 + SQLite (better-sqlite3 adapter), `resend` SDK, `@react-email/components`, React 19.

**Spec:** `docs/superpowers/specs/2026-07-21-resend-email-design.md`

**Working directory:** All commands run from `minott-web/` unless noted. All file paths below are relative to `minott-web/` except the spec/plan docs.

**Verification convention:** This repo has **no automated test suite** (per CLAUDE.md — this overrides the TDD default). Each task verifies with `npx tsc --noEmit` (and `npm run lint` / `npm run build` at the end) plus targeted manual checks.

**Suggested subagent models:** each task header notes `[sonnet]` (mechanical/pattern-following) or `[opus]` (routing logic / template design).

---

### Task 1: Dependencies, `Setting` model, migration, env `[sonnet]`

**Files:**
- Modify: `prisma/schema.prisma` (append model)
- Modify: `.env.example` (append key)
- Modify: `package.json` / `package-lock.json` (via npm install)
- Create: `prisma/migrations/<timestamp>_add_setting/migration.sql` (via prisma)

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install resend @react-email/components
```
Expected: both packages added to `package.json` `dependencies`, install exits 0.

- [ ] **Step 2: Add the `Setting` model**

Append to the end of `prisma/schema.prisma` (after the `Verification` model):

```prisma
// Admin-editable site settings (key-value). Email keys used today:
// "fromEmail", "fromName", "generalInboxEmail" — see lib/settings.ts.
model Setting {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 3: Create the migration**

Run:
```bash
npm run db:migrate -- --name add_setting
```
Expected: `prisma migrate dev` creates `prisma/migrations/*_add_setting/` and reports the migration applied; `prisma generate` runs.

- [ ] **Step 4: Add `RESEND_API_KEY` to `.env.example` and `.env`**

Append to `.env.example`:

```bash

# Resend — transactional email (inquiry notifications + confirmations).
# Sending is skipped with a console warning when unset.
RESEND_API_KEY=""
```

Also append `RESEND_API_KEY=""` to the local `.env` if the variable is absent (do NOT overwrite other values; `.env` is gitignored).

- [ ] **Step 5: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0. (`db.setting` is now available on the Prisma client.)

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations .env.example package.json package-lock.json
git commit -m "feat(email): add Setting model, resend + react-email deps"
```

---

### Task 2: Settings helpers — `lib/settings.ts` `[sonnet]`

**Files:**
- Create: `lib/settings.ts`

- [ ] **Step 1: Create `lib/settings.ts`**

```ts
import { db } from "@/lib/db";

export const EMAIL_SETTING_KEYS = {
  fromEmail: "fromEmail",
  fromName: "fromName",
  generalInboxEmail: "generalInboxEmail",
} as const;

export type EmailSettings = {
  /** Outbound from-address on the Resend-verified domain. */
  fromEmail: string | null;
  /** Display name shown in the From header. */
  fromName: string | null;
  /** Recipient for unassigned inquiries and CC on rep-routed ones. */
  generalInboxEmail: string | null;
};

export async function getEmailSettings(): Promise<EmailSettings> {
  const rows = await db.setting.findMany({
    where: { key: { in: Object.values(EMAIL_SETTING_KEYS) } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const get = (key: string): string | null => {
    const value = map.get(key)?.trim();
    return value ? value : null;
  };
  return {
    fromEmail: get(EMAIL_SETTING_KEYS.fromEmail),
    fromName: get(EMAIL_SETTING_KEYS.fromName),
    generalInboxEmail: get(EMAIL_SETTING_KEYS.generalInboxEmail),
  };
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add lib/settings.ts
git commit -m "feat(email): typed settings helpers over the Setting table"
```

---

### Task 3: Resend client singleton — `lib/email/resend.ts` `[sonnet]`

**Files:**
- Create: `lib/email/resend.ts`

- [ ] **Step 1: Create `lib/email/resend.ts`**

Mirrors the `lib/db.ts` globalThis singleton pattern:

```ts
import { Resend } from "resend";

const globalForResend = globalThis as unknown as {
  resend: Resend | undefined;
};

/**
 * Returns the shared Resend client, or null when RESEND_API_KEY is unset
 * (callers skip sending — email is best-effort and optional in dev).
 */
export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const client = globalForResend.resend ?? new Resend(key);
  if (process.env.NODE_ENV !== "production") globalForResend.resend = client;
  return client;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add lib/email/resend.ts
git commit -m "feat(email): Resend client singleton, null when unconfigured"
```

---

### Task 4: React Email templates `[opus]`

**Files:**
- Create: `emails/components/EmailLayout.tsx`
- Create: `emails/inquiry-notification.tsx`
- Create: `emails/inquiry-confirmation.tsx`

All props are plain-serializable (no Prisma objects). Colors are hardcoded hex mirroring `lib/tokens.ts` (email HTML can't read Tailwind tokens): red `#E10600`, ink `#0D0D0D`, graphite `#2B2B2B`, mist `#F2F2F2`, pure `#FFFFFF`. Use a system font stack — email clients can't load the site's `next/font` fonts. Use React Email's inline `style` objects, not Tailwind classes.

- [ ] **Step 1: Create `emails/components/EmailLayout.tsx`**

```tsx
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// Mirrors lib/tokens.ts — email HTML can't read Tailwind tokens.
export const emailColors = {
  red: "#E10600",
  ink: "#0D0D0D",
  graphite: "#2B2B2B",
  mist: "#F2F2F2",
  pure: "#FFFFFF",
} as const;

export const fontStack =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: emailColors.mist,
          fontFamily: fontStack,
          margin: 0,
          padding: "24px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: emailColors.pure,
            borderRadius: 4,
            maxWidth: 560,
            overflow: "hidden",
          }}
        >
          <Section
            style={{
              backgroundColor: emailColors.ink,
              borderTop: `4px solid ${emailColors.red}`,
              padding: "16px 32px",
            }}
          >
            <Text
              style={{
                color: emailColors.pure,
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.08em",
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              <span style={{ color: emailColors.red }}>MEC</span>&nbsp;Minott
              Equipment &amp; Chemicals
            </Text>
          </Section>
          <Section style={{ padding: "28px 32px" }}>{children}</Section>
          <Section
            style={{
              borderTop: `1px solid rgba(0,0,0,0.08)`,
              padding: "16px 32px",
            }}
          >
            <Text
              style={{
                color: emailColors.graphite,
                fontSize: 12,
                margin: 0,
              }}
            >
              Minott Equipment &amp; Chemicals Limited · 14½ Retirement Rd
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Create `emails/inquiry-notification.tsx`** (internal email)

```tsx
import { Heading, Hr, Link, Text } from "@react-email/components";
import { EmailLayout, emailColors } from "./components/EmailLayout";

export type NotificationItem = {
  name: string;
  variant: string | null;
  quantity: number;
};

export type InquiryNotificationProps = {
  typeLabel: string; // "Quote request" | "Sample request" | "Contact message"
  inquiryId: number;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  items: NotificationItem[];
  /** Assigned rep name when routed to a rep, else null. */
  repName: string | null;
  adminUrl: string; // absolute link to /admin/requests
};

const detailLabel = {
  color: emailColors.graphite,
  fontSize: 12,
  fontWeight: 700 as const,
  letterSpacing: "0.08em",
  margin: "12px 0 2px",
  textTransform: "uppercase" as const,
};

const detailValue = {
  color: emailColors.ink,
  fontSize: 14,
  margin: 0,
};

export function InquiryNotification(props: InquiryNotificationProps) {
  const preview = `New ${props.typeLabel.toLowerCase()} from ${props.name}`;
  return (
    <EmailLayout preview={preview}>
      <Text
        style={{
          backgroundColor: emailColors.red,
          borderRadius: 999,
          color: emailColors.pure,
          display: "inline-block",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          margin: 0,
          padding: "4px 12px",
          textTransform: "uppercase",
        }}
      >
        {props.typeLabel}
      </Text>
      <Heading
        as="h1"
        style={{
          color: emailColors.ink,
          fontSize: 22,
          margin: "16px 0 4px",
        }}
      >
        New {props.typeLabel.toLowerCase()} from {props.name}
      </Heading>
      {props.repName && (
        <Text style={{ color: emailColors.graphite, fontSize: 13, margin: 0 }}>
          Routed to {props.repName} (assigned sales rep).
        </Text>
      )}

      <Text style={detailLabel}>Contact</Text>
      <Text style={detailValue}>
        {props.name}
        {props.company ? ` · ${props.company}` : ""}
      </Text>
      <Text style={detailValue}>
        <Link href={`mailto:${props.email}`} style={{ color: emailColors.red }}>
          {props.email}
        </Link>
        {props.phone ? ` · ${props.phone}` : ""}
      </Text>

      {props.message && (
        <>
          <Text style={detailLabel}>Message</Text>
          <Text style={detailValue}>{props.message}</Text>
        </>
      )}

      {props.items.length > 0 && (
        <>
          <Text style={detailLabel}>Requested items</Text>
          {props.items.map((item, i) => (
            <Text key={i} style={{ ...detailValue, margin: "0 0 2px" }}>
              {item.quantity} × {item.name}
              {item.variant ? ` — ${item.variant}` : ""}
            </Text>
          ))}
        </>
      )}

      <Hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "24px 0" }} />
      <Text style={{ fontSize: 14, margin: 0 }}>
        <Link href={props.adminUrl} style={{ color: emailColors.red }}>
          View in the admin inbox →
        </Link>
      </Text>
    </EmailLayout>
  );
}
```

- [ ] **Step 3: Create `emails/inquiry-confirmation.tsx`** (customer email)

```tsx
import { Heading, Hr, Text } from "@react-email/components";
import { EmailLayout, emailColors } from "./components/EmailLayout";
import type { NotificationItem } from "./inquiry-notification";

export type InquiryConfirmationProps = {
  type: "QUOTE" | "SAMPLE" | "CONTACT";
  name: string;
  items: NotificationItem[];
};

const COPY: Record<
  InquiryConfirmationProps["type"],
  { heading: string; body: string }
> = {
  QUOTE: {
    heading: "We received your quote request",
    body: "Thanks for requesting a quote. Our team is reviewing your list and will get back to you with pricing shortly.",
  },
  SAMPLE: {
    heading: "We received your sample request",
    body: "Thanks for your interest. Our team will confirm sample availability and follow up with next steps.",
  },
  CONTACT: {
    heading: "We received your message",
    body: "Thanks for reaching out to Minott Equipment & Chemicals. A member of our team will respond as soon as possible.",
  },
};

export function InquiryConfirmation(props: InquiryConfirmationProps) {
  const copy = COPY[props.type];
  return (
    <EmailLayout preview={copy.heading}>
      <Heading
        as="h1"
        style={{ color: emailColors.ink, fontSize: 22, margin: "0 0 8px" }}
      >
        {copy.heading}
      </Heading>
      <Text style={{ color: emailColors.graphite, fontSize: 14, margin: 0 }}>
        Hi {props.name}, {copy.body}
      </Text>

      {props.items.length > 0 && (
        <>
          <Hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "20px 0" }} />
          <Text
            style={{
              color: emailColors.graphite,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              margin: "0 0 6px",
              textTransform: "uppercase",
            }}
          >
            Your request
          </Text>
          {props.items.map((item, i) => (
            <Text
              key={i}
              style={{ color: emailColors.ink, fontSize: 14, margin: "0 0 2px" }}
            >
              {item.quantity} × {item.name}
              {item.variant ? ` — ${item.variant}` : ""}
            </Text>
          ))}
        </>
      )}

      <Hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "20px 0" }} />
      <Text style={{ color: emailColors.graphite, fontSize: 13, margin: 0 }}>
        Need to add anything? Just reply to this email and it will reach our
        team.
      </Text>
    </EmailLayout>
  );
}
```

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add emails
git commit -m "feat(email): branded React Email templates for notifications + confirmations"
```

---

### Task 5: Orchestrator — `lib/email/send-inquiry-emails.tsx` `[opus]`

**Files:**
- Create: `lib/email/send-inquiry-emails.tsx` (`.tsx` — it renders JSX)

Routing rules (from the spec):
- Internal notification: `to` = assigned rep's email **iff** the inquiry has a `user` whose `salesRep` is `active` and has a non-empty `email`; then `cc` = general inbox. Otherwise `to` = general inbox, no CC.
- `replyTo` on the internal email = the customer's email.
- Customer confirmation always goes to the submitter.
- Skip everything with a `console.warn` if the Resend client is null or `fromEmail`/`generalInboxEmail` are unset. Each send has its own try/catch; one failing doesn't stop the other. Resend returns `{ data, error }` without throwing on API errors — check `error` too.

- [ ] **Step 1: Create `lib/email/send-inquiry-emails.tsx`**

```tsx
import { getResend } from "@/lib/email/resend";
import { getEmailSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { INQUIRY_TYPE_LABELS } from "@/lib/constants";
import {
  InquiryNotification,
  type NotificationItem,
} from "@/emails/inquiry-notification";
import { InquiryConfirmation } from "@/emails/inquiry-confirmation";

/**
 * Best-effort email fan-out for a persisted inquiry. Called via after() from
 * the inquiry server actions — must never throw. The DB row is the source of
 * truth; failures only log.
 */
export async function sendInquiryEmails(inquiryId: number): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) {
      console.warn(
        `[email] RESEND_API_KEY unset — skipping emails for inquiry ${inquiryId}`,
      );
      return;
    }

    const settings = await getEmailSettings();
    if (!settings.fromEmail || !settings.generalInboxEmail) {
      console.warn(
        `[email] fromEmail/generalInboxEmail not configured in /admin/settings — skipping emails for inquiry ${inquiryId}`,
      );
      return;
    }

    const inquiry = await db.inquiry.findUnique({
      where: { id: inquiryId },
      include: {
        user: { include: { salesRep: true } },
        items: { include: { variant: true } },
        product: true,
        variant: true,
      },
    });
    if (!inquiry) {
      console.error(`[email] inquiry ${inquiryId} not found — skipping`);
      return;
    }

    const from = settings.fromName
      ? `${settings.fromName} <${settings.fromEmail}>`
      : settings.fromEmail;

    const rep = inquiry.user?.salesRep;
    const repRouted = Boolean(rep?.active && rep?.email);

    // Quote items come from InquiryItem; samples carry a single product ref.
    const items: NotificationItem[] =
      inquiry.items.length > 0
        ? inquiry.items.map((i) => ({
            name: i.productName,
            variant: i.variant?.label ?? i.variant?.size ?? null,
            quantity: i.quantity,
          }))
        : inquiry.product
          ? [
              {
                name: inquiry.product.name,
                variant:
                  inquiry.variant?.label ?? inquiry.variant?.size ?? null,
                quantity: 1,
              },
            ]
          : [];

    const typeLabel = INQUIRY_TYPE_LABELS[inquiry.type] ?? "Inquiry";
    const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

    // 1) Internal notification (rep + CC inbox, or inbox alone).
    try {
      const { error } = await resend.emails.send({
        from,
        to: repRouted ? [rep!.email!] : [settings.generalInboxEmail],
        cc: repRouted ? [settings.generalInboxEmail] : undefined,
        replyTo: inquiry.email,
        subject: `New ${typeLabel.toLowerCase()} from ${inquiry.name}${inquiry.company ? ` (${inquiry.company})` : ""}`,
        react: (
          <InquiryNotification
            typeLabel={typeLabel}
            inquiryId={inquiry.id}
            name={inquiry.name}
            company={inquiry.company}
            email={inquiry.email}
            phone={inquiry.phone}
            message={inquiry.message}
            items={items}
            repName={repRouted ? rep!.name : null}
            adminUrl={`${baseUrl}/admin/requests`}
          />
        ),
      });
      if (error) {
        console.error(
          `[email] notification failed for inquiry ${inquiry.id}:`,
          error,
        );
      }
    } catch (e) {
      console.error(
        `[email] notification threw for inquiry ${inquiry.id}:`,
        e,
      );
    }

    // 2) Customer confirmation.
    try {
      const { error } = await resend.emails.send({
        from,
        to: [inquiry.email],
        replyTo: settings.generalInboxEmail,
        subject:
          inquiry.type === "QUOTE"
            ? "We received your quote request"
            : inquiry.type === "SAMPLE"
              ? "We received your sample request"
              : "We received your message",
        react: (
          <InquiryConfirmation
            type={inquiry.type as "QUOTE" | "SAMPLE" | "CONTACT"}
            name={inquiry.name}
            items={items}
          />
        ),
      });
      if (error) {
        console.error(
          `[email] confirmation failed for inquiry ${inquiry.id} to ${inquiry.email}:`,
          error,
        );
      }
    } catch (e) {
      console.error(
        `[email] confirmation threw for inquiry ${inquiry.id} to ${inquiry.email}:`,
        e,
      );
    }
  } catch (e) {
    // Belt-and-braces: this function is called via after() and must not throw.
    console.error(`[email] unexpected failure for inquiry ${inquiryId}:`, e);
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0. If the `react:` prop type complains, check the installed `resend` SDK's `CreateEmailOptions` — it accepts `react: React.ReactNode`; adjust only the JSX wrapper, not the architecture.

- [ ] **Step 3: Commit**

```bash
git add lib/email/send-inquiry-emails.tsx
git commit -m "feat(email): inquiry email orchestrator with rep routing + CC"
```

---

### Task 6: Wire server actions via `after()` `[sonnet]`

**Files:**
- Modify: `lib/actions/inquiries.ts`

- [ ] **Step 1: Add imports**

At the top of `lib/actions/inquiries.ts`, after the existing imports:

```ts
import { after } from "next/server";
import { sendInquiryEmails } from "@/lib/email/send-inquiry-emails";
```

- [ ] **Step 2: Capture the created inquiry and schedule emails in all three actions**

In `submitContact`, change:

```ts
  await db.inquiry.create({
    data: {
```
to
```ts
  const inquiry = await db.inquiry.create({
    data: {
```
and immediately after the `});` closing that create (before `return { ok: true };`), add:

```ts
  after(() => sendInquiryEmails(inquiry.id));
```

Apply the identical change to `submitSample` and `submitQuote` (each has exactly one `db.inquiry.create` call followed by `return { ok: true };`).

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 4: Manual smoke check (no API key configured)**

Run: `npm run dev`, submit the contact form at `/contact`.
Expected: form succeeds; server console logs `[email] RESEND_API_KEY unset — skipping emails for inquiry <id>` (or the settings warning if a key is set); inquiry appears in `/admin/requests`. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/inquiries.ts
git commit -m "feat(email): send inquiry emails after response via after()"
```

---

### Task 7: Admin settings — action, form, page, nav `[sonnet]`

**Files:**
- Create: `lib/actions/admin-settings.ts`
- Create: `components/admin/SettingsForm.tsx`
- Create: `app/admin/(protected)/settings/page.tsx`
- Modify: `app/admin/(protected)/layout.tsx:7-14` (NAV array)

- [ ] **Step 1: Create `lib/actions/admin-settings.ts`**

Follows the pattern of `lib/actions/admin-sales-reps.ts` (requireAdmin, FormData helpers, state object). Stays on the page after save (no redirect) and reports success:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { EMAIL_SETTING_KEYS, setSetting } from "@/lib/settings";

export type SettingsFormState = { error?: string; saved?: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function updateEmailSettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  await requireAdmin();

  const fromEmail = str(formData, "fromEmail");
  const fromName = str(formData, "fromName");
  const generalInboxEmail = str(formData, "generalInboxEmail");

  if (fromEmail && !EMAIL_RE.test(fromEmail))
    return { error: "Outbound email doesn't look like an email address." };
  if (generalInboxEmail && !EMAIL_RE.test(generalInboxEmail))
    return { error: "General inbox doesn't look like an email address." };

  await setSetting(EMAIL_SETTING_KEYS.fromEmail, fromEmail);
  await setSetting(EMAIL_SETTING_KEYS.fromName, fromName);
  await setSetting(EMAIL_SETTING_KEYS.generalInboxEmail, generalInboxEmail);

  revalidatePath("/admin/settings");
  return { saved: true };
}
```

- [ ] **Step 2: Create `components/admin/SettingsForm.tsx`**

Mirrors `SalesRepForm.tsx` styling:

```tsx
"use client";

import { useActionState } from "react";
import {
  updateEmailSettings,
  type SettingsFormState,
} from "@/lib/actions/admin-settings";

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label =
  "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";

export type SettingsFormData = {
  fromEmail: string;
  fromName: string;
  generalInboxEmail: string;
};

export function SettingsForm({ settings }: { settings: SettingsFormData }) {
  const [state, formAction, pending] = useActionState<
    SettingsFormState,
    FormData
  >(updateEmailSettings, {});

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <label className={label}>
        Outbound email (From address)
        <input
          name="fromEmail"
          type="email"
          placeholder="no-reply@yourdomain.com"
          defaultValue={settings.fromEmail}
          className={field}
        />
        <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-mec-ink/50">
          Must be on your Resend-verified domain.
        </span>
      </label>
      <label className={label}>
        From name
        <input
          name="fromName"
          placeholder="Minott Equipment & Chemicals"
          defaultValue={settings.fromName}
          className={field}
        />
      </label>
      <label className={label}>
        General requests inbox
        <input
          name="generalInboxEmail"
          type="email"
          placeholder="sales@yourdomain.com"
          defaultValue={settings.generalInboxEmail}
          className={field}
        />
        <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-mec-ink/50">
          Receives contact messages and inquiries from customers without an
          assigned sales rep, and is CC&apos;d on rep-routed inquiries.
        </span>
      </label>

      {state.error && <p className="text-sm text-mec-red">{state.error}</p>}
      {state.saved && !state.error && (
        <p className="text-sm font-semibold text-green-700">Settings saved.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Settings"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create `app/admin/(protected)/settings/page.tsx`**

```tsx
import { getEmailSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default async function AdminSettingsPage() {
  const settings = await getEmailSettings();

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Settings</h1>
      <p className="mt-3 max-w-2xl text-sm text-mec-ink/60">
        Email addresses used for inquiry notifications. Leave blank to disable
        sending (inquiries always land in Requests either way). The Resend API
        key is configured on the server, not here.
      </p>
      <div className="mt-6">
        <SettingsForm
          settings={{
            fromEmail: settings.fromEmail ?? "",
            fromName: settings.fromName ?? "",
            generalInboxEmail: settings.generalInboxEmail ?? "",
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add nav entry**

In `app/admin/(protected)/layout.tsx`, append to the `NAV` array after the Sales Reps entry:

```ts
  { href: "/admin/settings", label: "Settings" },
```

- [ ] **Step 5: Verify typecheck + manual check**

Run: `npx tsc --noEmit` — exits 0.
Run: `npm run dev`, log into `/admin`, open Settings, save addresses, reload — values persist; enter `not-an-email` in Outbound email — inline error shows. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/admin-settings.ts components/admin/SettingsForm.tsx "app/admin/(protected)/settings" "app/admin/(protected)/layout.tsx"
git commit -m "feat(admin): email settings page (outbound address, from name, general inbox)"
```

---

### Task 8: Full verification + docs touch-up `[sonnet]`

**Files:**
- Modify: `CLAUDE.md` (repo root — Known open items + Data & admin sections)

- [ ] **Step 1: Run the full verification suite**

Run (from `minott-web/`):
```bash
npx tsc --noEmit && npm run lint && npm run build
```
Expected: all three exit 0. (`npm run build` runs `prisma generate && prisma migrate deploy && next build`.)

- [ ] **Step 2: Update root `CLAUDE.md`**

In the repo-root `CLAUDE.md`:
- In **Known open items**, replace the sentence "Inquiries persist to the DB but there is **no email/notification delivery** yet (admin must check `/admin/requests`)." with: "Inquiry emails send via Resend (best-effort): internal notifications route to the assigned sales rep (CC general inbox) or the general inbox, and customers get confirmations. Configure addresses in `/admin/settings`; `RESEND_API_KEY` in `.env`."
- In **Data & admin**, add to the Env line: `RESEND_API_KEY` (optional — email skipped with a console warning when unset).

- [ ] **Step 3: Commit**

```bash
git add ../CLAUDE.md
git commit -m "docs: record Resend email delivery in CLAUDE.md"
```

- [ ] **Step 4: Manual end-to-end email test (requires real key + addresses)**

With `RESEND_API_KEY` set in `.env` and addresses saved in `/admin/settings`, run `npm run dev` and:
1. Submit the contact form anonymously → general inbox gets the notification; submitter gets the confirmation.
2. Submit a quote signed in as a portal customer assigned to an active rep (rep's email set in `/admin/sales-reps`) → rep gets the notification with the general inbox CC'd; customer gets the confirmation.
3. Submit a sample request → same routing rules as the quote.
4. Remove `RESEND_API_KEY`, restart, submit again → form still succeeds, console warns, inquiry lands in `/admin/requests`.
