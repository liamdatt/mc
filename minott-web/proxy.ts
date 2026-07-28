import { NextResponse, type NextRequest } from "next/server";
import {
  verifySession,
  SESSION_COOKIE,
  PREVIEW_COOKIE,
} from "@/lib/auth/session";

// Paths that keep their own auth (or are token-gated) and stay reachable
// without the preview password. /api/admin and /admin check the admin cookie
// themselves; /portal, /sales and /api/auth are BetterAuth-gated in-layout;
// /set-password is token-gated. /api/products and /api/categories are public
// rate-limited catalog JSON consumed server-to-server (no cookies) by the
// OneChat AI widget — gating them would break the assistant during preview.
// /preview itself is exempted by exact match below — NOT as a prefix, so
// /preview/anything stays gated (it would otherwise serve the branded 404
// with full nav/footer to unauthenticated visitors).
const PREVIEW_EXEMPT_PREFIXES = [
  "/portal",
  "/sales",
  "/set-password",
  "/api/auth",
  "/api/admin",
  "/api/products",
  "/api/categories",
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
  // Everything except Next internals (/_next/*) and known static-asset
  // extensions (public/ images, favicon, robots/sitemap, fonts, upload
  // formats). An explicit allowlist rather than "any dot": a blanket dot
  // rule would let fabricated paths like /about. escape the matcher and
  // serve the branded 404 (full nav + footer) without the gate.
  matcher: [
    "/((?!_next|.*\\.(?:png|jpe?g|svg|webp|gif|ico|css|js|mjs|txt|xml|json|map|woff2?)$).*)",
  ],
};
