# Guest Funnel (Matching · Recovery · Registration · AR Approval) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn guest quote submissions into the SOP's three-status funnel (Verified / Potential match / New customer), add self-service password reset + MEC-account-number recovery, a prefilled New Customer Form, and an Accounts Receivable (`ar`) role that approves/rejects applications — approval creating the company, inviting the contact and keeping the original quote linked.

**Architecture:** `submitQuote` saves first, runs `lib/customer-match.ts` against portal `Company`/`User` records, stores `matchStatus` + an opaque `ref` on the `Inquiry`, and returns the outcome so the quote page branches. `/portal/recover` verifies company name + normalised MEC account number and emails reset links to users on file (stamping the quote as verified). `/register?ref=` creates a `CustomerApplication`; `/portal/applications` (admin + ar) approves it — creating `Company`, provisioning the contact, linking the quote — or rejects / requests info, each with an email. All new writes are Server Actions that re-check the session role themselves.

**Tech Stack:** Next.js 16 App Router (Server Actions, async `params`/`searchParams`, `after()`), React 19, Prisma 7 + SQLite (better-sqlite3 adapter), better-auth (`requestPasswordReset`, headerless `createUser`), `@react-email/components` + Resend, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-08-27-guest-funnel-matching-recovery-registration-design.md` — read it first; section numbers below (§N) refer to it.

## Global Constraints

- All commands run from `minott-web/` (`cd /root/Work/github/Minott/minott-web`).
- **Next.js 16 / React 19**: `params`/`searchParams`/`headers()` are async. Mutations are Server Actions (`"use server"`). Never touch `proxy.ts`, `lib/db.ts`, `prisma.config.ts`, `next.config.ts`.
- **No automated test suite.** Each task verifies with `npx tsc --noEmit` and `npm run lint` (both must be clean at the end of every task), plus the listed `npx tsx -e` checks / sqlite3 checks / manual click-throughs. `npm run build` at the end of Tasks 6, 10 and 12.
- Named exports everywhere except Next `page`/`layout`/`route` files. `@/` alias. Server Components by default; `"use client"` only for interactive components.
- Copy existing class strings exactly (`bg-mec-red`, `rounded-pill`, `font-display-tight`, `text-mec-ink/70`, etc.). Form input class used across admin forms: `"mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red"`; public-form input class: `"mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-4 py-3 text-mec-ink outline-none focus:border-mec-red"`.
- Emails: pre-render with `render()` from `@react-email/components` (html + plainText), send via `getResend()`; skip with `console.warn` when Resend/`fromEmail` unset; never throw (called from `after()`).
- Guests must never receive existing-customer data (§11). Responses on forgot/recover are constant regardless of hit/miss.
- Dev DB is `prisma/app.db` (real data — migration must preserve it). Branch: `feat/guest-funnel` (Task 1). Commit at the end of every task.
- Seeded logins: `admin@example.com` / `test123`; Task 8 adds `ar@example.com` / `test123`.

---

### Task 1: Schema + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_guest_funnel/migration.sql` (generated, then hand-augmented)

**Interfaces:**
- Produces: `Inquiry.industry/location/ref/matchStatus/matchedCompanyId/matchedCompany/application`, model `CustomerApplication`, `Company.matchHints/applications`, `User.decidedApplications/contactApplications`.

- [ ] **Step 1: Branch**

```bash
cd /root/Work/github/Minott && git checkout -b feat/guest-funnel && cd minott-web
```

- [ ] **Step 2: Edit `prisma/schema.prisma`**

In `model Inquiry`, after the line `companyId  Int?` add:

```prisma
  // --- guest funnel (spec §3) ---
  industry         String? // guest quotes only; validated against lib/industries.ts
  location         String? // guest quotes only
  ref              String?              @unique // opaque token; guest QUOTE rows only
  matchStatus      String? // "VERIFIED" | "POTENTIAL_MATCH" | "NO_MATCH"; null for CONTACT/SAMPLE + legacy rows
  matchedCompany   Company?             @relation("InquiryMatchHint", fields: [matchedCompanyId], references: [id], onDelete: SetNull)
  matchedCompanyId Int? // admin-only hint from the matcher; NEVER rendered to guests
  application      CustomerApplication?
```

Directly above `model SalesRep` add:

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
  decisionNote    String? // rejection reason, or the info request
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

In `model Company`, after `inquiries        Inquiry[]` add:

```prisma
  matchHints       Inquiry[]             @relation("InquiryMatchHint")
  applications     CustomerApplication[]
```

In `model User`, after `inquiries     Inquiry[]` add:

```prisma
  decidedApplications CustomerApplication[] @relation("ApplicationDecider")
  contactApplications CustomerApplication[] @relation("ApplicationContact")
```

- [ ] **Step 3: Generate the migration without applying**

```bash
npx prisma migrate dev --create-only --name guest_funnel
```

- [ ] **Step 4: Hand-augment the migration**

Append to the END of the generated `migration.sql`:

```sql
-- Normalise existing MEC account numbers (spec §3): trim, uppercase, strip spaces and dashes.
UPDATE "Company"
SET "mecAccountNumber" = UPPER(REPLACE(REPLACE(TRIM("mecAccountNumber"), ' ', ''), '-', ''))
WHERE "mecAccountNumber" IS NOT NULL;
```

- [ ] **Step 5: Apply + verify**

```bash
npx prisma migrate dev
sqlite3 prisma/app.db "PRAGMA table_info('Inquiry');" | grep -E "industry|location|ref|matchStatus|matchedCompanyId"
sqlite3 prisma/app.db "SELECT name FROM sqlite_master WHERE name='CustomerApplication';"
sqlite3 prisma/app.db "SELECT id, mecAccountNumber FROM Company;"
npx tsc --noEmit
```
Expected: five Inquiry columns listed; `CustomerApplication` printed; account numbers uppercase with no spaces/dashes; tsc clean.

- [ ] **Step 6: Commit**

```bash
git add prisma && git commit -m "feat(funnel): Inquiry match fields, CustomerApplication model, normalised account numbers"
```

---

### Task 2: Industries, matcher, rate-limit buckets, constants

**Files:**
- Create: `lib/industries.ts`, `lib/customer-match.ts`, `lib/request-ip.ts`
- Modify: `lib/rate-limit.ts`, `lib/constants.ts`

**Interfaces:**
- Produces:
  - `INDUSTRIES: readonly string[]`, `type Industry`, `isIndustry(v: unknown): v is Industry`
  - `normalizeEmail`, `normalizePhone`, `phoneKey`, `normalizeCompanyName`, `normalizeAccountNumber`, `matchGuest(input): Promise<MatchResult>`, types `MatchStatus`, `MatchResult`
  - `checkRateLimit(key: string, opts?: { max?: number; windowMs?: number })` (backwards compatible with `checkRateLimit(ip)`)
  - `currentRequestIp(): Promise<string>`
  - `MATCH_STATUS`, `MATCH_STATUS_LABELS`, `APPLICATION_STATUS`, `APPLICATION_STATUS_LABELS`

- [ ] **Step 1: `lib/industries.ts`**

```ts
/**
 * Approved Industry dropdown (spec §3). Single source for the guest quote
 * form, the New Customer Form and the admin/rep CompanyForm. Swap the entries
 * for MEC's official list when supplied — nothing else needs to change.
 */
export const INDUSTRIES = [
  "Hospitality & Tourism",
  "Healthcare & Medical",
  "Manufacturing & Industrial",
  "Food & Beverage",
  "Financial Services",
  "Telecoms",
  "Entertainment & Events",
  "Retail",
  "Education",
  "Government & Public Sector",
  "Property & Facilities Management",
  "Janitorial & Cleaning Services",
  "Distribution & Wholesale",
  "Personal / Individual",
  "Other",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export function isIndustry(v: unknown): v is Industry {
  return typeof v === "string" && (INDUSTRIES as readonly string[]).includes(v);
}
```

- [ ] **Step 2: `lib/customer-match.ts`**

```ts
import "server-only";
import { db } from "@/lib/db";

/**
 * Guest-submission matching engine (spec §4). Compares a guest's submitted
 * email / phone / company name against PORTAL records only (customer users +
 * companies). Never exposes what matched to the guest — the matchedCompanyId
 * hint is for admins.
 */
export type MatchStatus = "VERIFIED" | "POTENTIAL_MATCH" | "NO_MATCH";
export type MatchResult = {
  status: Exclude<MatchStatus, "VERIFIED">;
  matchedCompanyId: number | null;
};

export function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

export function normalizePhone(s: string): string {
  return s.replace(/\D/g, "");
}

/** Last 7 digits — tolerant of +1 / 876 / spacing variants. Null when too short. */
export function phoneKey(s: string | null | undefined): string | null {
  if (!s) return null;
  const digits = normalizePhone(s);
  return digits.length >= 7 ? digits.slice(-7) : null;
}

const COMPANY_SUFFIXES = new Set(["ltd", "limited", "co", "company", "inc", "jamaica"]);

export function normalizeCompanyName(s: string): string {
  const tokens = s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  while (tokens.length > 1 && COMPANY_SUFFIXES.has(tokens[tokens.length - 1]!)) tokens.pop();
  return tokens.join(" ");
}

export function normalizeAccountNumber(s: string): string {
  return s.trim().toUpperCase().replace(/[\s-]/g, "");
}

export async function matchGuest(input: {
  email: string;
  phone: string;
  company: string;
}): Promise<MatchResult> {
  // 1) email
  const email = normalizeEmail(input.email);
  if (email) {
    const byEmail = await db.user.findFirst({
      where: { email, role: "customer" },
      select: { companyId: true },
    });
    if (byEmail) return { status: "POTENTIAL_MATCH", matchedCompanyId: byEmail.companyId };
  }

  // 2) phone (JS compare — SQLite can't normalise phones in-query)
  const key = phoneKey(input.phone);
  if (key) {
    const users = await db.user.findMany({
      where: { role: "customer", OR: [{ phone: { not: null } }, { whatsapp: { not: null } }] },
      select: { companyId: true, phone: true, whatsapp: true },
    });
    const hit = users.find((u) => phoneKey(u.phone) === key || phoneKey(u.whatsapp) === key);
    if (hit) return { status: "POTENTIAL_MATCH", matchedCompanyId: hit.companyId };
  }

  // 3) company name
  const name = normalizeCompanyName(input.company);
  if (name) {
    const companies = await db.company.findMany({ select: { id: true, name: true } });
    const hit = companies.find((c) => normalizeCompanyName(c.name) === name);
    if (hit) return { status: "POTENTIAL_MATCH", matchedCompanyId: hit.id };
  }

  return { status: "NO_MATCH", matchedCompanyId: null };
}
```

Check `server-only` is installed: `ls node_modules/server-only >/dev/null 2>&1 || npm i server-only`.

- [ ] **Step 3: Extend `lib/rate-limit.ts`**

Replace the `checkRateLimit` function with a keyed, configurable version (keep `clientIp` and the constants):

