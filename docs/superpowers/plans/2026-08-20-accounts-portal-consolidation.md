# Accounts Portal Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the admin (`/admin`), sales (`/sales`), and customer (`/portal`) back-offices into one Accounts Portal at `/portal` with a single better-auth sign-in and role-adaptive dashboard/nav.

**Architecture:** Admins become better-auth users (`role="admin"`); the legacy `ADMIN_PASSWORD`/HMAC-cookie auth is deleted. All back-office pages move flat under `app/portal/(protected)/` with per-page role guards; `/portal/customers` is the one role-branched (admin vs rep) collision route. Old URLs redirect via `next.config.ts`.

**Tech Stack:** Next.js 16 App Router (Server Components + Server Actions), better-auth (email/password, admin plugin), Prisma 7 + SQLite, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-08-20-accounts-portal-consolidation-design.md`

## Global Constraints

- Work in `minott-web/` — all commands run from there.
- **Next.js 16 / React 19**: `cookies()`, `headers()`, route `params`/`searchParams` are async — always `await` them. Middleware is `proxy.ts`, not `middleware.ts`. If unsure of an API, read `node_modules/next/dist/docs/`.
- Named exports for all components except Next `page`/`layout`/`proxy` (default). `@/` path alias. Server Components by default; `"use client"` only when interactive.
- **No test suite exists.** Each task's verification is `npx tsc --noEmit` (must be clean) plus the task-specific runtime check given in its steps. Run `npm run lint` before each commit.
- Match surrounding code style; keep the existing comment tone (comments explain constraints, not narration).
- Role strings are exactly `"admin"`, `"rep"`, `"customer"` (`User.role`, plain string column).
- The seeded admin credential is exactly `admin@example.com` / `test123` (7 chars — hence `minPasswordLength: 6`).
- Keep `/api/admin/upload` at its current path (the `"/api/admin"` string is NOT part of the `/admin` page-route cleanup).
- One commit per task, from the repo root (`/root/Work/github/Minott`), message per task step.

## Deviation from spec (approved intent, corrected detail)

The spec said `/portal/customers/[id]` is rep-only. That missed that the admin tree has its own `customers/[id]` (edit form) and `customers/new`. Correction preserved here: `/portal/customers/[id]` branches by role (admin → edit view, rep → customer detail), `/portal/customers/new` is admin-only. This preserves existing functionality, per the spec's "no permission/feature changes" non-goal.

## Transient states between tasks

Every task leaves `tsc`/`lint` clean and the app bootable, but between Tasks 3–7 some nav links point at not-yet-moved pages (404) and old `/admin`/`/sales` pages still exist. That's expected; full end-to-end behavior lands at Task 8 and is verified in Task 9.

---

### Task 1: Better-auth admin role plumbing

Make `role="admin"` a first-class account type: password policy, action/API guards, provisioning, invite email + set-password copy.

**Files:**
- Modify: `minott-web/lib/auth/portal.ts` (add `minPasswordLength`)
- Modify: `minott-web/lib/auth/require-admin.ts` (rewrite)
- Modify: `minott-web/app/api/admin/upload/route.ts` (auth check swap)
- Modify: `minott-web/lib/auth/provision.ts` (role union + `INVITE_REDIRECT.admin`)
- Modify: `minott-web/emails/account-invite.tsx` (admin copy variant)
- Modify: `minott-web/lib/email/send-account-invite.tsx` (admin portal mapping + subject)
- Modify: `minott-web/app/set-password/page.tsx`, `minott-web/components/auth/SetPasswordForm.tsx` (admin variant; success link → `/portal/sign-in` for ALL portals)

**Interfaces:**
- Consumes: `getPortalSession()` from `@/lib/portal` (existing, unchanged).
- Produces: `requireAdmin(): Promise<void>` (same name/signature as today — the 7 admin action files that call it must NOT need changes); `provisionUser({ role: "customer" | "rep" | "admin", ... })`; `INVITE_REDIRECT.admin === "/set-password?portal=admin"`.

- [ ] **Step 1: Password policy + provisioning role union**

In `lib/auth/portal.ts`, inside `emailAndPassword`, add (with a comment noting the seeded admin credential is 7 chars):

```ts
    // Better-auth defaults to 8; the seeded admin credential (test123) is 7.
    minPasswordLength: 6,
```

In `lib/auth/provision.ts`:
- Change `role: "customer" | "rep"` to `role: "customer" | "rep" | "admin"` in `provisionUser`'s options type. The existing `if (role !== "customer")` post-create role update already handles `"admin"`.
- Extend `INVITE_REDIRECT`:

```ts
export const INVITE_REDIRECT = {
  customer: "/set-password?portal=customer",
  sales: "/set-password?portal=sales",
  admin: "/set-password?portal=admin",
} as const;
```

- [ ] **Step 2: Rewrite `requireAdmin` to the better-auth check**

Replace the entire body of `lib/auth/require-admin.ts`:

```ts
import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal";

