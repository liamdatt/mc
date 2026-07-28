# Site-wide Preview Password Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put every public page of the Minott site behind a single shared preview password (browser-session cookie) so the unlaunched URL can be shared with select customers without being publicly viewable.

**Architecture:** Extend `proxy.ts` (which already gates `/admin`) to require a signed `mec_preview` cookie on all public routes when a `SITE_PASSWORD` env var is set, redirecting locked visitors to a branded `/preview` unlock page. Reuses the existing Web-Crypto HMAC session helper, adding an audience field so admin and preview tokens are not interchangeable. Unsetting `SITE_PASSWORD` disables the gate entirely (launch = remove env var).

**Tech Stack:** Next.js 16 App Router (proxy convention, async searchParams, Server Actions with `useActionState`), Web Crypto HMAC (existing `lib/auth/session.ts`), Tailwind v4 classes matching the admin login page.

**Spec:** `docs/superpowers/specs/2026-07-28-site-password-gate-design.md`

**Branch:** `feat/site-preview-gate` (from `main`)

**Verification convention:** This repo has no automated test suite (see root `CLAUDE.md`). Per-task verification is `npx tsc --noEmit`; final verification is `npm run lint`, `npm run build`, and an HTTP check matrix against a running server. All commands run from `minott-web/`.

**Important repo rule:** This is Next.js 16 — middleware is `proxy.ts` (`export function proxy`), NOT `middleware.ts`. `cookies()` and `searchParams` are async. Read `node_modules/next/dist/docs/` if unsure. All components use named exports except Next.js `page`/`layout`/`proxy` files.

---

### Task 1: Add token audience to the session helper and update all admin call sites

The current token payload is `{exp}` only — an admin token and a preview token signed with the same secret would be interchangeable. Add a required `aud` field to sign/verify. All five existing call sites pass `"admin"`. Also add the preview cookie constants used by later tasks.

**Suggested subagent model:** sonnet (mechanical signature change, complete code below)

**Files:**
- Modify: `minott-web/lib/auth/session.ts`
- Modify: `minott-web/lib/actions/auth.ts:21-24`
- Modify: `minott-web/proxy.ts:13`
- Modify: `minott-web/app/admin/(protected)/layout.tsx:23`
- Modify: `minott-web/lib/auth/require-admin.ts:13`
- Modify: `minott-web/app/api/admin/upload/route.ts:26`

- [ ] **Step 1: Rewrite the sign/verify section of `lib/auth/session.ts`**

Replace everything from `export async function signSession` to the end of the file with:

```ts
export type SessionAudience = "admin" | "preview";

export async function signSession(
  secret: string,
  ttlMs: number,
  aud: SessionAudience,
): Promise<string> {
  const payload = bytesToB64url(
    encoder.encode(JSON.stringify({ exp: Date.now() + ttlMs, aud })),
  );
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${bytesToB64url(new Uint8Array(sig))}`;
}

export async function verifySession(
  secret: string,
  token: string | undefined,
  aud: SessionAudience,
): Promise<boolean> {
  if (!secret || !token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  try {
    const key = await getKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlToBytes(sig).buffer as ArrayBuffer,
      encoder.encode(payload),
    );
    if (!valid) return false;
    const parsed = JSON.parse(decoder.decode(b64urlToBytes(payload)));
    return (
      parsed.aud === aud &&
      typeof parsed.exp === "number" &&
      parsed.exp > Date.now()
    );
  } catch {
    return false;
  }
}

export const SESSION_COOKIE = "mec_admin";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours
export const PREVIEW_COOKIE = "mec_preview";
// Backstop expiry inside the preview token. The cookie itself is session-scoped
// (no maxAge); this bounds browsers that restore session cookies on relaunch.
export const PREVIEW_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
```

Everything above `signSession` (the b64url helpers and `getKey`) stays unchanged.

- [ ] **Step 2: Pass `"admin"` at the four admin call sites**

In `lib/actions/auth.ts`, the `signSession` call becomes:

```ts
  const token = await signSession(
    process.env.SESSION_SECRET ?? "",
    SESSION_TTL_MS,
    "admin",
  );
```

In `proxy.ts` line 13 (this file is fully rewritten in Task 4; this minimal edit keeps it compiling until then):

```ts
  const ok = await verifySession(process.env.SESSION_SECRET ?? "", token, "admin");
```

In `app/admin/(protected)/layout.tsx` line 23:

```ts
  const authed = await verifySession(
    process.env.SESSION_SECRET ?? "",
    token,
    "admin",
  );
