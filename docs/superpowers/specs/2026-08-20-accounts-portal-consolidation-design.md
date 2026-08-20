# Accounts Portal Consolidation — Design

**Date:** 2026-08-20
**Status:** Approved

## Goal

Collapse the three separate back-office entry points — the password-only admin
(`/admin`), the sales-rep portal (`/sales`), and the customer portal
(`/portal`) — into one **Accounts Portal** at `/portal`. Every account
(admin, sales rep, customer) signs in through a single page; the dashboard
and navigation adapt to the signed-in role. The site-header tab renames from
"Customer Portal" to "Accounts Portal".

## Non-goals

- No changes to what each role can *do* (permissions/features are unchanged;
  only where they live and how they authenticate).
- No self-service sign-up, no forgot-password self-service for reps/admins
  beyond the existing invite/resend flow.
- No change to the preview gate (`SITE_PASSWORD`) behaviour other than
  removing the now-dead `/admin` special case.

## 1. Auth model — one system, three roles

Admins become first-class better-auth users with `role="admin"`. Customers
(`role="customer"`) and reps (`role="rep"`) already work this way; nothing
about their accounts changes.

**Retired entirely:**

- `ADMIN_PASSWORD` env var and the shared-password login.
- The HMAC admin cookie purpose (`verifySession(..., "admin")`).
- `lib/actions/auth.ts` (old `login`/`logout` server actions).
- `app/admin/login/` page.

`lib/auth/session.ts` survives **only** for the preview gate (`"preview"`
purpose); the `"admin"` purpose and its call sites are removed.

**Rewritten to the better-auth check:**

- `lib/auth/require-admin.ts` — `requireAdmin()` becomes: read
  `getPortalSession()`, require `session.user.role === "admin"`, otherwise
  `redirect("/portal/sign-in")`. The seven admin action files that call it
  (`admin-products`, `admin-variants`, `admin-categories`, `admin-inquiries`,
  `admin-sales-reps`, `admin-settings`, `customers`) do not change.
- `app/api/admin/upload/route.ts` — replaces the HMAC-cookie check with the
  same session + role check (returns 401 as today).

**Password-length nuance:** better-auth's default minimum password length is
8; the specified seed credential `test123` is 7 characters. Set
`minPasswordLength: 6` in `lib/auth/portal.ts` so the seeded credential is
valid.

The better-auth `admin` plugin already treats `"admin"` as its admin role, so
the existing headerless `auth.api.createUser` provisioning escape hatch keeps
working, and signed-in admins gain (acceptable) access to the plugin's
user-management endpoints.

## 2. Route tree — one tree, role-aware pages

`app/admin/*` and `app/sales/*` are **deleted**. Everything lives under
`app/portal/`:

| Route | Role(s) | Renders |
|---|---|---|
| `/portal/sign-in` | public | the single sign-in page (role-neutral copy) |
| `/portal` | all | dashboard, branched by role: admin dashboard (old `/admin` landing), rep dashboard (old `/sales`), customer dashboard (unchanged) |
| `/portal/analytics` | admin | moved from `/admin/analytics` |
| `/portal/products` | admin | moved from `/admin/products` |
| `/portal/categories` | admin | moved from `/admin/categories` |
| `/portal/requests` | admin | moved from `/admin/requests` |
| `/portal/sales-reps` | admin | moved from `/admin/sales-reps` |
| `/portal/settings` | admin | moved from `/admin/settings` |
| `/portal/admins` | admin | **new** — admin account management |
| `/portal/customers` | admin or rep | collision page: admins get the provisioning list (old `/admin/customers`); reps get "my customers" (old `/sales/customers`) |
| `/portal/customers/[id]` | rep | rep's customer detail (old `/sales/customers/[id]`); admins are redirected to `/portal/customers` |
| `/portal/quotes`, `/portal/quotes/[id]` | rep | moved from `/sales/quotes*` |
| `/portal/history` (+ existing children) | customer | unchanged |
| `/portal/profile` | customer | unchanged |

**Guard model:** the `(protected)` layout gates only "signed in at all"
(redirect to `/portal/sign-in` otherwise). Each page enforces its allowed
roles via small helpers:

- `requireAdminSession()` — session with `role === "admin"`.
- `getSalesSession()` (existing, unchanged logic: `role === "rep"` + active
  linked `SalesRep`).