/**
 * Authorization guard for admin-only Server Actions. Server Actions are public
 * HTTP endpoints reachable from ANY route, so route-level gates are not a
 * sufficient check — every admin mutation must verify the session itself.
 * Requires a better-auth session with role="admin"; redirects (aborting the
 * action) otherwise.
 */
export async function requireAdmin(): Promise<void> {
  const session = await getPortalSession();
  if (!session || session.user.role !== "admin") redirect("/portal/sign-in");
}
```

- [ ] **Step 3: Swap the upload route's auth check**

In `app/api/admin/upload/route.ts`, replace the `cookies`/`verifySession` import + check at the top of `POST` with:

```ts
import { getPortalSession } from "@/lib/portal";
```

```ts
  const session = await getPortalSession();
  if (session?.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
```

Remove the now-unused `cookies`, `verifySession`, `SESSION_COOKIE` imports from this file.

- [ ] **Step 4: Admin invite email + set-password variants**

`emails/account-invite.tsx`: change `portal: "customer" | "sales"` to `portal: "customer" | "sales" | "admin"` and add to `COPY`:

```ts
  admin: {
    invite: {
      heading: "Set up your MEC admin access",
      body: "You've been added as an administrator for Minott Equipment & Chemicals. Set your password to access the Accounts Portal, where you can manage products, requests, customers and the team.",
      cta: "Set your password",
    },
    reset: {
      heading: "Reset your MEC admin password",
      body: "We received a request to reset the password for your MEC admin account. Choose a new password below.",
      cta: "Choose a new password",
    },
  },
```

`lib/email/send-account-invite.tsx`: replace the `portal` mapping and subject with:

```ts
    const portal =
      user.role === "rep" ? "sales" : user.role === "admin" ? "admin" : "customer";
```

```ts
      subject: isInvite
        ? portal === "sales"
          ? "Set up your MEC sales portal access"
          : portal === "admin"
            ? "Set up your MEC admin access"
            : "Activate your Minott account"
        : "Reset your Minott password",
```

`app/set-password/page.tsx`: derive `const portalKind = portal === "sales" ? "sales" : portal === "admin" ? "admin" : "customer";` and use it for the Eyebrow (`"Sales Portal"` / `"Admin"` / `"Customer Portal"`) and pass `portal={portalKind}` to the form.

`components/auth/SetPasswordForm.tsx`: widen the `portal` prop to `"customer" | "sales" | "admin"`, and make the post-success sign-in destination `/portal/sign-in` for ALL portals (delete any `portal === "sales" ? "/sales/sign-in" : ...` branching; the copy strings may stay per-portal).

- [ ] **Step 5: Verify + commit**

Run: `npx tsc --noEmit` (clean) and `npm run lint` (clean).
Grep: `grep -rn '"/sales/sign-in"' components/auth/` → no matches.

```bash
git add -A minott-web && git commit -m "feat(auth): admin role plumbing — better-auth requireAdmin, provisioning, invite copy"
```

---

### Task 2: Seed the first admin (admin@example.com / test123)

**Files:**
- Modify: `minott-web/prisma/seed.ts`

**Interfaces:**
- Consumes: `auth.api.createUser` from `@/lib/auth/portal` (headerless admin escape hatch — see the doc comment in that file).
- Produces: an idempotent `seedAdmin()` run as part of the seed; a `User` row `{ email: "admin@example.com", role: "admin", activatedAt: non-null }` with a matching better-auth `Account` credential row.

- [ ] **Step 1: Add `seedAdmin()` to the seed script**

In `prisma/seed.ts`, add near the other seed steps and call it from the main flow (before the final disconnect). Use a dynamic import so the better-auth stack (which builds its own Prisma client via `@/lib/db`) only loads when needed:

```ts
const ADMIN_EMAIL = "admin@example.com";

/**
 * First admin account for the unified Accounts Portal. Created through
 * better-auth (headerless createUser) so the credential Account row uses
 * better-auth's own hash format; activated immediately (no invite email —
 * createUser does not trigger sendResetPassword). Idempotent: skips when the
 * email already exists.
 */
async function seedAdmin() {
  const existing = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`Admin ${ADMIN_EMAIL} already exists — skipping.`);
    return;
  }
  const { auth } = await import("../lib/auth/portal");
  await auth.api.createUser({
    body: { email: ADMIN_EMAIL, password: "test123", name: "MEC Admin", data: {} },
  });
  await db.user.update({
    where: { email: ADMIN_EMAIL },
    data: { role: "admin", activatedAt: new Date() },
  });
  console.log(`Seeded admin ${ADMIN_EMAIL}.`);
}
```

Check how `prisma/seed.ts` imports resolve (`prisma.config.ts` runs the seed via tsx, which honors tsconfig paths). If `../lib/auth/portal` fails to resolve, use `@/lib/auth/portal`. Note: this loads `lib/db.ts` (a second Prisma client on the same SQLite file) — fine for a sequential seed script.

- [ ] **Step 2: Verify idempotency + credential**

Run: `npm run db:seed` twice. Expected: first run logs `Seeded admin admin@example.com.`, second logs `already exists — skipping.`, neither errors.

Verify the row (from `minott-web/`):

```bash
npx tsx -e "import { db } from './lib/db'; db.user.findUnique({ where: { email: 'admin@example.com' }, select: { role: true, activatedAt: true, accounts: { select: { providerId: true } } } }).then(u => { console.log(u); process.exit(0); })"
```

Expected: `role: 'admin'`, non-null `activatedAt`, one account with `providerId: 'credential'`. (If `accounts` isn't a relation name on `User`, check `prisma/schema.prisma` for the actual relation field and adjust the query — the assertion that matters is the credential Account row exists.)

- [ ] **Step 3: Commit**

```bash
git add -A minott-web && git commit -m "feat(seed): seed first admin account (admin@example.com)"
```

---

### Task 3: Unified portal chrome — layout, sign-in copy, nav label

**Files:**
- Modify: `minott-web/app/portal/(protected)/layout.tsx` (rewrite: gate = signed-in only; role-driven nav)
- Modify: `minott-web/app/portal/sign-in/page.tsx` (role-neutral copy)
- Modify: `minott-web/components/layout/Nav.tsx` (label "Customer Portal" → "Accounts Portal")

**Interfaces:**
- Consumes: `getPortalSession()`; `SignOutButton` from `@/components/portal/SignOutButton`.
- Produces: the layout later tasks' pages render under. Nav hrefs (later tasks must create exactly these): admin → `/portal`, `/portal/analytics`, `/portal/products`, `/portal/categories`, `/portal/requests`, `/portal/customers`, `/portal/sales-reps`, `/portal/admins`, `/portal/settings`; rep → `/portal`, `/portal/customers`, `/portal/quotes`; customer → `/portal`, `/portal/history`, `/portal/profile`, `/products`, `/quote`.

- [ ] **Step 1: Rewrite the protected layout**

Replace `app/portal/(protected)/layout.tsx` with:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/primitives/Container";
import { SignOutButton } from "@/components/portal/SignOutButton";
import { getPortalSession } from "@/lib/portal";

type NavItem = { href: string; label: string };

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  admin: [
    { href: "/portal", label: "Dashboard" },
    { href: "/portal/analytics", label: "Analytics" },
    { href: "/portal/products", label: "Products" },
    { href: "/portal/categories", label: "Categories" },
    { href: "/portal/requests", label: "Requests" },
    { href: "/portal/customers", label: "Customers" },
    { href: "/portal/sales-reps", label: "Sales Reps" },
    { href: "/portal/admins", label: "Admins" },
    { href: "/portal/settings", label: "Settings" },
  ],
  rep: [
    { href: "/portal", label: "Dashboard" },
    { href: "/portal/customers", label: "My customers" },
    { href: "/portal/quotes", label: "Quotes" },
  ],
  customer: [
    { href: "/portal", label: "Dashboard" },
    { href: "/portal/history", label: "History" },
    { href: "/portal/profile", label: "Profile" },
    { href: "/products", label: "Browse products" },
    { href: "/quote", label: "Start a quote" },
  ],
};

/**
 * Gate for the unified Accounts Portal: signed-in only. Role-specific access
 * is enforced per-page (wrong-role visitors are redirected to /portal, their
 * own dashboard) — the layout only decides "has a session at all" and which
 * nav to draw.
 */
export default async function PortalProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/sign-in");
  const nav = NAV_BY_ROLE[session.user.role] ?? NAV_BY_ROLE.customer;

  return (
    // pt-24 clears the fixed site nav; the portal's own navigation renders as
    // in-page tabs below it rather than a second site-wide bar.
    <div className="min-h-screen bg-mec-mist pt-24 text-mec-ink">
      <Container className="pb-[var(--spacing-section-y)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-mec-ink/10 pb-4 pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-display-tight text-lg tracking-tight">
              <span className="text-mec-red">MEC</span> Portal
            </span>
            <nav
              aria-label="Accounts portal"
              className="flex flex-wrap items-center gap-1"
            >
              {nav.map((n) => (
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
            <span className="hidden text-sm text-mec-ink/60 sm:inline">
              {session.user.name}
            </span>
            <SignOutButton />
          </div>
        </div>
        <div className="pt-12">{children}</div>
      </Container>
    </div>
  );
}
```

