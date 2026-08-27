import { NextResponse, type NextRequest } from "next/server";
import { verifySession, PREVIEW_COOKIE } from "@/lib/auth/session";

// This proxy is preview-gate-only. /admin and /sales are retired: their old
// URLs are handled as config-level redirects (next.config.ts `redirects()`,
// which run before this proxy) rather than logic here.
//
// Paths that keep their own auth (or are token-gated) and stay reachable
// without the preview password. /portal and /api/auth are BetterAuth-gated
// in-layout; /set-password is token-gated. /api/products and /api/categories
// are public rate-limited catalog JSON consumed server-to-server (no cookies)
// by the OneChat AI widget — gating them would break the assistant during
// preview. /preview itself is exempted by exact match below — NOT as a
// prefix, so /preview/anything stays gated (it would otherwise serve the
// branded 404 with full nav/footer to unauthenticated visitors).
const PREVIEW_EXEMPT_PREFIXES = [
  "/portal",
  "/register",
  "/set-password",
  "/api/auth",
  "/api/admin",
  "/api/products",
  "/api/categories",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Site-wide preview gate. Active only while SITE_PASSWORD is set; unset it
  // at launch to make the site public with no code change.
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) {
    return NextResponse.next();
  }

  if (
    pathname === "/preview" ||
    PREVIEW_EXEMPT_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
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
  // Everything except Next internals and the directories that actually hold
  // static files (public/images — including admin uploads — public/brand-logos,
  // public/svg), plus /favicon.ico and the /robots.txt route. Directory-scoped,
  // not extension-scoped: an extension rule cannot tell /images/hero.jpg from
  // a fabricated /about.png, and the latter would escape the gate and serve
  // the branded 404 (nav + footer) ungated. Anything else — dotted or not —
  // goes through the gate.
  matcher: [
    "/((?!_next/|images/|brand-logos/|svg/|favicon\\.ico$|robots\\.txt$).*)",
  ],
};