```ts
export function checkRateLimit(
  key: string,
  opts: { max?: number; windowMs?: number } = {},
): { ok: boolean; retryAfter?: number } {
  const max = opts.max ?? MAX_REQUESTS;
  const windowMs = opts.windowMs ?? WINDOW_MS;
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    if (buckets.size >= MAX_BUCKETS) prune(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= max) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { ok: true };
}
```

Update the doc comment's first line to "Tiny in-memory fixed-window rate limiter keyed by an arbitrary string (IP, or `bucket:ip` for per-feature limits)." The existing caller `lib/api/http.ts` (`checkRateLimit(ip)`) keeps working.

- [ ] **Step 4: `lib/request-ip.ts`**

```ts
import { headers } from "next/headers";

/** Best-effort client IP inside Server Actions / Server Components. */
export async function currentRequestIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}
```

- [ ] **Step 5: Append to `lib/constants.ts`**

```ts
export const MATCH_STATUS = {
  VERIFIED: "VERIFIED",
  POTENTIAL_MATCH: "POTENTIAL_MATCH",
  NO_MATCH: "NO_MATCH",
} as const;

export const MATCH_STATUS_LABELS: Record<string, string> = {
  VERIFIED: "Verified",
  POTENTIAL_MATCH: "Potential match",
  NO_MATCH: "New customer",
};

export const APPLICATION_STATUS = {
  SUBMITTED: "SUBMITTED",
  INFO_REQUESTED: "INFO_REQUESTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  INFO_REQUESTED: "Info requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};
```

- [ ] **Step 6: Verify the pure functions**

```bash
npx tsx -e '
import { normalizeCompanyName, phoneKey, normalizeAccountNumber } from "./lib/customer-match";
const eq = (a:any,b:any,m:string)=>{ if(a!==b) throw new Error(m+": "+JSON.stringify(a)+" != "+JSON.stringify(b)); };
eq(normalizeCompanyName("FloPro Ltd."), "flopro", "suffix ltd");
eq(normalizeCompanyName("Minott Equipment & Chemicals Limited"), "minott equipment and chemicals", "suffix limited");
eq(normalizeCompanyName("Company"), "company", "single token kept");
eq(phoneKey("+1 (876) 555-1234"), "5551234", "phone key");
eq(phoneKey("12345"), null, "short phone");
eq(normalizeAccountNumber(" mec-00 12 "), "MEC0012", "account number");
console.log("ok");
'
npx tsc --noEmit && npm run lint
```
Note: `server-only` throws when imported outside a React server context — if the `tsx -e` check errors with the server-only message, temporarily run it with `NODE_OPTIONS=--import=./node_modules/server-only/empty.js`… simpler: move the three pure normalisers into `lib/customer-match-normalize.ts` (no `server-only` import) and re-export them from `lib/customer-match.ts`. Do that if and only if the check fails for that reason.

- [ ] **Step 7: Commit**

```bash
git add lib && git commit -m "feat(funnel): industry taxonomy, customer matcher, keyed rate limits, status constants"
```

---

### Task 3: Company form → industry select; account-number normalisation on write

**Files:**
- Modify: `components/admin/CompanyForm.tsx`, `lib/actions/companies.ts`, `lib/actions/sales.ts` (rep company edit)

**Interfaces:**
- Consumes: `INDUSTRIES`, `normalizeAccountNumber` (Task 2).

- [ ] **Step 1: Industry select in `CompanyForm.tsx`**

Add `import { INDUSTRIES } from "@/lib/industries";` and replace the Industry label block with:

```tsx
      <label className={label}>
        Industry
        <select name="industry" defaultValue={company?.industry ?? ""} className={field}>
          <option value="">— Select —</option>
          {company?.industry && !(INDUSTRIES as readonly string[]).includes(company.industry) && (
            <option value={company.industry}>{company.industry} (legacy)</option>
          )}
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </label>
```

- [ ] **Step 2: Normalise on write in `lib/actions/companies.ts`**

Add `import { normalizeAccountNumber } from "@/lib/customer-match";` and change `companyFields`:

```ts
function companyFields(formData: FormData) {
  const acct = str(formData, "mecAccountNumber");
  return {
    name: str(formData, "name"),
    mecAccountNumber: acct ? normalizeAccountNumber(acct) : null,
    industry: str(formData, "industry") || null,
    location: str(formData, "location") || null,
  };
}
```

- [ ] **Step 3: Rep company edit**

Open `lib/actions/sales.ts`, find `updateRepCompany`. It only writes `name/industry/location` — no change needed unless it also touches `mecAccountNumber` (it shouldn't). Find the rep-side form that renders the industry input (`grep -rn "name=\"industry\"" components app`); if a rep form other than `CompanyForm` exists, apply the same `<select>` block from Step 1 there.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit && npm run lint
```
Manual: `npm run dev`, sign in as admin, `/portal/customers/new` — Industry is a select; save a company with account number `mec-12 34` → `/portal/customers/[id]` shows `MEC1234`.

- [ ] **Step 5: Commit**

```bash
git add components lib && git commit -m "feat(funnel): industry dropdown on company forms, normalised account numbers on write"
```

---

### Task 4: `submitQuote` classification + email classification line

**Files:**
- Modify: `lib/actions/inquiries.ts`, `lib/email/send-inquiry-emails.tsx`, `emails/inquiry-notification.tsx`, `emails/inquiry-confirmation.tsx`

**Interfaces:**
- Consumes: `matchGuest`, `isIndustry`, `MATCH_STATUS`.
- Produces: `export type QuoteResult = { ok: false; error?: string } | { ok: true; outcome: MatchStatus; ref?: string }`; `submitQuote(_prev: QuoteResult, formData): Promise<QuoteResult>`; `sendInquiryEmails(inquiryId: number, opts?: { verifiedNow?: boolean })`.

- [ ] **Step 1: `lib/actions/inquiries.ts`**

Add imports:

```ts
import { randomBytes } from "crypto";
import { matchGuest, type MatchStatus } from "@/lib/customer-match";
import { isIndustry } from "@/lib/industries";
import { MATCH_STATUS } from "@/lib/constants";
```

Add after `InquiryResult`:

```ts
export type QuoteResult =
  | { ok: false; error?: string }
  | { ok: true; outcome: MatchStatus; ref?: string };
```

Replace `submitQuote` with:

```ts
export async function submitQuote(
  _prev: QuoteResult,
  formData: FormData,
): Promise<QuoteResult> {
  const bad = requireContact(formData);
  if (bad) return bad;

  let items: CartLine[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { ok: false, error: "Could not read your quote list." };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "Your quote list is empty." };
  }

  // Signed-in: attach to the account + company from the session (never the
  // form) and skip matching — a known account is VERIFIED by definition.
  const session = await getPortalSession();
  const scope = session ? await getCustomerScope(session.user.id) : null;

  const name = field(formData, "name");
  const email = field(formData, "email");
  const company = field(formData, "company") || null;
  const phone = field(formData, "phone") || null;
  const message = field(formData, "message") || null;

  // Guest-only fields (spec §5).
  let industry: string | null = null;
  let location: string | null = null;
  let ref: string | null = null;
  let matchStatus: MatchStatus = MATCH_STATUS.VERIFIED;
  let matchedCompanyId: number | null = null;

  if (!session) {
    industry = field(formData, "industry");
    location = field(formData, "location");
    if (!isIndustry(industry)) return { ok: false, error: "Please choose your industry." };
    if (!location) return { ok: false, error: "Location is required." };
    ref = randomBytes(24).toString("base64url");
    try {
      const m = await matchGuest({ email, phone: phone ?? "", company: company ?? "" });
      matchStatus = m.status;
      matchedCompanyId = m.matchedCompanyId;
    } catch (e) {
      // Never lose a quote because the matcher failed.
      console.error("[match] matcher threw — treating as NO_MATCH:", e);
      matchStatus = MATCH_STATUS.NO_MATCH;
    }
  }

  const badges = await getLiveDealBadges();

  const inquiry = await db.inquiry.create({
    data: {
      type: INQUIRY_TYPE.QUOTE,
      userId: session?.user.id ?? null,
      companyId: scope?.companyId ?? null,
      name,
      email,
      company,
      phone,
      message,
      industry,
      location,
      ref,
      matchStatus,
      matchedCompanyId,
      items: {
        create: items.map((i) => ({
          productId: typeof i.productId === "number" ? i.productId : null,
          variantId: typeof i.variantId === "number" ? i.variantId : null,
          productName: String(i.productName).slice(0, 200),
          quantity:
            Number.isFinite(i.quantity) && i.quantity > 0 ? Math.floor(i.quantity) : 1,
          dealLabel: pickBadgeForVariant(
            badges,
            typeof i.productId === "number" ? i.productId : -1,
            typeof i.variantId === "number" ? i.variantId : null,
          ),
        })),
      },
    },
  });
  after(() => sendInquiryEmails(inquiry.id));
  return session
    ? { ok: true, outcome: MATCH_STATUS.VERIFIED }
    : { ok: true, outcome: matchStatus, ref: ref ?? undefined };
}
```

`requireContact` returns `InquiryResult`; it is structurally compatible with the `ok: false` branch of `QuoteResult` — if tsc complains, change its return type to `{ ok: false; error: string } | null`.

- [ ] **Step 2: Notification email classification line**

`emails/inquiry-notification.tsx` — add to `InquiryNotificationProps`:

```ts
  /** Guest-quote classification line for internal recipients (spec §5), or null. */
  classification: string | null;
```

Render it directly under the `repName` block:

```tsx
      {props.classification && (
        <Text style={{ color: emailColors.red, fontSize: 13, fontWeight: 700, margin: "4px 0 0" }}>
          {props.classification}
        </Text>
      )}
```

- [ ] **Step 3: Confirmation email register link**

`emails/inquiry-confirmation.tsx` — add prop `registerUrl: string | null` and, before the final `<Hr>`, render:

```tsx
      {props.registerUrl && (
        <>
          <Hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "20px 0" }} />
          <Text style={{ color: emailColors.ink, fontSize: 14, margin: 0 }}>
            To open an MEC account, complete the short New Customer Form — we&apos;ve
            prefilled it from your request:{" "}
            <Link href={props.registerUrl} style={{ color: emailColors.red }}>
              Complete New Customer Form →
            </Link>
          </Text>
        </>
      )}
```
(add `Link` to the `@react-email/components` import.)

- [ ] **Step 4: `lib/email/send-inquiry-emails.tsx`**

Change the signature to `export async function sendInquiryEmails(inquiryId: number, opts: { verifiedNow?: boolean } = {}): Promise<void>` Compute after `typeLabel`:

```ts
    const classification =
      inquiry.type === "QUOTE" && !inquiry.userId
        ? inquiry.matchStatus === "POTENTIAL_MATCH"
          ? "Potential existing customer — unverified (verification required before linking)"
          : inquiry.matchStatus === "NO_MATCH"
            ? "New customer — New Customer Form pending"
            : opts.verifiedNow
              ? "Existing customer — verified"
              : null
        : null;
    const registerUrl =
      inquiry.type === "QUOTE" && inquiry.matchStatus === "NO_MATCH" && inquiry.ref
        ? `${baseUrl}/register?ref=${inquiry.ref}`
        : null;