- [ ] **Step 2: Role-neutral sign-in copy**

In `app/portal/sign-in/page.tsx` (structure/form unchanged — copy only):
- `metadata.title`: `"Accounts Portal Sign In | Minott Equipment & Chemicals"`; description: `"Sign in to the Minott Equipment & Chemicals accounts portal — customers, sales reps and administrators."`
- `<Eyebrow>Customer Portal</Eyebrow>` → `<Eyebrow>Accounts Portal</Eyebrow>`
- Body copy `"Sign in to review your quote requests and order history with Minott Equipment & Chemicals."` → `"Sign in to your Minott Equipment & Chemicals account."`
- Keep the "Need access?" footer as-is.

- [ ] **Step 3: Nav label**

`components/layout/Nav.tsx` line ~24: `{ href: "/portal", label: "Customer Portal" }` → `{ href: "/portal", label: "Accounts Portal" }`. Grep for any other user-visible "Customer Portal" strings in `components/layout/` and `components/products/ShowroomBanner.tsx`, `components/quote/QuotePageClient.tsx`; update labels that name the tab (leave copy that genuinely means customers only).

- [ ] **Step 4: Verify + commit**

Run: `npx tsc --noEmit`, `npm run lint`.
Runtime: `npm run dev` (background), then confirm `curl -s http://localhost:3000/portal -o /dev/null -w '%{http_code} %{redirect_url}'` redirects to `/portal/sign-in` when signed out. Kill the dev server.

