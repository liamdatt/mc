# Site-wide preview password gate — design

**Date:** 2026-07-28
**Status:** Approved

## Problem

The site is not live yet, but the URL will be shared with select customers for
feedback. The client wants a general password on the website — similar to the
admin gate — so the URL leaking doesn't expose the site publicly.

## Decisions (confirmed with user)

- **Scope:** public pages only. `/admin`, `/portal`, `/sales` keep their own
  logins as their only protection and are not behind the preview gate.
- **Unlock lifetime:** browser session only (session cookie, no `maxAge`).
- **Approach:** proxy-level cookie gate reusing the existing HMAC session
  helper and admin-login pattern.

## Config & kill switch

- New optional env var `SITE_PASSWORD`, documented in `minott-web/.env.example`.
- Gate is active only when `SITE_PASSWORD` is set to a non-empty value.
  When unset/empty, `proxy.ts` skips the preview check entirely — launching
  the site is just unsetting the env var and restarting. No code change.

## Gate logic (`minott-web/proxy.ts`)

Matcher broadens from `/admin/:path*` to all routes **except** `_next/`
internals, the static directories `images/`, `brand-logos/`, `svg/`, and the
exact literals `/favicon.ico` and `/robots.txt`. Directory-scoped, NOT
extension-scoped: an extension allowlist (and the original "any path with a
dot" rule) is bypassable via a fabricated dotted page path like `/about.png`,
which would escape the matcher and serve the branded 404 — full nav with
category names plus footer contact info — ungated. Consequence: any new file
placed at the `public/` root (e.g. the pending `og.jpg`) is gated unless it
moves under `public/images/` or gets its own anchored matcher literal.

Runtime branching:

1. `/admin/*` → existing admin-cookie logic, unchanged.
2. Pass through untouched (own auth or token-gated):
   `/preview` (exact match only — `/preview/*` sub-paths stay gated so the
   branded 404 with nav/footer never serves unauthenticated),
   `/portal(/*)`, `/sales(/*)`, `/set-password`, `/api/auth/*`,
   `/api/admin/*` (admin-cookie-authed itself; must stay reachable for admin
   users, who don't hold a preview cookie), `/api/products(/*)` and
   `/api/categories` (public rate-limited catalog JSON consumed
   server-to-server — no cookies — by the OneChat AI widget; gating them
   would break the assistant during customer preview. Confirmed with user
   2026-07-28: catalog JSON staying fetchable is an accepted trade-off).
3. Everything else, when `SITE_PASSWORD` is set → require a valid
   `mec_preview` cookie; otherwise redirect to
   `/preview?next=<original path + query string>`.
4. While the gate is active, responses on gated paths get
   `X-Robots-Tag: noindex, nofollow` so the URL can't be indexed.

### Crawler control (`app/robots.ts`)

The proxy header can't reach the exempt pages (`/portal`, `/sales`,
`/set-password`, `/admin/login`, `/preview`), so a conditional metadata
route serves `/robots.txt`: `Disallow: /` for all agents while
`SITE_PASSWORD` is set, `Allow: /` otherwise. The route is
`force-dynamic` — metadata routes are otherwise prerendered at build time,
which would bake the gate state into the build and defeat the runtime kill
switch. Load-bearing coupling: the matcher exempts the anchored literal
`robots\.txt$` specifically so this route (not the branded 404) serves that
path — the literal and the route must ship together.

## Unlock page (`/preview`)

- Client component mirroring `app/admin/login/page.tsx` (`useActionState`,
  same form styling/tokens), with customer-facing copy: the site is in
  private preview; enter the password you were given.
- New server action (`lib/actions/preview.ts`) verifies the submitted
  password against `SITE_PASSWORD`, signs a session token, sets the cookie,
  and redirects to the `next` path.
- `next` validation: shared helper `lib/safe-path.ts` (`safeRelativePath`),
  extracted from the portal sign-in page's existing validator so one security
  invariant lives in one place. Rejects anything that isn't `/` + a
  non-`/`-non-`\` continuation or that contains control characters, falling
  back to `/`. (Browsers treat `\` as `/` and strip control chars in URLs,
  so a plain "starts with `/`, not `//`" check is bypassable via
  `/\evil.com` — prevents open redirect.) The unlock redirect uses
  `RedirectType.replace` so the lock screen doesn't stay in history.
- If `SITE_PASSWORD` is unset, visiting `/preview` redirects to `/`.
- If the visitor already holds a valid preview cookie, `/preview` redirects
  to the sanitized `next` (no dead form on a bookmarked lock screen). The
  page also sanitizes `next` before echoing it into the hidden form field.
- The lock screen carries `robots: noindex, nofollow` metadata — it is
  exempt from the gate (so it never gets the proxy's `X-Robots-Tag` header)
  yet is the one page a crawler that finds the URL can actually reach.

## Cookie

- Name `mec_preview`; httpOnly; `sameSite: lax`; `secure` in production;
  path `/`; **no `maxAge`** (true browser-session cookie).
- Signed token carries a 24-hour expiry as a backstop for browsers that
  restore session cookies.

## Security fix: token audience

`signSession` currently signs only `{exp}`, so an admin token and a preview
token signed with the same `SESSION_SECRET` would be interchangeable — a
customer with the preview password could paste their cookie value into
`mec_admin` and pass the admin gate.

Fix: `signSession`/`verifySession` in `lib/auth/session.ts` gain an audience
field — payload becomes `{exp, aud}` with `aud: "admin" | "preview"` — and
verification requires the expected audience. All five existing call sites
(admin login action, `proxy.ts`, protected admin layout,
`lib/auth/require-admin.ts`, `app/api/admin/upload/route.ts`) pass `"admin"`.

Side effect: existing admin session cookies (8h TTL) are invalidated once;
admins re-login one time.

## Testing / verification

No automated test suite in this repo. Per project convention:

- `npx tsc --noEmit`, `npm run build`, `npm run lint`.
- Manual click-through:
  - Locked browser is redirected from `/` and `/products/...` to `/preview`
    with the original path in `next`.
  - Wrong password shows an inline error; correct password redirects back to
    the originally requested path.
  - Cookie is session-scoped (gone after full browser restart).
  - `/portal`, `/sales`, `/admin/login` reachable without the preview
    password; their own logins still work end-to-end.
  - Preview cookie value pasted as `mec_admin` is rejected (audience check).
  - With `SITE_PASSWORD` unset: no gate anywhere, `/preview` redirects to `/`.

## Out of scope

- Per-customer passwords or accounts for the preview.
- Rate limiting on the preview form.
- Any change to portal/better-auth flows.
