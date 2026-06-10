# Quote Sign-in, Sales Reps, Navbar De-dupe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Attach quote submissions to signed-in portal customers (with a sign-in path from the quote page), add an admin Sales Reps tab with per-customer assignment, and remove the duplicate Contact link from the desktop navbar.

**Architecture:** The BetterAuth customer portal and `Inquiry.userId` already exist; feature 1 is wiring (`getPortalSession()` on the quote page + server action, a validated `?next=` redirect on sign-in). Sales reps are a new `SalesRep` Prisma model with a nullable FK on `User`, managed through admin pages that mirror the existing Categories/Customers patterns (Server Actions gated by `requireAdmin()`). The navbar fix is a one-line filter.

**Tech Stack:** Next.js 16 (App Router, async `searchParams`, Server Actions), React 19, Prisma 7 + SQLite, BetterAuth, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-06-10-quote-signin-salesreps-nav-design.md`

**Working directory:** All commands run from `minott-web/`. Implement directly on `main` (per user instruction).

**Verification convention:** This project has NO automated test suite (per root `CLAUDE.md`). Each task is verified with `npx tsc --noEmit` (and `npm run lint` / `npm run build` at the end) instead of unit tests. Do not add a test framework.

**⚠️ Next.js 16:** `searchParams` and `params` are Promises — `await` them. Read `node_modules/next/dist/docs/` if unsure about an API.

---

### Task 1: SalesRep schema + migration

**Files:**
- Modify: `minott-web/prisma/schema.prisma`

- [ ] **Step 1: Add the `SalesRep` model and the `User` relation**

In `prisma/schema.prisma`, add this model directly above the `// BetterAuth (customer / B2B portal)` comment block:

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

In the `User` model, add these two lines after the `whatsapp String?` field (keep everything else unchanged):

```prisma
  salesRep   SalesRep? @relation(fields: [salesRepId], references: [id], onDelete: SetNull)
  salesRepId Int?
```

- [ ] **Step 2: Create and apply the migration**