```bash
git add -A minott-web && git commit -m "feat(portal): unified Accounts Portal chrome — role-driven nav, neutral sign-in"
```

---

### Task 4: Role-branched dashboard at /portal

**Files:**
- Create: `minott-web/components/portal/dashboards/CustomerDashboard.tsx` (content moved from `app/portal/(protected)/page.tsx`)
- Create: `minott-web/components/portal/dashboards/RepDashboard.tsx` (content moved from `app/sales/(protected)/page.tsx`)
- Create: `minott-web/components/portal/dashboards/AdminDashboard.tsx` (content moved from `app/admin/(protected)/page.tsx`)
- Modify: `minott-web/app/portal/(protected)/page.tsx` (becomes the role switch)
- DO NOT delete the old `/admin` and `/sales` pages yet (Task 8).

**Interfaces:**
- Consumes: `getPortalSession()`, `getSalesSession()` (`@/lib/sales`), existing read helpers (`getUserInquiries`, `getRepStats`, `getLatestRepQuotes`, `db` counts).
- Produces: `AdminDashboard(): Promise<JSX>` (no props, async server component); `RepDashboard({ rep }: { rep: { id: number; name: string } })`; `CustomerDashboard({ userId, userName }: { userId: string; userName: string })` — adjust prop names to whatever the moved code actually needs, but keep them primitive/serializable and document them in the component doc comment.

- [ ] **Step 1: Extract the three dashboards**

Each new file is an async Server Component (named export) whose JSX is moved verbatim from its source page, with ONLY these changes:
- `AdminDashboard`: card hrefs `/admin/products` → `/portal/products`, `/admin/categories` → `/portal/categories`, `/admin/requests` → `/portal/requests`. Keep the `db.product.count()` etc. queries inside the component.
- `RepDashboard`: takes the rep (id + name) as a prop instead of calling `getSalesSession()` itself; all `/sales/...` hrefs → `/portal/...` (`/sales/customers` → `/portal/customers`, `/sales/quotes` → `/portal/quotes`, quote detail `/sales/quotes/${id}` → `/portal/quotes/${id}`).
- `CustomerDashboard`: takes the user id/name as props instead of reading the session; internal hrefs already point at `/portal/*` — keep them.
- Move page-local helpers (e.g. `formatDate`) into the component files that use them.

- [ ] **Step 2: Rewrite `/portal` page as the role switch**

```tsx
import type { Metadata } from "next";
import { getPortalSession } from "@/lib/portal";
import { getSalesSession } from "@/lib/sales";
import { AdminDashboard } from "@/components/portal/dashboards/AdminDashboard";
import { RepDashboard } from "@/components/portal/dashboards/RepDashboard";
import { CustomerDashboard } from "@/components/portal/dashboards/CustomerDashboard";

export const metadata: Metadata = {
  title: "Accounts Portal | Minott Equipment & Chemicals",
  description:
    "Your Minott Equipment & Chemicals accounts portal dashboard.",
};

export default async function PortalDashboardPage() {
  // Layout guarantees a session; re-read it here for the role branch.
  const session = await getPortalSession();
  if (!session) return null;

  if (session.user.role === "admin") return <AdminDashboard />;

  if (session.user.role === "rep") {
    const sales = await getSalesSession();
    if (!sales) {
      // Rep account whose SalesRep record is missing/inactive: nothing
      // privileged to show, but don't dead-end them on an error page.
      return (
        <div>
          <h1 className="font-display-tight text-3xl">Account inactive</h1>
          <p className="mt-3 text-sm text-mec-ink/65">
            Your sales access has been deactivated. Contact an administrator
            if you believe this is a mistake.
          </p>
        </div>
      );
    }
    return <RepDashboard rep={sales.rep} />;
  }

  return (
    <CustomerDashboard userId={session.user.id} userName={session.user.name} />
  );
}
```