```

Pass `classification={classification}` to `<InquiryNotification>` and `registerUrl={registerUrl}` to `<InquiryConfirmation>`. Prefix the internal subject with `"Verified: "` when `opts.verifiedNow`. Skip block 2 (customer confirmation) entirely when `opts.verifiedNow` (the customer already got one at submit time):

```ts
    if (opts.verifiedNow) return;
```
placed right before `// 2) Customer confirmation.`

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit && npm run lint
```
Expected: tsc reports errors ONLY in `components/quote/QuotePageClient.tsx` (the `InquiryResult` → `QuoteResult` type change). Those are fixed in Task 5.

- [ ] **Step 6: Commit**

```bash
git add lib emails && git commit -m "feat(funnel): classify guest quotes at submit, classification line in internal email"
```

---

### Task 5: Quote page — guest fields + outcome panels

**Files:**
- Modify: `components/quote/QuotePageClient.tsx`

**Interfaces:**
- Consumes: `QuoteResult`, `submitQuote` (Task 4), `INDUSTRIES` (Task 2).

- [ ] **Step 1: Types + state**

Replace the `submitQuote, type InquiryResult` import with `submitQuote, type QuoteResult` and `const initial: QuoteResult = { ok: false };`. Add `import { INDUSTRIES } from "@/lib/industries";`. `useActionState(submitQuote, initial)` stays.

- [ ] **Step 2: Outcome panels**

Replace the `if (state.ok) { ... }` block with:

```tsx
  if (state.ok) {
    const panel = "rounded-md border border-mec-red/30 bg-mec-red/5 p-8";
    const primary =
      "mt-6 inline-block bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover";
    const secondary =
      "ml-4 mt-6 inline-block border border-mec-ink/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink transition-colors hover:border-mec-red hover:text-mec-red";

    if (state.outcome === "POTENTIAL_MATCH") {
      return (
        <div className={panel}>
          <h2 className="font-display-tight text-h2 text-mec-ink">Quote request received.</h2>
          <p className="mt-3 max-w-xl text-mec-ink/75">
            Our records suggest an MEC account may already be associated with the
            details you provided. Sign in to attach this quote to your account, or
            recover access using the MEC account number shown on your invoices.
          </p>
          <Link href="/portal/sign-in?next=/portal" className={primary}>Sign in</Link>
          <Link href={`/portal/recover?ref=${state.ref ?? ""}`} className={secondary}>Recover account</Link>
        </div>
      );
    }

    if (state.outcome === "NO_MATCH") {
      return (
        <div className={panel}>
          <h2 className="font-display-tight text-h2 text-mec-ink">Quote request received.</h2>
          <p className="mt-3 max-w-xl text-mec-ink/75">
            To open an MEC account, complete the short New Customer Form — we&apos;ve
            prefilled it from your request. Your quote stays attached while your
            application is reviewed.
          </p>
          <Link href={`/register?ref=${state.ref ?? ""}`} className={primary}>Complete New Customer Form</Link>
        </div>
      );
    }

    return (
      <div className={panel}>
        <h2 className="font-display-tight text-h2 text-mec-ink">Quote request sent.</h2>
        <p className="mt-3 max-w-xl text-mec-ink/75">
          Thanks — a sales consultant will price your list and respond within one
          business day.
        </p>
        <Link href="/products" className={primary}>Back to Products</Link>
        {portalUser && (
          <Link href="/portal/history" className={secondary}>View Quote History</Link>
        )}
      </div>
    );
  }
```

- [ ] **Step 3: Guest fields**

After the Phone `<label>` and before Notes, add:

```tsx
          {!portalUser && (
            <>
              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
                Industry *
                <select name="industry" required defaultValue="" className={inputCls}>
                  <option value="" disabled>Select your industry</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
                Location *
                <input name="location" required placeholder="e.g. Kingston" className={inputCls} />
              </label>
            </>
          )}
```

Also make Company and Phone required for guests (`required={!portalUser}`) — the matcher needs them and the SOP lists both as required (§C.1).

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit && npm run lint
```
Manual (`npm run dev`): signed-out `/quote` with items → Industry/Location present; submit with a brand-new email → "Complete New Customer Form" panel (link contains `ref=`); `sqlite3 prisma/app.db "SELECT id, matchStatus, ref, industry, location FROM Inquiry ORDER BY id DESC LIMIT 1;"` shows `NO_MATCH`. Submit again using the seeded customer's email (`sqlite3 prisma/app.db "SELECT email FROM user WHERE role='customer' LIMIT 1;"`) → "Sign in / Recover account" panel; row shows `POTENTIAL_MATCH` and a `matchedCompanyId`. Signed-in submit → unchanged panel, no new fields.

- [ ] **Step 5: Commit**

```bash
git add components && git commit -m "feat(funnel): guest industry/location fields and three-outcome quote panels"
```

---

### Task 6: Forgot password (all roles) + reset-mode set-password

**Files:**
- Create: `app/portal/forgot-password/page.tsx`, `components/portal/ForgotPasswordForm.tsx`
- Modify: `lib/actions/portal.ts`, `app/portal/sign-in/page.tsx`, `app/set-password/page.tsx`, `emails/account-invite.tsx`, `lib/email/send-account-invite.tsx`

**Interfaces:**
- Consumes: `checkRateLimit(key, opts)`, `currentRequestIp()` (Task 2).
- Produces: `requestPasswordResetEmail(_prev: ForgotState, formData): Promise<ForgotState>` with `export type ForgotState = { done?: boolean; error?: string }`; `AccountInviteProps.variant: "invite" | "reset" | "approved"` (replaces `isInvite`).

- [ ] **Step 1: Action in `lib/actions/portal.ts`**

Add imports `import { checkRateLimit } from "@/lib/rate-limit";` and `import { currentRequestIp } from "@/lib/request-ip";`, then:

```ts
export type ForgotState = { done?: boolean; error?: string };

/**
 * Self-service password reset for every portal role. Always resolves to the
 * same `done` state whether or not the email exists (no account enumeration).
 * Per-IP limited: 5 requests / 15 min.
 */
export async function requestPasswordResetEmail(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const ip = await currentRequestIp();
  const limit = checkRateLimit(`forgot:${ip}`, { max: 5, windowMs: 15 * 60_000 });
  if (!limit.ok) return { error: "Too many attempts. Please try again later." };

  const email = str(formData, "email").toLowerCase();
  if (!email) return { error: "Email is required." };

  const user = await db.user.findUnique({ where: { email }, select: { role: true } });
  const portal =
    user?.role === "rep" ? "sales" : user?.role === "admin" || user?.role === "ar" ? "admin" : "customer";
  try {
    await auth.api.requestPasswordReset({
      body: { email, redirectTo: `/set-password?portal=${portal}&mode=reset` },
    });
  } catch (e) {
    console.error("[forgot] requestPasswordReset failed:", e);
  }
  return { done: true };
}
```

- [ ] **Step 2: `components/portal/ForgotPasswordForm.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import { requestPasswordResetEmail, type ForgotState } from "@/lib/actions/portal";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<ForgotState, FormData>(
    requestPasswordResetEmail,
    {},
  );

  if (state.done) {
    return (
      <p className="mt-6 rounded-sm border border-mec-ink/15 bg-mec-mist px-4 py-3 text-sm text-mec-ink">
        If that address has a Minott account, we&apos;ve emailed a link to reset
        your password. The link is valid for 72 hours.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-8" noValidate>
      <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-[0.16em] text-mec-ink/60">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        autoFocus
        required
        className="mt-2 w-full rounded-sm border border-mec-ink/20 bg-mec-pure px-4 py-3 text-mec-ink outline-none transition-colors focus:border-mec-red"
      />
      {state.error && (
        <p role="alert" className="mt-5 rounded-sm border border-mec-red/30 bg-mec-red/5 px-4 py-3 text-sm text-mec-red">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-7 w-full bg-mec-red px-6 py-3.5 font-semibold uppercase tracking-[0.14em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50"
      >
        {pending ? "Sending…" : "Email me a reset link"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: `app/portal/forgot-password/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { ForgotPasswordForm } from "@/components/portal/ForgotPasswordForm";
import { getPortalSession } from "@/lib/portal";

export const metadata: Metadata = {
  title: "Forgot Password | Minott Equipment & Chemicals",
};

