import type { MetadataRoute } from "next";

// While the preview gate is up, ask crawlers to stay away from everything —
// the proxy's X-Robots-Tag only covers gated paths, not the exempt sign-in
// pages. Unsetting SITE_PASSWORD at launch flips this back automatically.
export default function robots(): MetadataRoute.Robots {
  if (process.env.SITE_PASSWORD) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return { rules: { userAgent: "*", allow: "/" } };
}