(Adjust the `rep` / customer props to match Step 1's actual signatures.)

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit`, `npm run lint`.
Runtime: `npm run dev`; sign in as admin@example.com / test123 via the API to prove the seeded credential works end-to-end:

```bash
curl -si http://localhost:3000/api/auth/sign-in/email -H 'content-type: application/json' \
  -d '{"email":"admin@example.com","password":"test123"}' | head -20
```

Expected: 200 with a `set-cookie` session. Then request `/portal` with that cookie and confirm the response contains the admin dashboard ("Products", "Categories", "New requests" cards). Kill the dev server.

```bash
git add -A minott-web && git commit -m "feat(portal): role-branched dashboard (admin/rep/customer) at /portal"
```

---

### Task 5: Move admin pages under /portal (except customers)

**Files:**
- Move: `app/admin/(protected)/{analytics,products,categories,requests,sales-reps,settings}` → `app/portal/(protected)/{same-name}` (all nested pages: `products/new`, `products/[id]/edit`, `categories/new`, `categories/[id]/edit`, `sales-reps/new`, `sales-reps/[id]/edit` come along)
- Modify: every moved page + `minott-web/lib/portal.ts` (add `requireAdminSession`)
- Modify: `minott-web/lib/actions/admin-products.ts`, `admin-variants.ts`, `admin-categories.ts`, `admin-inquiries.ts`, `admin-sales-reps.ts`, `admin-settings.ts` (path strings)
- Modify: `minott-web/components/admin/ProductForm.tsx`, `CategoryForm.tsx`, `SalesRepForm.tsx` (link/redirect strings; leave `"/api/admin/upload"` untouched)

**Interfaces:**
- Consumes: `getPortalSession()`.
- Produces: `requireAdminSession()` in `@/lib/portal` — returns the session (typed as `getPortalSession`'s non-null result) or redirects; used by every admin page from now on:

```ts
/**
 * Page gate for admin-only portal routes. Signed-out users are handled by the
 * (protected) layout; this redirects signed-in non-admins to their own
 * dashboard instead of an error page.
 */
export async function requireAdminSession() {
  const session = await getPortalSession();
  if (!session || session.user.role !== "admin") redirect("/portal");
  return session;
}
```

(`redirect` comes from `next/navigation`; add the import to `lib/portal.ts`.)

- [ ] **Step 1: Add `requireAdminSession` to `lib/portal.ts`** (code above).

- [ ] **Step 2: Move the six admin sections**

`git mv` each directory (run from `minott-web/`):

```bash
for d in analytics products categories requests sales-reps settings; do
  git mv "app/admin/(protected)/$d" "app/portal/(protected)/$d"
done
```

Then in EVERY moved `page.tsx`:
1. Add as the first statement of the page function: `await requireAdminSession();` (import from `@/lib/portal`). The old admin layout did the gating; these pages now gate themselves.
2. Replace every `"/admin/` string with `"/portal/` (hrefs, `redirect(...)` targets, breadcrumbs).

- [ ] **Step 3: Update action + form path strings**

In the six `lib/actions/admin-*.ts` files and the three `components/admin/*Form.tsx` files: replace `"/admin/` → `"/portal/` in `revalidatePath(...)`, `redirect(...)`, and `<Link>`/router hrefs. **Exception:** any `"/api/admin/upload"` string stays. `lib/actions/customers.ts` is Task 6 — leave it.

- [ ] **Step 4: Verify + commit**

Run: `npx tsc --noEmit`, `npm run lint`.
Grep: `grep -rn '"/admin' lib/actions/ components/admin/ 'app/portal/(protected)'` → only `"/api/admin/upload"` matches (in ProductForm) and nothing else. Note `lib/actions/customers.ts` will still match — that's expected until Task 6.
Runtime: dev server + admin session cookie (as in Task 4): `/portal/products`, `/portal/analytics`, `/portal/settings` render; `/portal/products` as a signed-out user redirects to sign-in.

```bash
git add -A minott-web && git commit -m "feat(portal): move admin sections under /portal with per-page role guards"
```

---

### Task 6: Move sales pages + role-branched /portal/customers

**Files:**
- Move: `app/sales/(protected)/quotes` → `app/portal/(protected)/quotes` (list + `[id]`)
- Create: `app/portal/(protected)/customers/page.tsx` (role switch), `.../customers/AdminCustomersView.tsx`, `.../customers/RepCustomersView.tsx`
- Create: `app/portal/(protected)/customers/[id]/page.tsx` (role switch), plus `AdminCustomerEditView.tsx` / `RepCustomerDetailView.tsx` beside it
- Move: `app/admin/(protected)/customers/new` → `app/portal/(protected)/customers/new` (admin-only)
- Delete (content absorbed into the views): `app/admin/(protected)/customers/page.tsx`, `app/admin/(protected)/customers/[id]/page.tsx`, `app/sales/(protected)/customers/page.tsx`, `app/sales/(protected)/customers/[id]/page.tsx`
- Modify: `minott-web/lib/actions/customers.ts`, `minott-web/lib/actions/sales.ts` (path strings), `minott-web/components/admin/CustomerForm.tsx`, `minott-web/components/sales/RepCustomerForm.tsx` (path strings)

**Interfaces:**
- Consumes: `requireAdminSession()` (Task 5), `getSalesSession()`, existing reads (`getPortalUsers`, `getRepCustomers`, `getRepCustomerById`, `getRepQuotes`, `getRepQuoteById`).
- Produces: view components are non-page async Server Components co-located in the route folder (NOT exported as pages — plain `.tsx` files, named exports): `AdminCustomersView()`, `RepCustomersView({ repId }: { repId: number })`, `AdminCustomerEditView({ id }: { id: string })`, `RepCustomerDetailView({ repId, id }: { repId: number; id: string })` — again, match the moved code's real needs and document props.

- [ ] **Step 1: Move quotes**

`git mv "app/sales/(protected)/quotes" "app/portal/(protected)/quotes"`. In both pages: replace the old gate (`getSalesSession()` + `redirect("/sales/sign-in")`) with:

```ts
  const sales = await getSalesSession();
  if (!sales) redirect("/portal");
```

and replace all `"/sales/` strings with `"/portal/`.

- [ ] **Step 2: Build the customers role switch**

`app/portal/(protected)/customers/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal";
import { getSalesSession } from "@/lib/sales";
import { AdminCustomersView } from "./AdminCustomersView";
import { RepCustomersView } from "./RepCustomersView";

/**
 * The one route two roles share: admins manage/provision all customers, reps
 * see their own book of business. Branches on role; everyone else goes to
 * their dashboard.
 */
export default async function PortalCustomersPage() {
  const session = await getPortalSession();
  if (session?.user.role === "admin") return <AdminCustomersView />;
  if (session?.user.role === "rep") {
    const sales = await getSalesSession();
    if (sales) return <RepCustomersView repId={sales.rep.id} />;
  }
  redirect("/portal");
}
```

`AdminCustomersView.tsx` = the old `app/admin/(protected)/customers/page.tsx` body (queries included) with `/admin/` hrefs → `/portal/`; `RepCustomersView.tsx` = old `app/sales/(protected)/customers/page.tsx` body with `/sales/` → `/portal/`. Neither calls a session gate itself (the page did it). Move any `searchParams`-dependent logic into the page and pass values down as props if needed.

`customers/[id]/page.tsx` follows the identical pattern (await the async `params` in the page, pass `id` down): admin → `AdminCustomerEditView` (old admin edit page body), rep → `RepCustomerDetailView` (old sales detail body; keep its "not mine → notFound()" behavior), else `redirect("/portal")`.

`customers/new/page.tsx`: moved admin page; add `await requireAdminSession();` and update `/admin/` strings.

- [ ] **Step 3: Update action/form paths**

`lib/actions/customers.ts`: `/admin/customers` strings → `/portal/customers` (revalidatePath + redirect). `lib/actions/sales.ts`: `/sales/` → `/portal/` (e.g. quote revalidation paths). `components/admin/CustomerForm.tsx` and `components/sales/RepCustomerForm.tsx`: same replacement.

- [ ] **Step 3b: Customer-only guards on history/profile**

The layout now admits all roles, so the customer pages must gate themselves. In `app/portal/(protected)/history/page.tsx`, `history/[id]/page.tsx`, and `profile/page.tsx`, replace the existing "no session → sign-in" check with:

```ts
  const session = await getPortalSession();
  if (!session) redirect("/portal/sign-in");
  if (session.user.role !== "customer") redirect("/portal");
```

(Keep whatever each page does with the session afterwards unchanged.)

- [ ] **Step 4: Verify + commit**

Run: `npx tsc --noEmit`, `npm run lint`.
Grep: `grep -rn '"/sales\|"/admin' lib/actions/ components/ 'app/portal/(protected)'` → only `"/api/admin/upload"` remains.
Runtime: with the admin cookie, `/portal/customers` shows the provisioning list; `/portal/quotes` as admin redirects to `/portal`.

```bash
git add -A minott-web && git commit -m "feat(portal): move sales pages; role-branched /portal/customers"
```

---

### Task 7: Admins management screen (/portal/admins)

**Files:**
- Create: `minott-web/lib/actions/admins.ts`
- Create: `minott-web/app/portal/(protected)/admins/page.tsx`
- Create: `minott-web/components/admin/AdminAccountForm.tsx` (client form, `useActionState`)
- Modify: `minott-web/lib/portal.ts` (add `getAdminUsers`)

**Interfaces:**
- Consumes: `requireAdmin()` (action guard), `requireAdminSession()` (page guard), `provisionUser` + `sendInvite` + `INVITE_REDIRECT.admin` (Task 1), `getPortalSession()`.
- Produces: `getAdminUsers()` (list for the page); actions `createAdmin(prev, formData)`, `resendAdminInvite(formData)`, `setAdminActive(formData)`.

- [ ] **Step 1: `getAdminUsers` in `lib/portal.ts`**

```ts
/** List admin accounts for the /portal/admins management screen. */
export function getAdminUsers() {
  return db.user.findMany({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      activatedAt: true,
      banned: true,
      createdAt: true,
    },
  });
}
```

- [ ] **Step 2: `lib/actions/admins.ts`**

Follow the shape of `lib/actions/admin-sales-reps.ts` (read it first). Content:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { getPortalSession } from "@/lib/portal";
import { provisionUser, sendInvite, INVITE_REDIRECT } from "@/lib/auth/provision";

export type CreateAdminState = { error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Provision a new admin account; they set their password via the invite. */
export async function createAdmin(
  _prev: CreateAdminState,
  formData: FormData,
): Promise<CreateAdminState> {
  await requireAdmin();
  const email = str(formData, "email").toLowerCase();
  const name = str(formData, "name");
  if (!email) return { error: "Email is required." };
  if (!name) return { error: "Name is required." };

  const result = await provisionUser({
    email,
    name,
    role: "admin",
    redirectTo: INVITE_REDIRECT.admin,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/portal/admins");
  redirect("/portal/admins");
}

/** Re-send the set-password invite to a pending (or locked-out) admin. */
export async function resendAdminInvite(formData: FormData): Promise<void> {
  await requireAdmin();
  const email = str(formData, "email").toLowerCase();
  if (email) await sendInvite(email, INVITE_REDIRECT.admin);
  revalidatePath("/portal/admins");
}

/**
 * Deactivate/reactivate an admin via better-auth's `banned` flag (the admin
 * plugin refuses sign-in for banned users). Direct DB write instead of the
 * plugin's banUser endpoint (which wants an admin session's headers), so we
 * also revoke live sessions ourselves. Guards: no self-deactivation, and the
 * last active admin can't be deactivated.
 */
export async function setAdminActive(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = str(formData, "userId");
  const makeActive = str(formData, "active") === "true";
  if (!userId) return;

  if (!makeActive) {
    const session = await getPortalSession();
    if (session?.user.id === userId) return; // never deactivate yourself
    const activeAdmins = await db.user.count({
      where: { role: "admin", NOT: { banned: true }, activatedAt: { not: null } },
    });
    const target = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, banned: true, activatedAt: true },
    });
    if (!target || target.role !== "admin") return;
    const targetIsActive = !target.banned && target.activatedAt !== null;
    if (targetIsActive && activeAdmins <= 1) return; // keep at least one
  }

  await db.user.update({
    where: { id: userId },
    data: { banned: !makeActive, banReason: null, banExpires: null },
  });
  if (!makeActive) {
    await db.session.deleteMany({ where: { userId } });
  }
  revalidatePath("/portal/admins");
}
```

