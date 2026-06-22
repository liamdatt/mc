import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

/** A product joined with its category and variants, as returned by the API read helpers. */
type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: true; variants: true };
}>;

/** The shape returned by `getCategoriesForApi()`. */
type CategoryForApi = {
  slug: string;
  name: string;
  description: string | null;
  productCount: number;
};

/** Resolve the public origin from proxy headers; null if it can't be determined. */
export function getOrigin(req: NextRequest): string | null {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost ?? req.headers.get("host");
  if (!host) return null;
  // Trust an explicit forwarded proto; otherwise assume https behind a proxy
  // (x-forwarded-host present) and http for a direct host header (local/dev).
  const proto =
    req.headers.get("x-forwarded-proto") ?? (forwardedHost ? "https" : "http");
  return `${proto}://${host}`;
}

export function categoryPath(slug: string): string {
  return `/products/${slug}`;
}

export function productPath(categorySlug: string, slug: string): string {
  return `/products/${categorySlug}/${slug}`;
}

/** Absolute URL when origin is known, otherwise the relative path. */
function absoluteUrl(origin: string | null, path: string): string {
  return origin ? `${origin}${path}` : path;
}

export function serializeCategory(c: CategoryForApi, origin: string | null) {
  const path = categoryPath(c.slug);
  return {
    slug: c.slug,
    name: c.name,
    description: c.description,
    productCount: c.productCount,
    path,
    url: absoluteUrl(origin, path),
  };
}

export function serializeProductCard(p: ProductWithCategory, origin: string | null) {
  const path = productPath(p.category.slug, p.slug);
  return {
    slug: p.slug,
    name: p.name,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
    shortDescription: p.shortDescription,
    isChemical: p.isChemical,
    sampleAvailable: p.sampleAvailable,
    variantCount: p.variants.length,
    featured: p.featured,
    imagePath: p.imagePath,
    path,
    url: absoluteUrl(origin, path),
  };
}

export function serializeProductDetail(p: ProductWithCategory, origin: string | null) {
  return {
    ...serializeProductCard(p, origin),
    description: p.description,
    sdsUrl: p.sdsUrl,
    variants: p.variants.map((v) => ({
      sku: v.sku,
      size: v.size,
      packType: v.packType,
      label: v.label,
    })),
  };
}
