# Resend Email Notifications — Design

**Date:** 2026-07-21
**Status:** Approved

## Goal

Send transactional email via Resend for the three inquiry types (contact,
sample, quote):

1. **Internal notification** — to the assigned sales rep when the submitter is
   a signed-in portal customer with a rep, otherwise to a general requests
   inbox. When a rep is the recipient, the general inbox is CC'd.
2. **Customer confirmation** — to the submitter, so every form gives feedback
   ("we received your quote request…").

Email addresses (outbound from-address, from name, general inbox) are
admin-editable in a new admin Settings section. Sending is best-effort: the
inquiry DB write is the source of truth and email failures never block or fail
the form submission.

## Context (current state)

- `lib/actions/inquiries.ts` has `submitContact`, `submitSample`,
  `submitQuote` server actions writing to the unified `Inquiry` model
  (`type: "CONTACT" | "SAMPLE" | "QUOTE"`). Quotes attach `userId` from the
  portal session when signed in.
- `SalesRep.email` (optional) exists; `User.salesRepId` links customers to
  reps.
- No settings storage and no email code exist yet. Admin panel sections:
  categories, customers, products, requests, sales-reps.
- Resend account exists with a **verified sending domain**, so the outbound
  address can be anything on that domain.

## Decisions made during brainstorm

| Question | Decision |
| --- | --- |
| Do samples send email too? | Yes — same treatment as contact and quote. |
| Rep-routed inquiries | Rep is primary recipient, general inbox CC'd. |
| Failure behavior | Best-effort; log to server console; never block the user. No status tracking on Inquiry. |
| Templates | React Email (`@react-email/components`), rendered via the Resend SDK. |
| Config storage | DB `Setting` key-value table, edited in admin. `RESEND_API_KEY` stays in `.env`. |

## 1. Data & config

New Prisma model:

```prisma
model Setting {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```

Keys used initially:

- `fromEmail` — outbound address on the verified domain (e.g. `no-reply@…`)
- `fromName` — display name (e.g. "Minott Equipment & Chemicals")
- `generalInboxEmail` — recipient for unassigned inquiries and CCs

`lib/settings.ts` exposes typed helpers: `getEmailSettings()` (reads the three
keys, returns `null`s for missing values) and an upsert used by the admin
action. No caching — reads are per-send and per-admin-page-load, both rare.

Env: `RESEND_API_KEY` added to `.env.example` with a comment. Secrets never go
in the DB.

One migration (`prisma migrate dev`) for the `Setting` table. Seed untouched —
settings are configured through the admin UI.

## 2. Email service & routing

- `lib/email/resend.ts` — Resend client singleton, mirroring the `lib/db.ts`
  globalThis pattern. Returns `null` when `RESEND_API_KEY` is unset.
- `lib/email/send-inquiry-emails.ts` — single orchestrator:
  `sendInquiryEmails(inquiryId: number)`. It:
  1. Loads the inquiry from the DB with `user → salesRep`, `items`
     (+ product/variant), and the sample `product`/`variant` relations.
  2. Loads email settings.
  3. **Skips silently (with a `console.warn`) if** the Resend client is null,
     or `fromEmail`/`generalInboxEmail` are unset — dev works with no email
     setup.
  4. Computes internal recipients: if the inquiry has a user whose sales rep
     is active and has an email → `to: rep.email`, `cc: generalInboxEmail`;
     otherwise → `to: generalInboxEmail`, no CC.
  5. Sends the **internal notification** with `replyTo` set to the customer's
     email (a rep can just hit reply).
  6. Sends the **customer confirmation** to the submitter's email.
  7. Wraps each send in try/catch; failures are `console.error`'d with the
     inquiry id and recipient. One email failing does not stop the other.

- The three server actions in `lib/actions/inquiries.ts` capture the created
  inquiry's id and call `sendInquiryEmails` inside `after()` from
  `next/server` (Next 16 — runs after the response is flushed), so the
  customer never waits on Resend.

## 3. Templates (React Email)

New deps: `resend`, `@react-email/components`.

`emails/` directory at the `minott-web/` root:

- `emails/components/` — shared branded layout: Minott red (`#E10600`) header
  bar, ink (`#0D0D0D`) text, system font stack (email clients can't load the
  site's `next/font` fonts). Values are hardcoded hex — email HTML can't read
  Tailwind tokens; a comment points back to `lib/tokens.ts`.
- `emails/inquiry-notification.tsx` — internal email: inquiry-type badge,
  contact details (name, company, email, phone), message, quote/sample item
  table (product name, variant, quantity), link to `<site>/admin/requests`.
- `emails/inquiry-confirmation.tsx` — customer email: per-type thank-you copy
  ("We received your quote request…" / contact / sample), a summary of what
  they submitted, a note that the team will follow up.

Both components take plain-serializable props (no Prisma objects) and are
passed to Resend via the `react` option. Not wiring up the `react-email` dev
preview server — YAGNI; the components remain previewable later if wanted.

## 4. Admin Settings page

- New route `app/admin/(protected)/settings/page.tsx`, added to the admin nav
  alongside the existing sections.
- Form fields: outbound from-address, from name, general requests inbox.
  Server component reads current values via `lib/settings.ts`; the form posts
  to a server action.
- `lib/actions/admin-settings.ts` — `"use server"`; validates the two address
  fields look like emails (simple regex; from name is free text), upserts the
  `Setting` rows, `revalidatePath("/admin/settings")`. Follows the existing
  admin form/action patterns and components.

## 5. Error handling

- Email failures: `console.error` with inquiry id + recipient. The inquiry is
  already persisted and visible in `/admin/requests`, so nothing is lost.
- Missing config (API key or addresses): `console.warn` + skip. Forms behave
  exactly as today.
- Invalid rep email or Resend rejection: caught per-send; the sibling email
  still goes out.

## Verification

No automated test suite exists in this repo. Per project convention:

- `npx tsc --noEmit`, `npm run lint`, `npm run build`
- Manual click-through: submit each form type twice — anonymous, and signed in
  as a portal customer assigned to a rep with an email — and confirm the
  internal + confirmation emails arrive; confirm the CC on rep-routed sends;
  confirm forms still succeed with `RESEND_API_KEY` removed.

## Out of scope

- Email delivery tracking / retries / outbox table (easy later add).
- BetterAuth verification and password-reset emails.
- Replying to inquiries from the admin panel.
- Per-type notification toggles.
