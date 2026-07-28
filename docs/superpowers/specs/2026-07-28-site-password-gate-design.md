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

Matcher broadens from `/admin/:path*` to all routes **except** `_next`
internals and any path containing a file extension (so `/images/*.png`,
`favicon.ico`, `og.jpg` etc. stay unblocked; pages don't).

Runtime branching:

1. `/admin/*` → existing admin-cookie logic, unchanged.
2. Pass through untouched (own auth or token-gated):
   `/preview`, `/portal(/*)`, `/sales(/*)`, `/set-password`, `/api/auth/*`.
3. Everything else, when `SITE_PASSWORD` is set → require a valid
   `mec_preview` cookie; otherwise redirect to
   `/preview?next=<original path + query string>`.
4. While the gate is active, responses on gated paths get
   `X-Robots-Tag: noindex, nofollow` so the URL can't be indexed.

## Unlock page (`/preview`)

- Client component mirroring `app/admin/login/page.tsx` (`useActionState`,
  same form styling/tokens), with customer-facing copy: the site is in
  private preview; enter the password you were given.
- New server action (`lib/actions/preview.ts`) verifies the submitted
  password against `SITE_PASSWORD`, signs a session token, sets the cookie,
  and redirects to the `next` path.
- `next` validation: must start with `/` and not `//`, else fall back to
  `/` (prevents open redirect).
- If `SITE_PASSWORD` is unset, visiting `/preview` redirects to `/`.

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
verification requires the expected audience. All existing call sites
(admin login action, `proxy.ts`, protected admin layout) pass `"admin"`.

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