export default async function ForgotPasswordPage() {
  const session = await getPortalSession();
  if (session) redirect("/portal");

  return (
    <section className="grid min-h-[80vh] place-items-center bg-mec-mist px-6 py-[var(--spacing-section-y)] text-mec-ink">
      <div className="w-full max-w-md">
        <div className="rounded-md border border-mec-ink/10 bg-mec-pure p-8 shadow-[0_24px_48px_-12px_rgba(13,13,13,0.08)] md:p-10">
          <Eyebrow>Accounts Portal</Eyebrow>
          <h1 className="mt-4 font-display-tight text-4xl leading-none tracking-tight md:text-5xl">
            Forgot your password?
          </h1>
          <p className="mt-3 text-sm text-mec-ink/65">
            Enter the email on your account and we&apos;ll send a reset link.
          </p>
          <ForgotPasswordForm />
          <p className="mt-8 border-t border-mec-ink/10 pt-6 text-sm text-mec-ink/65">
            Don&apos;t know your login email?{" "}
            <Link href="/portal/recover" className="font-semibold text-mec-red hover:underline">
              Recover with your MEC account number
            </Link>
          </p>
        </div>
        <p className="mt-6 text-center text-xs text-mec-ink/50">
          <Link href="/portal/sign-in" className="hover:text-mec-red">← Back to sign in</Link>
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Sign-in link**

In `app/portal/sign-in/page.tsx`, directly after `<SignInForm next={safeNext} />` add:

```tsx
          <p className="mt-4 text-sm">
            <Link href="/portal/forgot-password" className="font-semibold text-mec-red hover:underline">
              Forgot your password?
            </Link>
          </p>
```

- [ ] **Step 5: Reset mode on `/set-password`**

`app/set-password/page.tsx`: extend `searchParams` type with `mode?: string`, read `mode`, and:

```tsx
  const isReset = mode === "reset";
  ...
  <h1 ...>{isReset ? "Reset your password" : "Set your password"}</h1>
  <p ...>
    {isReset
      ? "Choose a new password for your Minott Equipment & Chemicals account."
      : "Choose a password to activate your Minott Equipment & Chemicals account."}
  </p>
```
Also in `components/auth/SetPasswordForm.tsx`, the invalid-token copy becomes: "This link is invalid or has expired. Request a new one from the sign-in page, or ask a MEC administrator to resend your invitation."

- [ ] **Step 6: Email variant**

`emails/account-invite.tsx`: replace `isInvite: boolean` with `variant: "invite" | "reset" | "approved"`. Add to each `COPY[portal]` an `approved` entry (only `customer` needs real copy; sales/admin can reuse their `invite` object by spreading):

```ts
  customer: {
    invite: { ...as today... },
    reset: { ...as today... },
    approved: {
      heading: "Your MEC account has been approved",
      body: "Your Minott Equipment & Chemicals account application has been approved. Set your password to activate your account — the quote you submitted is already waiting in your history.",
      cta: "Set your password",
    },
  },
```
and `const copy = COPY[portal][variant];`. Change the footer sentence to: "This link expires in 72 hours. If it lapses, request a new one from the sign-in page or ask a MEC administrator to resend it."

`lib/email/send-account-invite.tsx`: map roles `const portal = user.role === "rep" ? "sales" : user.role === "admin" || user.role === "ar" ? "admin" : "customer";`, then:

```ts
    const approvedApp =
      user.activatedAt === null && user.role === "customer"
        ? await db.customerApplication.findFirst({
            where: { userId, status: "APPROVED" },
            select: { id: true },
          })
        : null;
    const variant = approvedApp ? "approved" : user.activatedAt === null ? "invite" : "reset";
```
Pass `variant={variant}`; subject: `variant === "approved" ? "Your MEC account has been approved" : variant === "invite" ? (existing per-portal invite subjects, with `ar`→"Set up your MEC accounts access" when `user.role === "ar"`) : "Reset your Minott password"`.

- [ ] **Step 7: Verify**

```bash
npx tsc --noEmit && npm run lint && npm run build
```
Manual: `/portal/sign-in` shows the link; `/portal/forgot-password` with `admin@example.com` → done message and (with no `RESEND_API_KEY`) a `[email] RESEND_API_KEY unset` warning in the server log; an unknown email → identical done message; sixth attempt within 15 min → "Too many attempts". If you have Resend configured, the link lands on `/set-password?...&mode=reset` with the "Reset your password" heading.

- [ ] **Step 8: Commit**

```bash
git add app components lib emails && git commit -m "feat(auth): self-service forgot-password for all roles, reset-mode set-password"
```

---

### Task 7: `/portal/recover` — MEC account number verification

**Files:**
- Create: `lib/actions/recover.ts`, `components/portal/RecoverForm.tsx`, `app/portal/recover/page.tsx`

**Interfaces:**
- Consumes: `normalizeAccountNumber`, `normalizeCompanyName` (Task 2), `sendInvite` (`lib/auth/provision.ts`), `sendInquiryEmails(id, { verifiedNow })` (Task 4), rate limit helpers.
- Produces: `recoverAccount(_prev: RecoverState, formData): Promise<RecoverState>`, `export type RecoverState = { done?: boolean; error?: string }`.

- [ ] **Step 1: `lib/actions/recover.ts`**

```ts
"use server";

import { after } from "next/server";
import { db } from "@/lib/db";
import { sendInvite } from "@/lib/auth/provision";
import { normalizeAccountNumber, normalizeCompanyName } from "@/lib/customer-match";
import { checkRateLimit } from "@/lib/rate-limit";
import { currentRequestIp } from "@/lib/request-ip";
import { sendInquiryEmails } from "@/lib/email/send-inquiry-emails";
import { MATCH_STATUS } from "@/lib/constants";

export type RecoverState = { done?: boolean; error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Account recovery gated on the MEC account number (spec §7). Constant
 * response on hit and miss; never reveals which email(s) were contacted.
 * On a hit, reset links go to every active customer user of the company
 * (max 10) and, when a guest quote `ref` is supplied, that quote is stamped
 * as belonging to the company (Status 1 — Verified).
 */
export async function recoverAccount(
  _prev: RecoverState,
  formData: FormData,
): Promise<RecoverState> {
  const ip = await currentRequestIp();
  const limit = checkRateLimit(`recover:${ip}`, { max: 5, windowMs: 15 * 60_000 });
  if (!limit.ok) return { error: "Too many attempts. Please try again later." };

  const companyName = str(formData, "companyName");
  const accountRaw = str(formData, "accountNumber");
  const ref = str(formData, "ref");
  if (!companyName) return { error: "Company name is required." };
  if (!accountRaw) return { error: "MEC account number is required." };

  const accountNumber = normalizeAccountNumber(accountRaw);
  const company = await db.company.findUnique({
    where: { mecAccountNumber: accountNumber },
    select: { id: true, name: true },
  });
  const matched =
    company && normalizeCompanyName(company.name) === normalizeCompanyName(companyName);

  if (!matched) {
    console.warn(`[recover] no match for account ${accountNumber} from ${ip}`);
    return { done: true };
  }

  const users = await db.user.findMany({
    where: { companyId: company.id, role: "customer", NOT: { banned: true } },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: { email: true },
  });
  for (const u of users) {
    await sendInvite(u.email, "/set-password?portal=customer&mode=reset");
  }

  if (ref) {
    const quote = await db.inquiry.findUnique({
      where: { ref },
      select: { id: true, type: true, companyId: true },
    });
    if (quote && quote.type === "QUOTE" && quote.companyId === null) {
      await db.inquiry.update({
        where: { id: quote.id },
        data: {
          companyId: company.id,
          matchStatus: MATCH_STATUS.VERIFIED,
          matchedCompanyId: null,
        },
      });
      after(() => sendInquiryEmails(quote.id, { verifiedNow: true }));
    }
  }

  return { done: true };
}
```
Note: `"use server"` files may only export async functions — the constant "done" sentence lives in the client form below.

- [ ] **Step 2: `components/portal/RecoverForm.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import { recoverAccount, type RecoverState } from "@/lib/actions/recover";

const inputCls =
  "mt-2 w-full rounded-sm border border-mec-ink/20 bg-mec-pure px-4 py-3 text-mec-ink outline-none transition-colors focus:border-mec-red";
const labelCls =
  "mt-6 block text-xs font-semibold uppercase tracking-[0.16em] text-mec-ink/60 first:mt-0";

export function RecoverForm({ refToken }: { refToken: string | null }) {
  const [state, formAction, pending] = useActionState<RecoverState, FormData>(
    recoverAccount,
    {},
  );

  if (state.done) {
    return (
      <p className="mt-6 rounded-sm border border-mec-ink/15 bg-mec-mist px-4 py-3 text-sm text-mec-ink">
        If your details matched an MEC account, password instructions have been
        sent to the email address on file. If you don&apos;t receive anything,
        contact your MEC sales representative.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-8" noValidate>
      {refToken && <input type="hidden" name="ref" value={refToken} />}
      <label htmlFor="companyName" className={labelCls}>Company name</label>
      <input id="companyName" name="companyName" required autoFocus className={inputCls} />
      <label htmlFor="accountNumber" className={labelCls}>MEC account number</label>
      <input id="accountNumber" name="accountNumber" required autoComplete="off" className={inputCls} />
      <p className="mt-2 text-xs text-mec-ink/55">
        Your account number appears on previous MEC invoices.
      </p>
      {state.error && (
        <p role="alert" className="mt-5 rounded-sm border border-mec-red/30 bg-mec-red/5 px-4 py-3 text-sm text-mec-red">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-7 w-full bg-mec-red px-6 py-3.5 font-semibold uppercase tracking-[0.14em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50"
      >
        {pending ? "Checking…" : "Recover account"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: `app/portal/recover/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RecoverForm } from "@/components/portal/RecoverForm";

export const metadata: Metadata = {
  title: "Recover Your Account | Minott Equipment & Chemicals",
};

export default async function RecoverPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const { ref } = await searchParams;
  const refToken = typeof ref === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(ref) ? ref : null;

  return (
    <section className="grid min-h-[80vh] place-items-center bg-mec-mist px-6 py-[var(--spacing-section-y)] text-mec-ink">
      <div className="w-full max-w-md">
        <div className="rounded-md border border-mec-ink/10 bg-mec-pure p-8 shadow-[0_24px_48px_-12px_rgba(13,13,13,0.08)] md:p-10">
          <Eyebrow>Accounts Portal</Eyebrow>
          <h1 className="mt-4 font-display-tight text-4xl leading-none tracking-tight md:text-5xl">
            Recover your account
          </h1>
          <p className="mt-3 text-sm text-mec-ink/65">
            Verify your company with the MEC account number from your invoices and
            we&apos;ll send password instructions to the email on file.
            {refToken && " Your quote request will be attached to your account."}
          </p>
          <RecoverForm refToken={refToken} />
        </div>
        <p className="mt-6 text-center text-xs text-mec-ink/50">
          <Link href="/portal/sign-in" className="hover:text-mec-red">← Back to sign in</Link>
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit && npm run lint
```
Manual: give the seeded customer's company an account number in `/portal/customers/[id]` (e.g. `MEC1001`). Submit a guest quote with that company's name → potential-match panel → Recover → wrong number → done message; correct number + name → identical done message, server log shows the reset warning/attempt, and `sqlite3 prisma/app.db "SELECT id, companyId, matchStatus FROM Inquiry ORDER BY id DESC LIMIT 1;"` shows the company id + `VERIFIED`.

- [ ] **Step 5: Commit**

```bash
git add app components lib && git commit -m "feat(auth): MEC account-number recovery with quote verification"
```

---

### Task 8: AR role plumbing

**Files:**
- Modify: `lib/auth/provision.ts`, `lib/actions/admins.ts`, `components/admin/AdminAccountForm.tsx`, `app/portal/(protected)/admins/page.tsx`, `lib/portal.ts`, `lib/auth/require-admin.ts`, `app/portal/(protected)/layout.tsx`, `app/portal/(protected)/page.tsx`, `prisma/seed.ts`, `scripts/bootstrap.ts`
- Create: `components/portal/dashboards/ArDashboard.tsx`

**Interfaces:**
- Produces: `provisionUser({ role: "customer" | "rep" | "admin" | "ar", skipInvite?: boolean, ... })`, `INVITE_REDIRECT.ar`, `requireRoleSession(roles: string[])` (lib/portal.ts), `requireRole(roles: string[])` (lib/auth/require-admin.ts), `getStaffUsers()` (replaces `getAdminUsers`, returns admin + ar rows with `role`).

- [ ] **Step 1: `lib/auth/provision.ts`**

Change the `role` union to `"customer" | "rep" | "admin" | "ar"`, add `skipInvite?: boolean` to `opts`, and replace `await sendInvite(email, redirectTo);` with `if (!skipInvite) await sendInvite(email, redirectTo);` (destructure `skipInvite`). Add `ar: "/set-password?portal=admin",` to `INVITE_REDIRECT`.

- [ ] **Step 2: `lib/actions/admins.ts`**

In `createAdmin`, read `const role = str(formData, "role") === "ar" ? "ar" : "admin";` and pass `role` + `redirectTo: role === "ar" ? INVITE_REDIRECT.ar : INVITE_REDIRECT.admin`. In `setAdminActive`, change the target guard to `if (!target || (target.role !== "admin" && target.role !== "ar")) return;` — the "last active admin" count already filters `role: "admin"` (keep it), but only apply that guard when `target.role === "admin"`.

- [ ] **Step 3: `lib/portal.ts`**

Rename `getAdminUsers` → `getStaffUsers` with `where: { role: { in: ["admin", "ar"] } }` and add `role: true` to `select`. Add:

```ts
/** Page gate for routes shared by several staff roles (e.g. admin + ar). */
export async function requireRoleSession(roles: string[]) {
  const session = await getPortalSession();
  if (!session || !roles.includes(session.user.role ?? "")) redirect("/portal");
  return session;
}
```

- [ ] **Step 4: `lib/auth/require-admin.ts`**

```ts
/** Server-Action guard for actions shared by several staff roles. */
export async function requireRole(roles: string[]): Promise<void> {
  const session = await getPortalSession();
  if (!session || !roles.includes(session.user.role ?? "")) redirect("/portal/sign-in");
}
```

- [ ] **Step 5: Admins UI**

`components/admin/AdminAccountForm.tsx` — add between Email and the error line:

```tsx
      <label className={label}>
        Role
        <select name="role" defaultValue="admin" className={field}>
          <option value="admin">Administrator</option>
          <option value="ar">Accounts Receivable</option>
        </select>
      </label>
```

`app/portal/(protected)/admins/page.tsx` — import `getStaffUsers` instead of `getAdminUsers`; add a "Role" column after Name rendering:

```tsx
                  <td className="px-4 py-3">
                    <span className="rounded-pill bg-mec-mist px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/70">
                      {a.role === "ar" ? "Accounts Receivable" : "Admin"}
                    </span>
                  </td>
```
(bump the empty-state `colSpan` to 6, add the `<th>`). Update the intro copy: "Admin and Accounts Receivable accounts are provisioned here — public sign-up is disabled. New staff are invited by email to set their own password." Heading of the form: "Invite a staff member".

- [ ] **Step 6: Layout nav + dashboard**

`app/portal/(protected)/layout.tsx` — add to `NAV_BY_ROLE`:

```ts
  ar: [
    { href: "/portal", label: "Dashboard" },
    { href: "/portal/applications", label: "Applications" },
  ],
```

Create `components/portal/dashboards/ArDashboard.tsx`:

```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { APPLICATION_STATUS } from "@/lib/constants";

/** Accounts Receivable dashboard — application queue counts. */
export async function ArDashboard() {
  const [submitted, infoRequested, decided] = await Promise.all([
    db.customerApplication.count({ where: { status: APPLICATION_STATUS.SUBMITTED } }),
    db.customerApplication.count({ where: { status: APPLICATION_STATUS.INFO_REQUESTED } }),
    db.customerApplication.count({
      where: {
        status: { in: [APPLICATION_STATUS.APPROVED, APPLICATION_STATUS.REJECTED] },
        decidedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);
  const cards = [
    { label: "Awaiting review", value: submitted, href: "/portal/applications" },
    { label: "Info requested", value: infoRequested, href: "/portal/applications" },
    { label: "Decided (30 days)", value: decided, href: "/portal/applications" },
  ];
  return (
    <div>
      <h1 className="font-display-tight text-3xl">Accounts Receivable</h1>
      <p className="mt-3 max-w-2xl text-sm text-mec-ink/60">
        Review new customer applications submitted through the website.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-md border border-black/10 bg-mec-pure p-6 transition hover:border-mec-red">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/60">{c.label}</p>
            <p className="mt-2 font-display-tight text-5xl text-mec-ink">{c.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

`app/portal/(protected)/page.tsx` — after the admin branch add `if (session.user.role === "ar") return <ArDashboard />;` (import it).

- [ ] **Step 7: Seed AR user**

`prisma/seed.ts` — add after `seedAdmin`:

```ts
/**
 * Local-dev Accounts Receivable login. Skipped in production (NODE_ENV) —
 * real AR staff are invited from /portal/admins.
 */
export async function seedArUser() {
  if (process.env.NODE_ENV === "production") return;
  const email = "ar@example.com";
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return;
  const { auth } = await import("../lib/auth/portal");
  await auth.api.createUser({ body: { email, password: "test123", name: "MEC Accounts", data: {} } });
  await db.user.update({ where: { email }, data: { role: "ar", activatedAt: new Date() } });
  console.log(`Seeded AR user ${email}.`);
}
```
Call it from the seed runner right after `seedAdmin()` (find where `seedAdmin()` is invoked at the bottom of `prisma/seed.ts`; add `await seedArUser();`). Do NOT add it to `scripts/bootstrap.ts`.

- [ ] **Step 8: Verify**

```bash
npx tsc --noEmit && npm run lint && npm run db:seed
```
Manual: `/portal/admins` shows the Role column + select; invite an AR account → row shows "Accounts Receivable / pending". Sign in as `ar@example.com` → nav shows Dashboard + Applications; `/portal/products` redirects to `/portal` (`/portal/applications` 404s until Task 10 — expected).

- [ ] **Step 9: Commit**

```bash
git add lib components app prisma && git commit -m "feat(portal): Accounts Receivable role — provisioning, nav, dashboard, seed"
```

---

### Task 9: `/register` New Customer Form + application submit

**Files:**
- Create: `lib/applications.ts`, `lib/actions/applications.ts` (submit only — decisions come in Task 10), `components/register/ApplicationForm.tsx`, `app/register/page.tsx`, `emails/application-received.tsx`, `emails/application-notification.tsx`, `lib/email/send-application-emails.tsx`

**Interfaces:**
- Consumes: `INDUSTRIES`/`isIndustry`, `APPLICATION_STATUS`, rate limit helpers.
- Produces:
  - `getInquiryByRef(ref: string)` → inquiry with `items`, `application` or null
  - `submitApplication(_prev: ApplicationFormState, formData): Promise<ApplicationFormState>`, `export type ApplicationFormState = { done?: boolean; error?: string }`
  - `sendApplicationEmails(applicationId: number, kind: "received" | "info_requested" | "rejected")` (the latter two kinds are implemented in Task 10 — stub them with a `console.warn` for now)

- [ ] **Step 1: `lib/applications.ts`** (server-only reads)

```ts
import "server-only";
import { db } from "@/lib/db";

const REF_RE = /^[A-Za-z0-9_-]{16,64}$/;

/** A guest quote by its opaque ref, with the quote items and any application. */
export async function getInquiryByRef(ref: string | undefined) {
  if (!ref || !REF_RE.test(ref)) return null;
  return db.inquiry.findUnique({
    where: { ref },
    include: { items: true, application: true },
  });
}

export function getApplications() {
  return db.customerApplication.findMany({
    orderBy: { createdAt: "asc" },
    include: { inquiry: { select: { id: true, _count: { select: { items: true } } } } },
  });
}

export function getApplicationById(id: number) {
  return db.customerApplication.findUnique({
    where: { id },
    include: {
      inquiry: { include: { items: true } },
      decidedBy: { select: { name: true } },
      company: { select: { id: true, name: true } },
    },
  });
}

export function getActiveSalesReps() {
  return db.salesRep.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}
```

- [ ] **Step 2: Emails**

`emails/application-received.tsx`:

```tsx
import { Heading, Hr, Text } from "@react-email/components";
import { EmailLayout, emailColors } from "./components/EmailLayout";

export function ApplicationReceived({ name, companyName }: { name: string; companyName: string }) {
  return (
    <EmailLayout preview="We received your New Customer Form">
      <Heading as="h1" style={{ color: emailColors.ink, fontSize: 22, margin: "0 0 8px" }}>
        We received your New Customer Form
      </Heading>
      <Text style={{ color: emailColors.graphite, fontSize: 14, margin: 0 }}>
        Hi {name}, thanks for applying to open an MEC account for {companyName}. Our
        Accounts Receivable team will review your application and respond within one
        business day. Your quote request stays attached to your application.
      </Text>
      <Hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "20px 0" }} />
      <Text style={{ color: emailColors.graphite, fontSize: 13, margin: 0 }}>
        Questions? Just reply to this email and it will reach our team.
      </Text>
    </EmailLayout>
  );
}
```

`emails/application-notification.tsx`:

```tsx
import { Heading, Hr, Link, Text } from "@react-email/components";
import { EmailLayout, emailColors } from "./components/EmailLayout";

export type ApplicationNotificationProps = {
  applicationId: number;
  companyName: string;
  industry: string;
  location: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string | null;
  itemCount: number;
  resubmitted: boolean;
  ctaUrl: string;
};

const detailLabel = { color: emailColors.graphite, fontSize: 12, fontWeight: 700 as const, letterSpacing: "0.08em", margin: "12px 0 2px", textTransform: "uppercase" as const };
const detailValue = { color: emailColors.ink, fontSize: 14, margin: 0 };

export function ApplicationNotification(p: ApplicationNotificationProps) {
  const title = `${p.resubmitted ? "Updated" : "New"} customer application — ${p.companyName}`;
  return (
    <EmailLayout preview={title}>
      <Heading as="h1" style={{ color: emailColors.ink, fontSize: 22, margin: "0 0 4px" }}>{title}</Heading>
      <Text style={detailLabel}>Company</Text>
      <Text style={detailValue}>{p.companyName} · {p.industry} · {p.location}</Text>
      <Text style={detailLabel}>Contact</Text>
      <Text style={detailValue}>{p.contactName} · <Link href={`mailto:${p.email}`} style={{ color: emailColors.red }}>{p.email}</Link> · {p.phone}</Text>
      {p.notes && (<><Text style={detailLabel}>Notes</Text><Text style={detailValue}>{p.notes}</Text></>)}
      <Text style={detailLabel}>Quote</Text>
      <Text style={detailValue}>{p.itemCount} item{p.itemCount === 1 ? "" : "s"} attached</Text>
      <Hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "24px 0" }} />
      <Text style={{ fontSize: 14, margin: 0 }}>
        <Link href={p.ctaUrl} style={{ color: emailColors.red }}>Review in the portal →</Link>
      </Text>
    </EmailLayout>
  );
}
```

`lib/email/send-application-emails.tsx`:

```tsx
import { render } from "@react-email/components";
import { getResend } from "@/lib/email/resend";
import { getEmailSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { ApplicationReceived } from "@/emails/application-received";
import { ApplicationNotification } from "@/emails/application-notification";

export type ApplicationEmailKind = "received" | "info_requested" | "rejected";

/** Best-effort application emails (spec §10). Never throws — called via after(). */
export async function sendApplicationEmails(
  applicationId: number,
  kind: ApplicationEmailKind,
  opts: { resubmitted?: boolean } = {},
): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) {
      console.warn(`[email] RESEND_API_KEY unset — skipping ${kind} email for application ${applicationId}`);
      return;
    }
    const settings = await getEmailSettings();
    if (!settings.fromEmail || !settings.generalInboxEmail) {
      console.warn(`[email] fromEmail/generalInboxEmail not configured — skipping ${kind} email for application ${applicationId}`);
      return;
    }
    const app = await db.customerApplication.findUnique({
      where: { id: applicationId },
      include: { inquiry: { select: { id: true, _count: { select: { items: true } } } } },
    });
    if (!app) return;
    const from = settings.fromName ? `${settings.fromName} <${settings.fromEmail}>` : settings.fromEmail;
    const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    const send = async (to: string[], subject: string, element: React.ReactElement, replyTo?: string) => {
      const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
      const { error } = await resend.emails.send({ from, to, subject, html, text, replyTo });
      if (error) console.error(`[email] ${kind} email failed for application ${applicationId}:`, error);
    };

    if (kind === "received") {
      await send([app.email], "We received your New Customer Form",
        <ApplicationReceived name={app.contactName} companyName={app.companyName} />, settings.generalInboxEmail);
      const arUsers = await db.user.findMany({ where: { role: "ar", NOT: { banned: true } }, select: { email: true } });
      const internal = Array.from(new Set([settings.generalInboxEmail, ...arUsers.map((u) => u.email)]));
      await send(internal, `${opts.resubmitted ? "Updated" : "New"} customer application — ${app.companyName}`,
        <ApplicationNotification
          applicationId={app.id} companyName={app.companyName} industry={app.industry} location={app.location}
          contactName={app.contactName} email={app.email} phone={app.phone} notes={app.notes}
          itemCount={app.inquiry._count.items} resubmitted={Boolean(opts.resubmitted)}
          ctaUrl={`${baseUrl}/portal/applications/${app.id}`}
        />, app.email);
      return;
    }
    // "info_requested" | "rejected" — implemented in the decisions task.
    console.warn(`[email] ${kind} email not implemented yet for application ${applicationId}`);
  } catch (e) {
    console.error(`[email] unexpected failure (${kind}) for application ${applicationId}:`, e);
  }
}
```

- [ ] **Step 3: `lib/actions/applications.ts`** (submit)

```ts
"use server";

import { after } from "next/server";
import { db } from "@/lib/db";
import { isIndustry } from "@/lib/industries";
import { APPLICATION_STATUS, MATCH_STATUS } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { currentRequestIp } from "@/lib/request-ip";
import { getInquiryByRef } from "@/lib/applications";
import { sendApplicationEmails } from "@/lib/email/send-application-emails";

export type ApplicationFormState = { done?: boolean; error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Create (or, when info was requested, update) the New Customer Form for the
 * guest quote identified by `ref` (spec §8). Public endpoint: the ref is the
 * only credential and only unlocks the guest's own submission.
 */
export async function submitApplication(
  _prev: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const ip = await currentRequestIp();
  const limit = checkRateLimit(`apply:${ip}`, { max: 10, windowMs: 15 * 60_000 });
  if (!limit.ok) return { error: "Too many attempts. Please try again later." };

  const inquiry = await getInquiryByRef(str(formData, "ref"));
  if (!inquiry || inquiry.type !== "QUOTE" || inquiry.matchStatus !== MATCH_STATUS.NO_MATCH)
    return { error: "This link isn't valid. Please start a new quote request." };
  const existing = inquiry.application;
  if (existing && existing.status !== APPLICATION_STATUS.INFO_REQUESTED)
    return { error: "This application has already been submitted." };

  const data = {
    companyName: str(formData, "companyName"),
    industry: str(formData, "industry"),
    location: str(formData, "location"),
    contactName: str(formData, "contactName"),
    email: str(formData, "email").toLowerCase(),
    phone: str(formData, "phone"),
    notes: str(formData, "notes") || null,
  };
  if (!data.companyName) return { error: "Company name is required." };
  if (!isIndustry(data.industry)) return { error: "Please choose your industry." };
  if (!data.location) return { error: "Location is required." };
  if (!data.contactName) return { error: "Contact name is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { error: "A valid email is required." };
  if (!data.phone) return { error: "Phone is required." };

  const app = existing
    ? await db.customerApplication.update({
        where: { id: existing.id },
        data: { ...data, status: APPLICATION_STATUS.SUBMITTED, decisionNote: null },
      })
    : await db.customerApplication.create({ data: { ...data, inquiryId: inquiry.id } });

  after(() => sendApplicationEmails(app.id, "received", { resubmitted: Boolean(existing) }));
  return { done: true };
}
```

- [ ] **Step 4: `components/register/ApplicationForm.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { INDUSTRIES } from "@/lib/industries";
import { submitApplication, type ApplicationFormState } from "@/lib/actions/applications";

const inputCls =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-4 py-3 text-mec-ink outline-none focus:border-mec-red";
const labelCls = "mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70";

export type ApplicationPrefill = {
  companyName: string;
  industry: string;
  location: string;
  contactName: string;
  email: string;
  phone: string;
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
      <h2 className="font-display-tight text-h3 text-mec-ink">Company details</h2>
      <label className={labelCls}>Company name *<input name="companyName" required defaultValue={prefill.companyName} className={inputCls} /></label>
      <label className={labelCls}>Industry *
        <select name="industry" required defaultValue={prefill.industry} className={inputCls}>
          <option value="" disabled>Select your industry</option>
          {INDUSTRIES.map((i) => (<option key={i} value={i}>{i}</option>))}
        </select>
      </label>
      <label className={labelCls}>Location *<input name="location" required defaultValue={prefill.location} className={inputCls} /></label>
      <h2 className="mt-8 font-display-tight text-h3 text-mec-ink">Contact</h2>
      <label className={labelCls}>Contact name *<input name="contactName" required defaultValue={prefill.contactName} className={inputCls} /></label>
      <label className={labelCls}>Email *<input name="email" type="email" required defaultValue={prefill.email} className={inputCls} /></label>
      <label className={labelCls}>Phone *<input name="phone" type="tel" required defaultValue={prefill.phone} className={inputCls} /></label>
      <label className={labelCls}>Notes<textarea name="notes" rows={3} defaultValue={prefill.notes} className={`${inputCls} resize-none`} /></label>
      {state.error && <p className="mt-3 text-sm text-mec-red">{state.error}</p>}
      <button type="submit" disabled={pending} className="mt-5 w-full bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50">
        {pending ? "Submitting…" : resubmit ? "Resubmit Application" : "Submit Application"}
      </button>
    </form>
  );
}
```

- [ ] **Step 5: `app/register/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { ApplicationForm } from "@/components/register/ApplicationForm";
import { getInquiryByRef } from "@/lib/applications";
import { APPLICATION_STATUS, MATCH_STATUS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "New Customer Form — Minott Equipment & Chemicals",
  description: "Apply to open a Minott Equipment & Chemicals customer account.",
};

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Section tone="light" className="pt-40">
      <Container>
        <Eyebrow tone="red">New Customer Form</Eyebrow>
        <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95]">{title}</h1>
        <div className="mt-12">{children}</div>
      </Container>
    </Section>
  );
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const { ref } = await searchParams;
  const inquiry = await getInquiryByRef(typeof ref === "string" ? ref : undefined);

  if (!inquiry || inquiry.type !== "QUOTE" || inquiry.matchStatus !== MATCH_STATUS.NO_MATCH) {
    return (
      <Shell title="This link isn't valid.">
        <p className="max-w-2xl text-lede text-mec-ink/80">
          Start a quote request and we&apos;ll direct you to the New Customer Form from there.
        </p>
        <Link href="/quote" className="mt-6 inline-block bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover">Go to my quote</Link>
      </Shell>
    );
  }

  const app = inquiry.application;
  if (app && app.status !== APPLICATION_STATUS.INFO_REQUESTED) {
    const copy =
      app.status === APPLICATION_STATUS.APPROVED
        ? "Your application has been approved — check your email for the link to set your password."
        : app.status === APPLICATION_STATUS.REJECTED
          ? "Your application was not approved. Please check your email for details."
          : "Your application is under review. Our Accounts Receivable team will respond within one business day.";
    return (
      <Shell title="Application status">
        <p className="max-w-2xl text-lede text-mec-ink/80">{copy}</p>
      </Shell>
    );
  }

  const prefill = app
    ? { companyName: app.companyName, industry: app.industry, location: app.location, contactName: app.contactName, email: app.email, phone: app.phone, notes: app.notes ?? "" }
    : { companyName: inquiry.company ?? "", industry: inquiry.industry ?? "", location: inquiry.location ?? "", contactName: inquiry.name, email: inquiry.email, phone: inquiry.phone ?? "", notes: "" };

  return (
    <Shell title="Open an MEC account.">
      <p className="max-w-2xl text-lede text-mec-ink/80">
        We&apos;ve prefilled this from your quote request. Check the details, add anything
        missing, and our Accounts Receivable team will review your application.
      </p>
      {app?.decisionNote && (
        <div className="mt-8 max-w-2xl rounded-md border border-mec-red/30 bg-mec-red/5 p-5 text-sm text-mec-ink/80">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-mec-red">We need a little more information</p>
          <p className="mt-2 whitespace-pre-line">{app.decisionNote}</p>
        </div>
      )}
      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr]">
        <ApplicationForm refToken={inquiry.ref!} prefill={prefill} resubmit={Boolean(app)} />
        <aside className="h-fit rounded-md border border-black/10 bg-mec-pure p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/60">
            Quote request #{inquiry.id} · {inquiry.items.length} item{inquiry.items.length === 1 ? "" : "s"}
          </p>
          <p className="mt-2 text-sm text-mec-ink/70">Stays attached to this application.</p>
          <ul className="mt-4 space-y-1 text-sm text-mec-ink/80">
            {inquiry.items.map((it) => (<li key={it.id}>{it.quantity} × {it.productName}</li>))}
          </ul>
        </aside>
      </div>
    </Shell>
  );
}
```

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit && npm run lint
```
Manual: guest quote (fresh email) → panel → `/register?ref=…` prefilled with company/industry/location/name/email/phone and the items list → submit → "Application submitted" and `sqlite3 prisma/app.db "SELECT id, status, companyName, inquiryId FROM CustomerApplication;"` shows `SUBMITTED`; reload the same URL → "under review" status page; `/register?ref=bogus` → invalid-link page.

- [ ] **Step 7: Commit**

```bash
git add app components lib emails && git commit -m "feat(funnel): New Customer Form at /register with application submit + emails"
```

---

### Task 10: Applications queue + decisions (approve / info / reject) + inbox badges

**Files:**
- Modify: `lib/actions/applications.ts`, `lib/email/send-application-emails.tsx`, `app/portal/(protected)/requests/page.tsx`
- Create: `app/portal/(protected)/applications/page.tsx`, `app/portal/(protected)/applications/[id]/page.tsx`, `components/admin/ApplicationDecisionForms.tsx`, `emails/application-info-requested.tsx`, `emails/application-rejected.tsx`

**Interfaces:**
- Consumes: `requireRole`, `requireRoleSession` (Task 8), `provisionUser({ skipInvite })`, `sendInvite`, `INVITE_REDIRECT`, `getApplications/getApplicationById/getActiveSalesReps` (Task 9), `matchGuest`, `sendInquiryEmails(id, { verifiedNow })`.
- Produces: `approveApplication`, `requestApplicationInfo`, `rejectApplication` — all `(_prev: DecisionState, formData) => Promise<DecisionState>` with `export type DecisionState = { error?: string; success?: boolean }`.

- [ ] **Step 1: Decision emails**

`emails/application-info-requested.tsx`:

```tsx
import { Button, Heading, Hr, Text } from "@react-email/components";
import { EmailLayout, emailColors } from "./components/EmailLayout";

export function ApplicationInfoRequested({ name, note, url }: { name: string; note: string; url: string }) {
  return (
    <EmailLayout preview="We need a little more information for your MEC account application">
      <Heading as="h1" style={{ color: emailColors.ink, fontSize: 22, margin: "0 0 8px" }}>
        We need a little more information
      </Heading>
      <Text style={{ color: emailColors.graphite, fontSize: 14, margin: 0 }}>
        Hi {name}, our Accounts Receivable team reviewed your New Customer Form and asked:
      </Text>
      <Text style={{ color: emailColors.ink, fontSize: 14, margin: "12px 0 0", whiteSpace: "pre-line" }}>{note}</Text>
      <Button href={url} style={{ backgroundColor: emailColors.red, borderRadius: 4, color: emailColors.pure, display: "inline-block", fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", margin: "24px 0", padding: "12px 28px", textDecoration: "none", textTransform: "uppercase" }}>
        Update your application
      </Button>
      <Hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "20px 0" }} />
      <Text style={{ color: emailColors.graphite, fontSize: 13, margin: 0 }}>Reply to this email if you have any questions.</Text>
    </EmailLayout>
  );
}
```

`emails/application-rejected.tsx`:

```tsx
import { Heading, Hr, Text } from "@react-email/components";
import { EmailLayout, emailColors } from "./components/EmailLayout";

export function ApplicationRejected({ name, reason }: { name: string; reason: string }) {
  return (
    <EmailLayout preview="An update on your MEC account application">
      <Heading as="h1" style={{ color: emailColors.ink, fontSize: 22, margin: "0 0 8px" }}>
        An update on your account application
      </Heading>
      <Text style={{ color: emailColors.graphite, fontSize: 14, margin: 0 }}>
        Hi {name}, thank you for your interest in Minott Equipment &amp; Chemicals. We
        are unable to open an account at this time for the following reason:
      </Text>
      <Text style={{ color: emailColors.ink, fontSize: 14, margin: "12px 0 0", whiteSpace: "pre-line" }}>{reason}</Text>
      <Hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "20px 0" }} />
      <Text style={{ color: emailColors.graphite, fontSize: 13, margin: 0 }}>
        You are welcome to visit our Kingston showroom, or reply to this email if you
        believe this decision was made in error.
      </Text>
    </EmailLayout>
  );
}
```

In `lib/email/send-application-emails.tsx`, replace the `console.warn(... not implemented ...)` line with:

```tsx
    if (kind === "info_requested") {
      const ref = await db.inquiry.findUnique({ where: { id: app.inquiryId }, select: { ref: true } });
      await send([app.email], "We need a little more information for your MEC account application",
        <ApplicationInfoRequested name={app.contactName} note={app.decisionNote ?? ""} url={`${baseUrl}/register?ref=${ref?.ref ?? ""}`} />, settings.generalInboxEmail);
      return;
    }
    if (kind === "rejected") {
      await send([app.email], "An update on your MEC account application",
        <ApplicationRejected name={app.contactName} reason={app.decisionNote ?? ""} />, settings.generalInboxEmail);
      await send([settings.generalInboxEmail], `Application rejected — ${app.companyName}`,
        <ApplicationRejected name="team" reason={`${app.companyName} (${app.email}) was rejected: ${app.decisionNote ?? ""}`} />);
      return;
    }
```
(import both templates.)

- [ ] **Step 2: Decision actions — append to `lib/actions/applications.ts`**

Add imports: `import { revalidatePath } from "next/cache";`, `import { requireRole } from "@/lib/auth/require-admin";`, `import { getPortalSession } from "@/lib/portal";`, `import { provisionUser, sendInvite, INVITE_REDIRECT } from "@/lib/auth/provision";`, `import { sendInquiryEmails } from "@/lib/email/send-inquiry-emails";`.

```ts
export type DecisionState = { error?: string; success?: boolean };

const STAFF = ["admin", "ar"];

async function loadOpenApplication(id: number) {
  const app = await db.customerApplication.findUnique({ where: { id } });
  if (!app) return { error: "Application not found." } as const;
  if (app.status === APPLICATION_STATUS.APPROVED || app.status === APPLICATION_STATUS.REJECTED)
    return { error: "This application has already been decided." } as const;
  return { app } as const;
}

function revalidateAll(id: number) {
  revalidatePath("/portal/applications");
  revalidatePath(`/portal/applications/${id}`);
  revalidatePath("/portal/requests");
  revalidatePath("/portal/customers");
  revalidatePath("/portal");
}

/**
 * Approve: create the Company, provision the contact (invite = "approved"
 * email), link the original quote, mark APPROVED, notify the rep (spec §9).
 * Ordered writes with a compensating delete — no dangling company.
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
  const app = loaded.app;

  const repRaw = str(formData, "salesRepId");
  const salesRepId = repRaw ? Number(repRaw) : null;
  if (salesRepId !== null && !(Number.isInteger(salesRepId) && salesRepId > 0))
    return { error: "Invalid sales rep." };

  const existingUser = await db.user.findUnique({ where: { email: app.email }, select: { id: true } });
  if (existingUser)
    return { error: "An account with this email already exists — link it from Customers instead." };

  const company = await db.company.create({
    data: { name: app.companyName, industry: app.industry, location: app.location, salesRepId },
  });

  const result = await provisionUser({
    email: app.email,
    name: app.contactName,
    role: "customer",
    redirectTo: INVITE_REDIRECT.customer,
    data: { phone: app.phone },
    skipInvite: true,
  });
  if (!result.ok) {
    await db.company.delete({ where: { id: company.id } }).catch((e) =>
      console.error(`[applications] failed to roll back company ${company.id}:`, e),
    );
    return { error: result.error };
  }

  await db.user.update({ where: { id: result.userId }, data: { companyId: company.id } });
  await db.inquiry.update({
    where: { id: app.inquiryId },
    data: { companyId: company.id, userId: result.userId, matchStatus: MATCH_STATUS.VERIFIED, matchedCompanyId: null },
  });
  await db.customerApplication.update({
    where: { id },
    data: {
      status: APPLICATION_STATUS.APPROVED,
      companyId: company.id,
      userId: result.userId,
      decidedAt: new Date(),
      decidedByUserId: session?.user.id ?? null,
      decisionNote: null,
    },
  });

  // Now that the application row is APPROVED + linked, the invite hook picks
  // the "approved" copy (see lib/email/send-account-invite.tsx).
  await sendInvite(app.email, INVITE_REDIRECT.customer);
  after(() => sendInquiryEmails(app.inquiryId, { verifiedNow: true }));

  revalidateAll(id);
  return { success: true };
}

export async function requestApplicationInfo(
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  await requireRole(STAFF);
  const id = Number(formData.get("id"));
  const note = str(formData, "note");
  if (!Number.isInteger(id)) return { error: "Missing application id." };
  if (!note) return { error: "Tell the applicant what you need." };
  const loaded = await loadOpenApplication(id);
  if ("error" in loaded) return { error: loaded.error };

  await db.customerApplication.update({
    where: { id },
    data: { status: APPLICATION_STATUS.INFO_REQUESTED, decisionNote: note },
  });
  after(() => sendApplicationEmails(id, "info_requested"));
  revalidateAll(id);
  return { success: true };
}

export async function rejectApplication(
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  await requireRole(STAFF);
  const session = await getPortalSession();
  const id = Number(formData.get("id"));
  const reason = str(formData, "reason");
  if (!Number.isInteger(id)) return { error: "Missing application id." };
  if (!reason) return { error: "A reason is required." };
  const loaded = await loadOpenApplication(id);
  if ("error" in loaded) return { error: loaded.error };

  await db.customerApplication.update({
    where: { id },
    data: {
      status: APPLICATION_STATUS.REJECTED,
      decisionNote: reason,
      decidedAt: new Date(),
      decidedByUserId: session?.user.id ?? null,
    },
  });
  after(() => sendApplicationEmails(id, "rejected"));
  revalidateAll(id);
  return { success: true };
}
```

- [ ] **Step 3: `components/admin/ApplicationDecisionForms.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import {
  approveApplication,
  requestApplicationInfo,
  rejectApplication,
  type DecisionState,
} from "@/lib/actions/applications";

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label = "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";
const primary =
  "bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover disabled:opacity-50";
const secondary =
  "rounded-sm border border-mec-ink/20 px-4 py-2 text-sm font-semibold text-mec-ink/80 transition-colors hover:border-mec-red hover:text-mec-red disabled:opacity-50";

export function ApplicationDecisionForms({
  id,
  salesReps,
}: {
  id: number;
  salesReps: { id: number; name: string }[];
}) {
  const [approve, approveAction, approving] = useActionState<DecisionState, FormData>(approveApplication, {});
  const [info, infoAction, requesting] = useActionState<DecisionState, FormData>(requestApplicationInfo, {});
  const [reject, rejectAction, rejecting] = useActionState<DecisionState, FormData>(rejectApplication, {});

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <form action={approveAction} className="rounded-md border border-black/10 bg-mec-pure p-5">
        <input type="hidden" name="id" value={id} />
        <h3 className="font-display-tight text-xl">Approve</h3>
        <p className="mt-1 text-xs text-mec-ink/60">Creates the company, invites the contact and attaches their quote.</p>
        <label className={`${label} mt-4`}>Sales rep
          <select name="salesRepId" defaultValue="" className={field}>
            <option value="">Unassigned</option>
            {salesReps.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
          </select>
        </label>
        {approve.error && <p className="mt-3 text-sm text-mec-red">{approve.error}</p>}
        <button type="submit" disabled={approving} className={`${primary} mt-4 w-full`}>{approving ? "Approving…" : "Approve application"}</button>
      </form>

      <form action={infoAction} className="rounded-md border border-black/10 bg-mec-pure p-5">
        <input type="hidden" name="id" value={id} />
        <h3 className="font-display-tight text-xl">Request more info</h3>
        <label className={`${label} mt-4`}>What do you need?
          <textarea name="note" rows={4} required className={`${field} resize-none`} />
        </label>
        {info.error && <p className="mt-3 text-sm text-mec-red">{info.error}</p>}
        <button type="submit" disabled={requesting} className={`${secondary} mt-4 w-full`}>{requesting ? "Sending…" : "Send request"}</button>
      </form>

      <form action={rejectAction} className="rounded-md border border-black/10 bg-mec-pure p-5">
        <input type="hidden" name="id" value={id} />
        <h3 className="font-display-tight text-xl">Reject</h3>
        <label className={`${label} mt-4`}>Reason (sent to the applicant)
          <textarea name="reason" rows={4} required className={`${field} resize-none`} />
        </label>
        {reject.error && <p className="mt-3 text-sm text-mec-red">{reject.error}</p>}
        <button type="submit" disabled={rejecting} className={`${secondary} mt-4 w-full`}>{rejecting ? "Rejecting…" : "Reject application"}</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: `app/portal/(protected)/applications/page.tsx`**

```tsx
import Link from "next/link";
import { requireRoleSession } from "@/lib/portal";
import { getApplications } from "@/lib/applications";
import { APPLICATION_STATUS, APPLICATION_STATUS_LABELS } from "@/lib/constants";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

type Row = Awaited<ReturnType<typeof getApplications>>[number];

function Group({ title, rows, empty }: { title: string; rows: Row[]; empty: string }) {
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
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (<tr><td colSpan={6} className="px-4 py-6 text-mec-ink/60">{empty}</td></tr>)}
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-black/5">
                <td className="px-4 py-3 font-semibold"><Link href={`/portal/applications/${a.id}`} className="hover:text-mec-red">{a.companyName}</Link></td>
                <td className="px-4 py-3 text-mec-ink/70">{a.contactName} · {a.email}</td>
                <td className="px-4 py-3 text-mec-ink/70">{a.industry}</td>
                <td className="px-4 py-3 text-mec-ink/70">#{a.inquiry.id} · {a.inquiry._count.items} items</td>
                <td className="px-4 py-3 text-mec-ink/60">{formatDate(a.createdAt)}</td>
                <td className="px-4 py-3"><span className="rounded-pill bg-mec-mist px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/70">{APPLICATION_STATUS_LABELS[a.status] ?? a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function ApplicationsPage() {
  await requireRoleSession(["admin", "ar"]);
  const all = await getApplications();
  const submitted = all.filter((a) => a.status === APPLICATION_STATUS.SUBMITTED);
  const info = all.filter((a) => a.status === APPLICATION_STATUS.INFO_REQUESTED);
  const decided = all
    .filter((a) => a.status === APPLICATION_STATUS.APPROVED || a.status === APPLICATION_STATUS.REJECTED)
    .sort((a, b) => (b.decidedAt?.getTime() ?? 0) - (a.decidedAt?.getTime() ?? 0))
    .slice(0, 50);

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Customer applications</h1>
      <p className="mt-3 max-w-2xl text-sm text-mec-ink/60">New Customer Forms submitted from the website. Approving creates the company and invites the contact; the original quote stays attached.</p>
      <Group title="Awaiting review" rows={submitted} empty="Nothing waiting." />
      <Group title="Info requested" rows={info} empty="No open information requests." />
      <Group title="Decided" rows={decided} empty="No decisions yet." />
    </div>
  );
}
```

- [ ] **Step 5: `app/portal/(protected)/applications/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { requireRoleSession } from "@/lib/portal";
import { getApplicationById, getActiveSalesReps } from "@/lib/applications";
import { matchGuest } from "@/lib/customer-match";
import { APPLICATION_STATUS, APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { ApplicationDecisionForms } from "@/components/admin/ApplicationDecisionForms";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

const dl = "text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/50";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRoleSession(["admin", "ar"]);
  const { id } = await params;
  const appId = Number(id);
  if (!Number.isInteger(appId)) notFound();
  const app = await getApplicationById(appId);
  if (!app) notFound();

  const open = app.status === APPLICATION_STATUS.SUBMITTED || app.status === APPLICATION_STATUS.INFO_REQUESTED;
  const hint = open ? await matchGuest({ email: app.email, phone: app.phone, company: app.companyName }) : null;
  const salesReps = open ? await getActiveSalesReps() : [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display-tight text-3xl">{app.companyName}</h1>
        <span className="rounded-pill bg-mec-mist px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-ink/70">{APPLICATION_STATUS_LABELS[app.status] ?? app.status}</span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-black/10 bg-mec-pure p-5 text-sm">
          <p className={dl}>Company</p>
          <p className="mt-1 font-semibold">{app.companyName}</p>
          <p className="text-mec-ink/70">{app.industry} · {app.location}</p>
          <p className={`${dl} mt-4`}>Contact</p>
          <p className="mt-1 font-semibold">{app.contactName}</p>
          <p className="text-mec-ink/70"><a href={`mailto:${app.email}`} className="hover:text-mec-red">{app.email}</a> · {app.phone}</p>
          {app.notes && (<><p className={`${dl} mt-4`}>Notes</p><p className="mt-1 whitespace-pre-line text-mec-ink/80">{app.notes}</p></>)}
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
                ? "Heads up: these details now match an existing portal record. Check Customers before approving to avoid a duplicate."
                : "No existing portal record matches these details."}
            </p>
          )}
        </div>
      </div>

      {open ? (
        <div className="mt-8"><ApplicationDecisionForms id={app.id} salesReps={salesReps} /></div>
      ) : (
        <div className="mt-8 rounded-md border border-black/10 bg-mec-pure p-5 text-sm">
          <p className={dl}>Decision</p>
          <p className="mt-1 font-semibold">{APPLICATION_STATUS_LABELS[app.status]} {app.decidedAt ? `· ${formatDate(app.decidedAt)}` : ""} {app.decidedBy ? `· by ${app.decidedBy.name}` : ""}</p>
          {app.decisionNote && <p className="mt-2 whitespace-pre-line text-mec-ink/80">{app.decisionNote}</p>}
          {app.company && <p className="mt-2 text-mec-ink/70">Company created: <a href={`/portal/customers/${app.company.id}`} className="font-semibold text-mec-red hover:underline">{app.company.name}</a></p>}
        </div>
      )}
    </div>
  );
}
```
Note: the "Company created" link is only useful to admins (AR can't open `/portal/customers`); that's acceptable — AR gets redirected to their dashboard.

- [ ] **Step 6: Inbox badges in `app/portal/(protected)/requests/page.tsx`**

Add `matchedCompany: { select: { name: true } }, application: { select: { id: true, status: true } }` to the `include`, import `MATCH_STATUS_LABELS, APPLICATION_STATUS_LABELS` from constants, and inside the card, right after the type pill `<span>`:

```tsx
                  {inq.type === INQUIRY_TYPE.QUOTE && inq.matchStatus && (
                    <span className={`ml-2 inline-block rounded-pill px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${inq.matchStatus === "VERIFIED" ? "bg-mec-ink/10 text-mec-ink/70" : "bg-mec-red/10 text-mec-red"}`}>
                      {MATCH_STATUS_LABELS[inq.matchStatus] ?? inq.matchStatus}
                    </span>
                  )}
```
and after the email/phone `<p>`:

```tsx
                  {inq.matchedCompany && (
                    <p className="mt-1 text-xs text-mec-ink/60">Possible match: <strong>{inq.matchedCompany.name}</strong> (unverified)</p>
                  )}
                  {inq.application && (
                    <p className="mt-1 text-xs text-mec-ink/60">
                      Application: {APPLICATION_STATUS_LABELS[inq.application.status] ?? inq.application.status}{" "}
                      <Link href={`/portal/applications/${inq.application.id}`} className="font-semibold text-mec-red hover:underline">→</Link>
                    </p>
                  )}
```

- [ ] **Step 7: Verify**

```bash
npx tsc --noEmit && npm run lint && npm run build
```
Manual (as `ar@example.com` then as admin): `/portal/applications` lists the Task 9 application under "Awaiting review" → open → **Request more info** with a note → status "Info requested"; `/register?ref=…` shows the note, resubmit → back to "Awaiting review" → **Approve** with a rep → detail shows Decided + company link; as admin `/portal/customers` shows the new company with the contact as a pending user; `/portal/requests` shows the quote as **Verified** with "Application: Approved →"; server log shows the invite email attempt + "Verified:" notification. Second guest quote → application → **Reject** with a reason → decided, log shows the rejection email attempts. Approving an application whose email now exists as a user → error, no company created (`sqlite3 prisma/app.db "SELECT COUNT(*) FROM Company;"` unchanged).

- [ ] **Step 8: Commit**

```bash
git add app components lib emails && git commit -m "feat(portal): applications queue with approve / request-info / reject, inbox classification badges"
```

---

### Task 11: Docs

**Files:**
- Modify: `/root/Work/github/Minott/CLAUDE.md` (repo root), `minott-web/.env.example` (no new vars — verify only)

- [ ] **Step 1: CLAUDE.md**

In the "Data & admin" section add a bullet after **Inquiries**:

```markdown
- **Guest quote funnel (SOP §D/E):** guest `submitQuote` runs `lib/customer-match.ts` (email → phone → normalised company name against portal `User`/`Company` rows) and stores `Inquiry.matchStatus` (`VERIFIED` | `POTENTIAL_MATCH` | `NO_MATCH`), an opaque `Inquiry.ref` token, guest `industry`/`location`, and an admin-only `matchedCompanyId` hint. Potential matches are pointed to `/portal/sign-in` or `/portal/recover` (company name + MEC account number → reset links to the users on file; stamps the quote as verified). No-match guests go to `/register?ref=…` (prefilled New Customer Form → `CustomerApplication`), reviewed at `/portal/applications` by admins and the `ar` role: Approve creates the `Company`, provisions the contact (approved-copy invite), links the quote and notifies the rep; Request info / Reject email the applicant. Constant responses on forgot/recover; per-IP limits via `checkRateLimit("bucket:ip", …)`. The industry dropdown is `lib/industries.ts`. `Company.mecAccountNumber` is stored normalised (uppercase, no spaces/dashes).
```

In **Admin auth** change "`User.role` selects behavior: `admin`, `customer`, or `rep`" to "`admin`, `customer`, `rep`, or `ar` (Accounts Receivable — applications queue only; created at `/portal/admins`)". Add `/portal/forgot-password` to the auth bullet ("self-service reset for every role"). In **Known open items** replace "Out of scope for now: rep-facing forgot-password self-service," with "Out of scope for now:" (the rest stays), and add "industry→rep auto-assignment (MEC-6), manual attach-quote-to-company from the inbox, customer-directory CSV import".

- [ ] **Step 2: Commit**

```bash
cd /root/Work/github/Minott && git add CLAUDE.md && git commit -m "docs: document the guest funnel, recovery, registration and AR role"
```

---

### Task 12: Final verification + Plane

- [ ] **Step 1: Full verification**

```bash
cd /root/Work/github/Minott/minott-web && npx tsc --noEmit && npm run lint && npm run build
```
Then run the complete click-through in spec §12 end-to-end on a fresh dev server and fix anything that fails (each fix = its own commit).

- [ ] **Step 2: Plane**

Move MEC-2, MEC-3, MEC-4, MEC-5, MEC-7 to the "Done" state (look up the state id via `state list` for project `614ecd20-8077-492c-a260-97829311e7e8`) and comment on MEC-1 that the industry taxonomy now exists in `lib/industries.ts` (the rest of MEC-1 shipped with company accounts). Add a comment on MEC-6 noting the Approve form's rep dropdown is the hook for auto-preselect.