- customer pages check `role === "customer"`.

Wrong-role visitors are redirected to `/portal` (their own dashboard), never
to an error page. A rep whose `SalesRep` record is inactive gets signed-out
semantics on rep pages (redirect to `/portal`, which shows nothing
privileged), matching today's `getSalesSession()` behaviour.

## 3. Portal chrome — one layout, role-driven nav

One shared `(protected)` layout using the current portal tab-bar style
(Container, wordmark, sign-out button). Nav items derive from the session
role:

- **admin:** Dashboard, Analytics, Products, Categories, Requests, Customers,
  Sales Reps, Admins, Settings
- **rep:** Dashboard, My customers, Quotes (+ rep name shown, as today)
- **customer:** Dashboard, History, Profile, Browse products, Start a quote

The admin sidebar layout (`w-56` aside) goes away; admin pages adopt the
portal `Container` chrome. Long admin tab rows flex-wrap. The wordmark reads
"MEC Portal" for all roles.

Site header (`components/layout/Nav.tsx`): the `/portal` tab label changes
from "Customer Portal" to **"Accounts Portal"** (footer/banner links to
`/portal` keep working unchanged). Sign-in page copy becomes role-neutral;
after sign-in every role lands on `/portal`.

## 4. First admin + admin management

**Seed:** `prisma/seed.ts` creates `admin@example.com` / `test123`
idempotently (skip if the email already exists) via the same headerless
`auth.api.createUser` path provisioning uses, then sets `role="admin"` and
stamps `activatedAt` so the account is immediately usable and shows "Active".

**`/portal/admins` (new, admin-only), mirroring the sales-reps screen:**

- List `role="admin"` users with Pending/Active badge.
- Provision a new admin by name + email — random password + the existing 72h
  set-password invite (`provisionUser`, whose role union extends to
  `"admin"`; invite `redirectTo` becomes `/portal` for all roles).
- Resend invite.
- Deactivate/reactivate (better-auth `banned` flag), with guards: an admin
  cannot deactivate themself, and the last active admin cannot be
  deactivated.

The set-password page/email copy gains an admin variant (the sender already
re-reads role to pick copy).

## 5. Redirects, proxy, and env cleanup

- **`next.config.ts` `redirects()`** (permanent):
  - `/admin/login` → `/portal/sign-in`
  - `/sales/sign-in` → `/portal/sign-in`
  - `/admin/:path*` → `/portal/:path*` (sub-page names match 1:1)
  - `/sales/:path*` → `/portal/:path*`
  - `/admin` → `/portal`, `/sales` → `/portal`
- **`proxy.ts`:** delete the `/admin` branch entirely — the proxy becomes
  preview-gate-only. Remove `/sales` from `PREVIEW_EXEMPT_PREFIXES`
  (`/portal` stays; `/api/admin` stays — the upload route still self-checks).
  Note: `next.config.ts` redirects run before the proxy, so old `/admin`
  and `/sales` URLs never hit the gate logic.
- **Env/docs:** drop `ADMIN_PASSWORD` from `.env.example`; update README and
  `CLAUDE.md` (auth section, admin section, commands unaffected) to describe
  the unified portal and the seeded admin.

## 6. Testing & migration

No automated test suite; verification is:

- `npx tsc --noEmit`, `npm run build`, `npm run lint`.
- Manual click-through matrix:
  - each role signs in at `/portal/sign-in` and lands on its dashboard;
  - each role's nav pages render;
  - collision route `/portal/customers` shows the right view per role;
  - wrong-role access (e.g. customer → `/portal/products`) redirects to
    `/portal`;
  - old URLs (`/admin`, `/admin/products`, `/sales/quotes`,
    `/sales/sign-in`) redirect correctly;
  - seed runs twice without duplicating the admin;
  - provisioning a second admin sends the invite and the set-password flow
    activates it;
  - deactivation guards (self / last admin) hold;
  - preview gate: public pages still gated when `SITE_PASSWORD` set,
    `/portal` reachable.

**Migration:** existing customer/rep accounts are untouched (roles and page
paths unchanged for customers; rep bookmarks redirect). Deployed admins sign
in with the seeded account (or a provisioned one) after deploy. The old admin
cookie simply becomes inert.