```

In `lib/auth/require-admin.ts` line 13:

```ts
  const ok = await verifySession(process.env.SESSION_SECRET ?? "", token, "admin");
```

In `app/api/admin/upload/route.ts` line 26:

```ts
  if (!(await verifySession(process.env.SESSION_SECRET ?? "", token, "admin"))) {
```

- [ ] **Step 3: Type-check**

Run: `cd minott-web && npx tsc --noEmit`
Expected: no output (clean). If `aud`-related errors appear, a call site was missed — grep `verifySession\|signSession` and fix.

- [ ] **Step 4: Commit**

```bash
git add minott-web/lib/auth/session.ts minott-web/lib/actions/auth.ts minott-web/proxy.ts "minott-web/app/admin/(protected)/layout.tsx" minott-web/lib/auth/require-admin.ts minott-web/app/api/admin/upload/route.ts
git commit -m "feat(auth): add audience field to session tokens"
```

Note: existing admin sessions are invalidated by this change (payload shape changed); admins re-login once. This is expected per the spec.

---

### Task 2: Preview unlock Server Action

**Suggested subagent model:** sonnet

**Files:**
- Create: `minott-web/lib/actions/preview.ts`

- [ ] **Step 1: Create the action**

```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  signSession,
  PREVIEW_COOKIE,
  PREVIEW_TTL_MS,
} from "@/lib/auth/session";

export type UnlockState = { error?: string };

// Only allow same-origin path redirects ("/" but not "//host") — prevents
// open-redirect abuse via the ?next= param.
function safeNext(raw: FormDataEntryValue | null): string {
  const next = String(raw ?? "");
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

export async function unlock(
  _prev: UnlockState,
  formData: FormData,
): Promise<UnlockState> {
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) redirect("/");
  const password = String(formData.get("password") ?? "");
  if (password !== sitePassword) {
    return { error: "Incorrect password." };
  }
  const token = await signSession(
    process.env.SESSION_SECRET ?? "",
    PREVIEW_TTL_MS,
    "preview",
  );
  const store = await cookies();
  store.set(PREVIEW_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // No maxAge: session cookie by design — cleared when the browser closes.
  });
  redirect(safeNext(formData.get("next")));
}
```

- [ ] **Step 2: Type-check**

Run: `cd minott-web && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add minott-web/lib/actions/preview.ts
git commit -m "feat(preview): unlock server action for site-wide preview gate"
```

---

### Task 3: `/preview` unlock page

Server page reads async `searchParams` and bails to `/` when the gate is off; a client form component mirrors the admin login styling. `PublicChrome` must also skip Nav/Footer on `/preview` (a lock screen must not render the category nav).

**Suggested subagent model:** sonnet

**Files:**
- Create: `minott-web/app/preview/page.tsx`
- Create: `minott-web/components/preview/PreviewUnlockForm.tsx`
- Modify: `minott-web/components/layout/PublicChrome.tsx:16-19`

- [ ] **Step 1: Create `app/preview/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { PreviewUnlockForm } from "@/components/preview/PreviewUnlockForm";

export const metadata = { title: "Private preview" };

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!process.env.SITE_PASSWORD) redirect("/");
  const { next } = await searchParams;
  return <PreviewUnlockForm next={next ?? "/"} />;
}
```

- [ ] **Step 2: Create `components/preview/PreviewUnlockForm.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import { unlock, type UnlockState } from "@/lib/actions/preview";

const initial: UnlockState = {};