Check `prisma/schema.prisma` for the exact `banned`/`banReason`/`banExpires`/`session` model/field names (better-auth admin plugin schema) and adjust. If `banReason`/`banExpires` don't exist, drop them from the update.

- [ ] **Step 3: Page + form**

`app/portal/(protected)/admins/page.tsx` — mirror the structure/styling of the moved `app/portal/(protected)/sales-reps/page.tsx` (read it first): `await requireAdminSession()` (keep the session — it knows "you" for the self-row), fetch `getAdminUsers()`, render a table (Name, Email, Status badge Active/Pending/Deactivated, Created) with per-row forms: "Resend invite" (pending rows, → `resendAdminInvite`), "Deactivate"/"Reactivate" (→ `setAdminActive`; omit the Deactivate button on your own row), plus `AdminAccountForm` for inviting a new admin. Status: `banned` → "Deactivated"; else `activatedAt` null → "Pending" : "Active".

`components/admin/AdminAccountForm.tsx` — copy the form pattern from `components/admin/SalesRepForm.tsx` (client component, `useActionState(createAdmin, {})`, name + email fields, error display, submit "Send invite").

- [ ] **Step 4: Verify + commit**

Run: `npx tsc --noEmit`, `npm run lint`.
Runtime: with the admin cookie, GET `/portal/admins` renders the seeded admin as Active with no Deactivate button on its own row. (Invite email sending is best-effort/console-warned without `RESEND_API_KEY` — expected.)