Run: `npm run db:migrate -- --name sales_rep_assignment`
Expected: a new folder `prisma/migrations/<timestamp>_sales_rep_assignment/` is created and the migration applies cleanly ("Your database is now in sync with your schema"). `prisma generate` runs as part of this.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add SalesRep model and User.salesRepId"
```

---

### Task 2: Navbar — remove duplicate Contact text link

**Files:**
- Modify: `minott-web/components/layout/Nav.tsx:90`

- [ ] **Step 1: Filter `/contact` out of the desktop middle nav**

In `components/layout/Nav.tsx`, the desktop nav currently renders:

```tsx
{LINKS.filter((l) => l.href !== "/").map((l) => (
```

Change it to:

```tsx
{LINKS.filter((l) => l.href !== "/" && l.href !== "/contact").map((l) => (
```

Also update the comment above it (lines 86–88) so it explains both omissions:

```tsx
          {/* The full row only fits from xl up; below that the hamburger
              takes over. "Home" is omitted on desktop (the logo covers it)
              and "Contact" is omitted because the red CTA button on the
              right already links there. */}
```

Do NOT touch `LINKS` itself — the mobile overlay maps over the full `LINKS` array and must keep its single Contact entry. Do NOT touch the red `<Button href="/contact">` CTA.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/layout/Nav.tsx
git commit -m "fix(nav): remove duplicate Contact text link from desktop nav"
```

---

### Task 3: Sign-in `?next=` redirect support

**Files:**
- Modify: `minott-web/app/portal/sign-in/page.tsx`
- Modify: `minott-web/components/portal/SignInForm.tsx`

- [ ] **Step 1: Accept and validate `next` on the sign-in page**

In `app/portal/sign-in/page.tsx`, replace the component signature and the already-signed-in redirect (currently lines 17–20) with:

```tsx
/**
 * `next` lets flows like the quote page round-trip through sign-in and land
 * back where they started. Only same-site relative paths are honored
 * (must start with a single "/"; "//host" would be an open redirect).
 */
function safeNextPath(next: string | undefined): string | undefined {
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : undefined;
}

export default async function PortalSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = safeNextPath(next);

  // Already signed in? Skip the form.
  const session = await getPortalSession();
  if (session) redirect(safeNext ?? "/portal");
```

And pass the prop to the form (line 35): change `<SignInForm />` to:

```tsx
          <SignInForm next={safeNext} />
```

- [ ] **Step 2: Use `next` in `SignInForm`**

In `components/portal/SignInForm.tsx`:

Change the component signature (line 13) from:

```tsx
export function SignInForm() {
```

to:

```tsx
export function SignInForm({ next }: { next?: string }) {
```

Change the post-sign-in navigation (line 46) from:

```tsx
    router.push("/portal");
```

to:

```tsx
    router.push(next ?? "/portal");
```

Also extend the component doc comment's last sentence: after "so the protected server layout re-reads the freshly-set session cookie." add " An optional `next` path (validated by the sign-in page) overrides the dashboard destination."

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/portal/sign-in/page.tsx components/portal/SignInForm.tsx
git commit -m "feat(portal): support validated ?next= redirect after sign-in"
```

---

### Task 4: Attach `userId` to quote submissions

**Files:**
- Modify: `minott-web/lib/actions/inquiries.ts`

- [ ] **Step 1: Read the portal session in `submitQuote`**

In `lib/actions/inquiries.ts`:

Add the import after the existing imports (line 4):

```ts
import { getPortalSession } from "@/lib/portal";
```

In `submitQuote`, after the items validation block (after line 76, `}` closing the empty-items check) and before the `await db.inquiry.create({`, add:

```ts
  // Attach the quote to the signed-in portal account, if any. The user id is
  // derived from the session cookie server-side — never from form data.
  const session = await getPortalSession();
```

Then in the `db.inquiry.create` data object, add one line after `type: INQUIRY_TYPE.QUOTE,`:

```ts
      userId: session?.user.id ?? null,
```

Leave `submitContact` and `submitSample` unchanged (out of scope per spec).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/inquiries.ts
git commit -m "feat(quote): attach submitted quotes to the signed-in portal user"
```

---

### Task 5: Quote page — sign-in banner, greeting, prefill, history link

**Files:**
- Modify: `minott-web/app/quote/page.tsx`
- Modify: `minott-web/components/quote/QuotePageClient.tsx`

- [ ] **Step 1: Read the session in the quote page (server) and pass a plain object down**

Replace the component in `app/quote/page.tsx` (keep the imports and `metadata` as-is, adding one import):

```tsx
import { getPortalSession } from "@/lib/portal";
```

```tsx
export default async function QuotePage() {
  // Serialize only what the client form needs; the full session object
  // isn't a plain serializable value.
  const session = await getPortalSession();
  const portalUser = session
    ? {
        name: session.user.name,
        email: session.user.email,
        companyName: session.user.companyName ?? null,
        phone: session.user.phone ?? null,
      }
    : null;

  return (
    <Section tone="light" className="pt-40">
      <Container>
        <Eyebrow tone="red">Request a Quote</Eyebrow>
        <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95]">
          Your quote list.
        </h1>
        <p className="mt-8 max-w-2xl text-lede text-mec-ink/80">
          Review your items, add your details, and we&apos;ll price everything
          within one business day.
        </p>
        <div className="mt-12">
          <QuotePageClient portalUser={portalUser} />
        </div>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 2: Render banner, prefill, and success history link in `QuotePageClient`**

In `components/quote/QuotePageClient.tsx`, make these changes:

(a) Export the user shape and accept the prop. Replace lines 14–15:

```tsx
export type QuotePortalUser = {
  name: string;
  email: string;
  companyName: string | null;
  phone: string | null;
};

export function QuotePageClient({
  portalUser,
}: {
  portalUser: QuotePortalUser | null;
}) {
  const { items, setQuantity, removeItem, clear } = useQuoteCart();
```

(b) In the success panel (the `if (state.ok)` block), after the existing "Back to Products" `<Link>`, add a sibling link shown only when signed in:

```tsx
        {portalUser && (
          <Link
            href="/portal/history"
            className="ml-4 mt-6 inline-block border border-mec-ink/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink hover:border-mec-red hover:text-mec-red"
          >
            View Quote History
          </Link>
        )}
```

(c) Add the account banner above the two-column grid. Replace the opening of the main return (line 61–62):

```tsx
  return (
    <div>
      {portalUser ? (
        <p className="mb-8 rounded-md border border-mec-red/20 bg-mec-red/5 px-5 py-4 text-sm text-mec-ink/80">
          Signed in as <strong className="text-mec-ink">{portalUser.name}</strong>{" "}
          — this quote will be saved to your account history.
        </p>
      ) : (
        <p className="mb-8 rounded-md border border-black/10 bg-mec-pure px-5 py-4 text-sm text-mec-ink/70">
          Have a portal account?{" "}
          <Link
            href="/portal/sign-in?next=/quote"
            className="font-semibold text-mec-red hover:underline"
          >
            Sign in
          </Link>{" "}
          to attach this quote to your history.
        </p>
      )}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr]">
```

…and close the new wrapper `</div>` at the end of the return (after the existing closing `</div>` of the grid, before the final `);`).

(d) Prefill the form fields from the account (still editable). Add `defaultValue` to the four inputs in the contact form:

```tsx
          <input name="name" required defaultValue={portalUser?.name} className={inputCls} />
```

```tsx
          <input name="company" defaultValue={portalUser?.companyName ?? undefined} className={inputCls} />
```

```tsx
          <input name="email" type="email" required defaultValue={portalUser?.email} className={inputCls} />
```

```tsx
          <input name="phone" defaultValue={portalUser?.phone ?? undefined} className={inputCls} />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/quote/page.tsx components/quote/QuotePageClient.tsx
git commit -m "feat(quote): portal sign-in banner, prefilled details, history link"
```

---

### Task 6: Sales rep Server Actions

**Files:**
- Create: `minott-web/lib/actions/admin-sales-reps.ts`

- [ ] **Step 1: Create the actions file**

Create `lib/actions/admin-sales-reps.ts` (mirrors `lib/actions/admin-categories.ts`):

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";

export type SalesRepFormState = { error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function buildData(formData: FormData) {
  return {
    name: str(formData, "name"),
    email: str(formData, "email") || null,
    phone: str(formData, "phone") || null,
    // Checkbox: present in the form data only when checked.
    active: formData.get("active") !== null,
  };
}

export async function createSalesRep(
  _prev: SalesRepFormState,
  formData: FormData,
): Promise<SalesRepFormState> {
  await requireAdmin();
  const data = buildData(formData);
  if (!data.name) return { error: "Name is required." };
  await db.salesRep.create({ data });
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
  try {
    await db.salesRep.update({ where: { id }, data });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    )
      return { error: "Sales rep not found." };
    throw e;
  }
  revalidatePath("/admin/sales-reps");
  revalidatePath("/admin/customers");
  redirect("/admin/sales-reps");
}

/**
 * Deleting a rep un-assigns their clients (User.salesRepId is SetNull);
 * the list page's delete button asks for confirmation before posting here.
 */
export async function deleteSalesRep(
  _prev: SalesRepFormState,
  formData: FormData,
): Promise<SalesRepFormState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { error: "Invalid sales rep id." };
  await db.salesRep.delete({ where: { id } });
  revalidatePath("/admin/sales-reps");
  revalidatePath("/admin/customers");
  return {};
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/admin-sales-reps.ts
git commit -m "feat(admin): sales rep create/update/delete server actions"
```

---

### Task 7: Admin Sales Reps pages + sidebar tab

**Files:**
- Create: `minott-web/components/admin/SalesRepForm.tsx`
- Create: `minott-web/components/admin/DeleteSalesRepButton.tsx`
- Create: `minott-web/app/admin/(protected)/sales-reps/page.tsx`
- Create: `minott-web/app/admin/(protected)/sales-reps/new/page.tsx`
- Create: `minott-web/app/admin/(protected)/sales-reps/[id]/edit/page.tsx`
- Modify: `minott-web/app/admin/(protected)/layout.tsx:7-13`

- [ ] **Step 1: Create `SalesRepForm`**

Create `components/admin/SalesRepForm.tsx` (mirrors `CustomerForm`):

```tsx
"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createSalesRep,
  updateSalesRep,
  type SalesRepFormState,
} from "@/lib/actions/admin-sales-reps";

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label =
  "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";

export type SalesRepFormData = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
};

export function SalesRepForm({ rep }: { rep?: SalesRepFormData }) {
  const editing = Boolean(rep);
  const [state, formAction, pending] = useActionState<
    SalesRepFormState,
    FormData
  >(editing ? updateSalesRep : createSalesRep, {});

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      {rep && <input type="hidden" name="id" value={rep.id} />}
      <label className={label}>
        Name
        <input name="name" required defaultValue={rep?.name} className={field} />
      </label>
      <label className={label}>
        Email
        <input
          name="email"
          type="email"
          defaultValue={rep?.email ?? ""}
          className={field}
        />
      </label>
      <label className={label}>
        Phone
        <input
          name="phone"
          type="tel"
          defaultValue={rep?.phone ?? ""}
          className={field}
        />
      </label>
      <label className="flex items-center gap-2.5 text-sm text-mec-ink/80">
        <input
          name="active"
          type="checkbox"
          defaultChecked={rep?.active ?? true}
          className="h-4 w-4 accent-mec-red"
        />
        Active (available for new client assignments)
      </label>

      {state.error && <p className="text-sm text-mec-red">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover disabled:opacity-50"
        >
          {pending
            ? editing
              ? "Saving…"
              : "Creating…"
            : editing
              ? "Save Changes"
              : "Create Sales Rep"}
        </button>
        <Link
          href="/admin/sales-reps"
          className="px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70 hover:text-mec-red"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create `DeleteSalesRepButton`**

Create `components/admin/DeleteSalesRepButton.tsx` (mirrors `DeleteCategoryButton`, plus a confirm because deleting un-assigns clients):

```tsx
"use client";

import { useActionState } from "react";
import { deleteSalesRep } from "@/lib/actions/admin-sales-reps";

const initial: { error?: string } = {};

export function DeleteSalesRepButton({
  id,
  clientCount,
}: {
  id: number;
  clientCount: number;
}) {
  const [state, action] = useActionState(deleteSalesRep, initial);
  return (
    <form
      action={action}
      className="ml-4 inline"
      onSubmit={(e) => {
        const detail =
          clientCount > 0
            ? ` ${clientCount} client(s) will become Unassigned.`
            : "";
        if (!window.confirm(`Delete this sales rep?${detail}`))
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-mec-ink/50 hover:text-mec-red">
        Delete
      </button>
      {state.error && (
        <span className="ml-3 text-xs text-mec-red">{state.error}</span>
      )}
    </form>
  );
}
```

- [ ] **Step 3: Create the list page**

Create `app/admin/(protected)/sales-reps/page.tsx` (mirrors the customers list page):

```tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { DeleteSalesRepButton } from "@/components/admin/DeleteSalesRepButton";

export default async function AdminSalesRepsPage() {
  const reps = await db.salesRep.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { clients: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display-tight text-3xl">Sales reps</h1>
        <Link
          href="/admin/sales-reps/new"
          className="bg-mec-red px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover"
        >
          + New Sales Rep
        </Link>
      </div>

      <p className="mt-3 max-w-2xl text-sm text-mec-ink/60">
        Reps can be assigned to portal customers from the customer&apos;s edit
        page. Inactive reps keep their existing clients but are hidden from
        the assignment dropdown.
      </p>

      <div className="mt-6 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Clients</th>
              <th className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {reps.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-mec-ink/60">
                  No sales reps yet.
                </td>
              </tr>
            )}
            {reps.map((r) => (
              <tr key={r.id} className="border-b border-black/5">
                <td className="px-4 py-3 font-semibold">
                  {r.name}
                  {!r.active && (
                    <span className="ml-2 rounded-pill bg-mec-ink/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/60">
                      inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-mec-ink/70">
                  {r.email ? (
                    <a href={`mailto:${r.email}`} className="hover:text-mec-red">
                      {r.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-mec-ink/70">{r.phone ?? "—"}</td>
                <td className="px-4 py-3 text-mec-ink/70">
                  {r._count.clients}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/sales-reps/${r.id}/edit`}
                    className="font-semibold text-mec-red hover:underline"
                  >
                    Edit
                  </Link>
                  <DeleteSalesRepButton
                    id={r.id}
                    clientCount={r._count.clients}
                  />
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

- [ ] **Step 4: Create the new page**

Create `app/admin/(protected)/sales-reps/new/page.tsx`:

```tsx
import Link from "next/link";
import { SalesRepForm } from "@/components/admin/SalesRepForm";

export default function NewSalesRepPage() {
  return (
    <div>
      <Link
        href="/admin/sales-reps"
        className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red"
      >
        ← Back to sales reps
      </Link>
      <h1 className="mt-4 font-display-tight text-3xl">New sales rep</h1>
      <div className="mt-8">
        <SalesRepForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create the edit page**

Create `app/admin/(protected)/sales-reps/[id]/edit/page.tsx` (note: `params` is a Promise in Next 16):

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SalesRepForm } from "@/components/admin/SalesRepForm";

export default async function EditSalesRepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repId = Number(id);
  if (!Number.isFinite(repId)) notFound();

  const rep = await db.salesRep.findUnique({
    where: { id: repId },
    select: { id: true, name: true, email: true, phone: true, active: true },
  });
  if (!rep) notFound();

  return (
    <div>
      <Link
        href="/admin/sales-reps"
        className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red"
      >
        ← Back to sales reps
      </Link>
      <h1 className="mt-4 font-display-tight text-3xl">Edit sales rep</h1>
      <div className="mt-8">
        <SalesRepForm rep={rep} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Add the sidebar tab**

In `app/admin/(protected)/layout.tsx`, add one entry to `NAV` after Customers:

```ts
const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/sales-reps", label: "Sales Reps" },
];
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add components/admin/SalesRepForm.tsx components/admin/DeleteSalesRepButton.tsx "app/admin/(protected)/sales-reps" "app/admin/(protected)/layout.tsx"
git commit -m "feat(admin): sales reps tab with list, create, edit, delete"
```

---

### Task 8: Assign a sales rep to a customer

**Files:**
- Modify: `minott-web/components/admin/CustomerForm.tsx`
- Modify: `minott-web/lib/actions/customers.ts`
- Modify: `minott-web/app/admin/(protected)/customers/new/page.tsx`
- Modify: `minott-web/app/admin/(protected)/customers/[id]/page.tsx`
- Modify: `minott-web/lib/portal.ts:147-163` (`getPortalUsers`)
- Modify: `minott-web/app/admin/(protected)/customers/page.tsx` (table column)

- [ ] **Step 1: Add the sales-rep select to `CustomerForm`**

In `components/admin/CustomerForm.tsx`:

(a) Extend the data type and props:

```tsx
export type CustomerFormData = {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  phone: string | null;
  whatsapp: string | null;
  salesRepId: number | null;
};

export type SalesRepOption = { id: number; name: string };

export function CustomerForm({
  customer,
  salesReps,
}: {
  customer?: CustomerFormData;
  salesReps: SalesRepOption[];
}) {
```

(b) Add the select after the WhatsApp label (before `{state.error && …}`):

```tsx
      <label className={label}>
        Sales rep
        <select
          name="salesRepId"
          defaultValue={customer?.salesRepId ?? ""}
          className={field}
        >
          <option value="">Unassigned</option>
          {salesReps.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
```

- [ ] **Step 2: Persist `salesRepId` in the customer actions**

In `lib/actions/customers.ts`:

(a) Add a parsing helper after the `str` helper:

```ts
/** "" → null (Unassigned); otherwise a positive int or an error sentinel. */
function parseSalesRepId(formData: FormData): number | null | "invalid" {
  const raw = str(formData, "salesRepId");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : "invalid";
}
```

(b) In `createCustomer`, after the existing field reads, add:

```ts
  const salesRepId = parseSalesRepId(formData);
  if (salesRepId === "invalid") return { error: "Invalid sales rep." };
```

…and after the `try { await auth.api.createUser(...) } catch …` block succeeds (just before `revalidatePath`), add:

```ts
  // BetterAuth's createUser only handles its declared additional fields, so
  // the relational FK is set directly. Email is unique, so it identifies the
  // user we just created.
  if (salesRepId !== null) {
    await db.user.update({ where: { email }, data: { salesRepId } });
  }
```

(c) In `updateCustomer`, add the same two parsing lines after the existing field reads:

```ts
  const salesRepId = parseSalesRepId(formData);
  if (salesRepId === "invalid") return { error: "Invalid sales rep." };
```

…and add `salesRepId,` to the existing `db.user.update` data object (after `whatsapp: whatsapp || null,`).

- [ ] **Step 3: Pass rep options from the new-customer page**

In `app/admin/(protected)/customers/new/page.tsx`, make the component async, fetch active reps, and pass them. Add the import:

```tsx
import { db } from "@/lib/db";
```

Inside the (now `async`) component, before the return:

```tsx
  const salesReps = await db.salesRep.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
```

And change `<CustomerForm />` to `<CustomerForm salesReps={salesReps} />`.

- [ ] **Step 4: Pass rep options from the edit-customer page**

In `app/admin/(protected)/customers/[id]/page.tsx`:

(a) Add `salesRepId: true,` to the `db.user.findUnique` select.

(b) After the customer fetch (and `if (!customer) notFound();`), fetch reps — active ones plus the customer's current rep even if inactive, so an existing assignment isn't silently dropped from the dropdown:

```tsx
  const salesReps = await db.salesRep.findMany({
    where: {
      OR: [{ active: true }, { id: customer.salesRepId ?? -1 }],
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
```

(c) Change `<CustomerForm customer={customer} />` to `<CustomerForm customer={customer} salesReps={salesReps} />`.

- [ ] **Step 5: Show the rep in the customers list**

In `lib/portal.ts`, add to the `select` in `getPortalUsers` (after `whatsapp: true,`):

```ts
      salesRep: { select: { name: true } },
```

In `app/admin/(protected)/customers/page.tsx`, add a `Sales rep` header cell after `Email`:

```tsx
              <th className="px-4 py-3">Sales rep</th>
```

…update the empty-state `colSpan={6}` to `colSpan={7}`, and add a body cell after the email cell:

```tsx
                <td className="px-4 py-3 text-mec-ink/70">
                  {c.salesRep?.name ?? "—"}
                </td>
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add components/admin/CustomerForm.tsx lib/actions/customers.ts lib/portal.ts "app/admin/(protected)/customers"
git commit -m "feat(admin): assign a sales rep to portal customers"
```

---

### Task 9: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full static checks**

Run (from `minott-web/`):

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Expected: tsc silent, lint passes (warnings acceptable only if pre-existing), build completes with all routes compiled (including `/admin/sales-reps` and the dynamic edit route).

- [ ] **Step 2: Manual click-through (dev server)**

Run: `npm run dev` and verify against the spec's checklist:

1. Signed out, `/quote` with items: banner shows "Have a portal account? Sign in…"; clicking Sign in lands on `/portal/sign-in?next=/quote`; after signing in you land back on `/quote`; the banner now greets by name and the form is prefilled; submit → quote appears in `/portal/history` AND `/admin/requests`.
2. Signed out anonymous submit still works and lands in `/admin/requests` with no linked user.
3. `/portal/sign-in?next=//evil.example` falls back to `/portal` after sign-in.
4. Admin → Sales Reps: create a rep, edit it, toggle inactive (disappears from customer dropdown), delete (confirm dialog mentions client count; assigned customers become Unassigned).
5. Admin → Customers: new/edit forms show the Sales rep dropdown; list shows the Sales rep column.
6. Desktop nav (≥1280px): Contact appears once (red button). Mobile menu: Contact appears once.

- [ ] **Step 3: Fix anything found, then final commit if needed**

If verification surfaced fixes, commit them:

```bash
git add -A && git commit -m "fix: post-verification fixes for quote sign-in / sales reps"
```