export function PreviewUnlockForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(unlock, initial);

  return (
    <main className="grid min-h-screen place-items-center bg-mec-ink px-6 text-mec-pure">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-md border border-white/10 bg-white/5 p-8"
      >
        <p className="font-display text-3xl tracking-wider">
          <span className="text-mec-red">Minott</span> Equipment &amp;
          Chemicals
        </p>
        <p className="mt-2 text-sm text-mec-pure/60">
          This site is in private preview. Enter the password you were given to
          continue.
        </p>

        <input type="hidden" name="next" value={next} />

        <label
          htmlFor="password"
          className="mt-8 block text-xs font-semibold uppercase tracking-[0.16em] text-mec-pure/70"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          required
          className="mt-2 w-full rounded-sm border border-white/20 bg-mec-ink px-4 py-3 text-mec-pure outline-none focus:border-mec-red"
        />

        {state.error && (
          <p className="mt-3 text-sm text-mec-red">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full bg-mec-red px-6 py-3 font-semibold uppercase tracking-[0.14em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50"
        >
          {pending ? "Unlocking…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Hide the public chrome on `/preview`**

In `components/layout/PublicChrome.tsx`, replace lines 16–19:

```tsx
  // The admin and sales portals render their own chrome; the preview lock
  // screen renders bare.
  const isBareChrome =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/sales") ||
    pathname === "/preview";
  if (isBareChrome) return <>{children}</>;
```

- [ ] **Step 4: Type-check**

Run: `cd minott-web && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add minott-web/app/preview/page.tsx minott-web/components/preview/PreviewUnlockForm.tsx minott-web/components/layout/PublicChrome.tsx
git commit -m "feat(preview): branded /preview unlock page"
```

---

### Task 4: Gate logic in `proxy.ts`

Full rewrite. Branch order matters: `/admin` keeps its existing behavior (unchanged semantics, now with `"admin"` audience); the preview gate only engages when `SITE_PASSWORD` is set; exempt paths keep their own auth. Gated responses carry `X-Robots-Tag: noindex, nofollow`.

**Suggested subagent model:** opus (core gate logic; matcher and branch order are easy to get subtly wrong)

**Files:**
- Modify: `minott-web/proxy.ts` (replace entire file)

- [ ] **Step 1: Replace `proxy.ts` with:**

```ts
import { NextResponse, type NextRequest } from "next/server";
import {
  verifySession,
  SESSION_COOKIE,
  PREVIEW_COOKIE,
} from "@/lib/auth/session";

// Paths that keep their own auth (or are token-gated) and stay reachable
// without the preview password. /api/admin and /admin check the admin cookie
// themselves; /portal, /sales and /api/auth are BetterAuth-gated in-layout;
// /set-password is token-gated.
const PREVIEW_EXEMPT = [
  "/preview",
  "/portal",
  "/sales",
  "/set-password",
  "/api/auth",
  "/api/admin",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    // Allow the login page itself through.
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const ok = await verifySession(
      process.env.SESSION_SECRET ?? "",
      token,
      "admin",
    );
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Site-wide preview gate. Active only while SITE_PASSWORD is set; unset it
  // at launch to make the site public with no code change.
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) {
    return NextResponse.next();
  }

  if (
    PREVIEW_EXEMPT.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(PREVIEW_COOKIE)?.value;
  const ok = await verifySession(
    process.env.SESSION_SECRET ?? "",
    token,
    "preview",
  );
  if (!ok) {
    const url = req.nextUrl.clone();
    const dest = pathname + url.search;
    url.pathname = "/preview";
    url.search = "";
    url.searchParams.set("next", dest);
    const res = NextResponse.redirect(url);
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  // Everything except Next internals (/_next/*) and any path containing a
  // file extension (static assets: images, favicon, og.jpg, …). Product slugs
  // never contain dots (lib/slug.ts strips non-alphanumerics), so no page
  // route is excluded by the dot rule.
  matcher: ["/((?!_next|.*\\..*).*)"],
};
```

- [ ] **Step 2: Type-check**

Run: `cd minott-web && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add minott-web/proxy.ts
git commit -m "feat(preview): site-wide password gate in proxy"
```

---

### Task 5: Environment and docs

**Suggested subagent model:** sonnet

**Files:**
- Modify: `minott-web/.env.example` (append)
- Modify: `CLAUDE.md` (root — the Env line under "Data & admin")

- [ ] **Step 1: Append to `minott-web/.env.example`**

```bash
# Optional site-wide preview password. When set, every public page requires
# this password once per browser session (visitors unlock at /preview).
# Admin/portal/sales keep their own logins and are NOT behind this gate.
# Unset (or leave empty) to make the site public — no code change needed.
SITE_PASSWORD=""
```

- [ ] **Step 2: Update root `CLAUDE.md`**

Find the line beginning `- **Env:**` and change the Optional clause from:

```
Optional: `RESEND_API_KEY` (email sending is skipped with a console warning when unset).
```

to:

```
Optional: `RESEND_API_KEY` (email sending is skipped with a console warning when unset), `SITE_PASSWORD` (when set, all public pages require a preview password at `/preview` once per browser session; unset = public site).
```

- [ ] **Step 3: Commit**

```bash
git add minott-web/.env.example CLAUDE.md
git commit -m "docs: document SITE_PASSWORD preview gate env var"
```

---

### Task 6: Automated verification matrix

Run lint + build, then a production server with the gate on, and verify every behavior in the spec via HTTP — including forged-cookie audience checks.

**Suggested subagent model:** opus (interpreting failures and fixing them)

**Files:** none created (fixes only if checks fail)

- [ ] **Step 1: Lint and build**

Run: `cd minott-web && npm run lint && npm run build`
Expected: lint passes; build completes. (Build runs `prisma generate && prisma migrate deploy` first — requires `.env` with `DATABASE_URL`, which exists on this machine.)

- [ ] **Step 2: Start the production server with the gate ON**

```bash
cd minott-web && SITE_PASSWORD=preview-test-123 PORT=3100 npm run start
```

Run in background; wait for "Ready". Port 3100 avoids colliding with any dev server.

- [ ] **Step 3: Locked-visitor redirect matrix**

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3100/
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3100/products
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "http://localhost:3100/products?view=grid"
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3100/preview
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3100/portal
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3100/sales
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3100/admin
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/favicon.ico
```

Expected:
- `/` → `307 http://localhost:3100/preview?next=%2F`
- `/products` → `307 …/preview?next=%2Fproducts`
- `/products?view=grid` → `307 …/preview?next=%2Fproducts%3Fview%3Dgrid`
- `/preview` → `200`
- `/portal` and `/sales` → NOT a redirect to `/preview` (200, or a redirect within their own portal — either is fine)
- `/admin` → `307 …/admin/login` (unchanged admin behavior)
- `/favicon.ico` → `200` (assets exempt via matcher)

Also confirm the gated redirect carries the robots header:

```bash
curl -sI http://localhost:3100/ | grep -i x-robots-tag
```

Expected: `x-robots-tag: noindex, nofollow`

- [ ] **Step 4: Forged-cookie audience matrix**

Sign tokens with the same HMAC scheme using `SESSION_SECRET` from `.env` (independent Node reimplementation of `lib/auth/session.ts`):

```bash
cd minott-web
sign() {
  AUD="$1" node --input-type=module -e '
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
const secret = readFileSync(".env", "utf8").match(/^SESSION_SECRET="?([^"\n]+)"?$/m)[1];
const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 3600000, aud: process.env.AUD })).toString("base64url");
const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
console.log(payload + "." + sig);
'
}
PREVIEW_TOKEN=$(sign preview)
ADMIN_TOKEN=$(sign admin)

# 1. Valid preview cookie unlocks a public page:
curl -s -o /dev/null -w "%{http_code}\n" --cookie "mec_preview=$PREVIEW_TOKEN" http://localhost:3100/
# 2. Admin-audience token is REJECTED as a preview cookie:
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" --cookie "mec_preview=$ADMIN_TOKEN" http://localhost:3100/
# 3. Preview-audience token is REJECTED as an admin cookie (the spec's security fix):
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" --cookie "mec_admin=$PREVIEW_TOKEN" http://localhost:3100/admin
# 4. Admin token still works for /admin:
curl -s -o /dev/null -w "%{http_code}\n" --cookie "mec_admin=$ADMIN_TOKEN" http://localhost:3100/admin
```

Expected, in order:
1. `200`
2. `307 …/preview?next=%2F` (audience mismatch → still locked)
3. `307 …/admin/login` (preview password can NOT open admin)
4. `200`

- [ ] **Step 5: Gate OFF when SITE_PASSWORD is unset**

Stop the server; restart WITHOUT the env var:

```bash
cd minott-web && PORT=3100 npm run start
```

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3100/preview
curl -sI http://localhost:3100/ | grep -ci x-robots-tag || true
```

Expected: `/` → `200`; `/preview` → `307 …/` (redirects home when gate is off); no `x-robots-tag` header (grep count `0`).

Stop the server when done.

- [ ] **Step 6: Fix anything that failed, re-run the failing check, then commit fixes (if any)**

```bash
git add -A && git commit -m "fix(preview): address verification findings"
```

Only commit if fixes were needed.

---

### Task 7: Manual browser click-through (human checklist)

Not subagent work — report this checklist to the user at the end:

- [ ] With `SITE_PASSWORD` set: visiting `/` shows the branded unlock screen (no nav/footer chrome).
- [ ] Wrong password → inline "Incorrect password." error.
- [ ] Correct password on `/preview?next=%2Fproducts` → lands on `/products`.
- [ ] Full browser restart → prompted again (session cookie).
- [ ] Portal and sales logins work end-to-end without ever entering the preview password.
- [ ] Admin re-login works (old admin cookies were invalidated by the audience change — one-time).