```bash
git add -A minott-web && git commit -m "feat(portal): admins management screen with invite + deactivation guards"
```

---

### Task 8: Delete legacy trees; redirects, proxy, chrome, env, docs

**Files:**
- Delete: `minott-web/app/admin/` (everything left: `login/`, `(protected)/layout.tsx`, `(protected)/page.tsx`), `minott-web/app/sales/` (everything left: `sign-in/`, `(protected)/layout.tsx`, `(protected)/page.tsx`), `minott-web/lib/actions/auth.ts`, `minott-web/lib/actions/sales-auth.ts`, `minott-web/components/sales/SalesSignInForm.tsx`, `minott-web/components/sales/SalesSignOutButton.tsx`
- Modify: `minott-web/next.config.ts` (redirects), `minott-web/proxy.ts` (drop admin branch), `minott-web/lib/auth/session.ts` (prune admin-only exports if now unused), `minott-web/components/layout/PublicChrome.tsx`, `minott-web/.env.example`, `minott-web/README.md` (if it documents ADMIN_PASSWORD), root `CLAUDE.md`

**Interfaces:**
- Consumes: nothing new. Produces: none (cleanup). After this task, `grep -rn 'ADMIN_PASSWORD' minott-web --include='*.ts' --include='*.tsx'` returns nothing.

- [ ] **Step 1: Delete legacy files** (list above). Then `grep -rn "actions/auth\|sales-auth\|SalesSignIn\|SalesSignOutButton" minott-web/app minott-web/components minott-web/lib` and fix any dangling imports.

- [ ] **Step 2: Redirects in `next.config.ts`**

