import type { MetadataRoute } from "next";

// Metadata routes are prerendered at build time by default; without this the
// SITE_PASSWORD branch below would be baked into the build output and could
// not flip at runtime.
export const dynamic = "force-dynamic";

// While the preview gate is up, ask crawlers to stay away from everything —
// the proxy's X-Robots-Tag only covers gated paths, not the exempt sign-in
// pages. Unsetting SITE_PASSWORD at launch flips this back automatically.
export default function robots(): MetadataRoute.Robots {
  if (process.env.SITE_PASSWORD) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return { rules: { userAgent: "*", allow: "/" } };
}