```ts
  async redirects() {
    // The old three-portal URLs. Specific rules first — Next matches in order.
    return [
      { source: "/admin/login", destination: "/portal/sign-in", permanent: true },
      { source: "/sales/sign-in", destination: "/portal/sign-in", permanent: true },
      { source: "/admin", destination: "/portal", permanent: true },
      { source: "/sales", destination: "/portal", permanent: true },
      { source: "/admin/:path*", destination: "/portal/:path*", permanent: true },
      { source: "/sales/:path*", destination: "/portal/:path*", permanent: true },
    ];
  },
```

- [ ] **Step 3: Proxy + session + chrome cleanup**

`proxy.ts`: delete the whole `if (pathname.startsWith("/admin"))` branch and the `SESSION_COOKIE` import; remove `"/sales"` from `PREVIEW_EXEMPT_PREFIXES`; update the file's comments (the proxy is now preview-gate-only; `/admin`/`/sales` are config-level redirects that run before the proxy).

`lib/auth/session.ts`: keep `verifySession`/`signSession` + `PREVIEW_COOKIE` (preview gate uses them); delete exports now referenced nowhere (`SESSION_COOKIE`, `SESSION_TTL_MS` — confirm with grep before deleting).

`components/layout/PublicChrome.tsx`: `isBareChrome` becomes `pathname === "/preview"` only (the portal shows the public nav for all roles, as it does for customers today); update the comment.

- [ ] **Step 4: Env + docs**

- `.env.example`: remove `ADMIN_PASSWORD` (keep `SESSION_SECRET` — the preview gate uses it); add a comment block noting the seeded admin sign-in (`admin@example.com` / `test123` — change in production by inviting a real admin and deactivating the seeded one).
- Root `CLAUDE.md`: rewrite the "Admin auth" bullet (single better-auth system, three roles, `/portal` unified tree, seeded admin, `/portal/admins`), update the Architecture paragraph's route description and the preview-gate env note ("portal/sales/set-password" → "portal/set-password"), and the Known open items line about the sales portal path.
- `minott-web/README.md`: update any setup steps that mention `ADMIN_PASSWORD` or `/admin`.

- [ ] **Step 5: Verify + commit**

Run: `npx tsc --noEmit`, `npm run lint`, `npm run build` (full build must pass — first build since the deletions).
Greps: `grep -rn 'ADMIN_PASSWORD' minott-web --include='*.ts' --include='*.tsx'` → nothing; `ls minott-web/app` → no `admin`/`sales` dirs.
Runtime: `npm run start` (or dev): `curl -sI localhost:3000/admin` → 308 to `/portal`; `/sales/quotes` → 308 to `/portal/quotes`; `/admin/login` → 308 to `/portal/sign-in`.

```bash
git add -A && git commit -m "feat(portal)!: retire ADMIN_PASSWORD auth and /admin,/sales routes — unified Accounts Portal"
```

---

### Task 9: End-to-end verification matrix

No code changes expected — this is the acceptance pass. Fix-forward anything found (small fixes in this task's commit; anything structural goes back to the owning task's pattern).

**Files:** none planned (fixes only).

- [ ] **Step 1: Static checks** — `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean. `npm run db:seed` runs twice cleanly (idempotent).

- [ ] **Step 2: Auth + role matrix** (dev server; use curl with cookie jars, one per role):
  - Sign in admin@example.com/test123 → `/portal` shows the admin dashboard; `/portal/products`, `/portal/analytics`, `/portal/requests`, `/portal/sales-reps`, `/portal/admins`, `/portal/settings`, `/portal/customers` (provisioning list view) all 200.
  - Admin at rep-only routes: `/portal/quotes` → redirect `/portal`.
  - Provision a test customer + test rep from the admin UI or actions if none exist (RESEND unset → console warning is fine). For the rep, note the invite is console-skipped: activate by calling better-auth's reset flow manually OR verify rep behavior with an existing seeded/dev rep account if one exists; otherwise verify rep-page gating logic by code-review of the guards (record which method was used).
  - Customer session: `/portal` shows customer dashboard; `/portal/history`, `/portal/profile` 200; `/portal/products` (admin page) → redirect `/portal`; public `/products` catalog page still 200.
  - Signed out: `/portal/anything` → `/portal/sign-in`.
  - Wrong-password sign-in fails with 401.
- [ ] **Step 3: Redirect matrix** — `/admin`, `/admin/products`, `/admin/login`, `/sales`, `/sales/quotes`, `/sales/sign-in` all 308 to their `/portal` equivalents.
- [ ] **Step 4: Admins screen guards** — deactivating the only admin is refused (button absent on own row; direct action no-ops); inviting a second admin creates a Pending row; Resend invite doesn't error without RESEND_API_KEY.
- [ ] **Step 5: Preview gate** — set `SITE_PASSWORD=x` in `.env`, restart dev: `/about` redirects to `/preview`, `/portal/sign-in` stays reachable, `/api/products` stays reachable. Unset it afterwards.
- [ ] **Step 6: Commit any fixes**

```bash
git add -A && git commit -m "fix(portal): E2E verification fixes for accounts-portal consolidation"
```
