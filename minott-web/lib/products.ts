import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type ListingSort = "az" | "za";

/** Categories with their active-product counts, for the category chips. */
export async function getCategoriesWithCounts() {
  const cats = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { products: { where: { active: true }, select: { id: true } } },
  });
  return cats.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    count: c.products.length,
  }));
}

/** Filtered + sorted product list for the catalog listing page. */
export function getProductsForListing(opts: {
  categorySlug?: string;
  form?: string;
  q?: string;
  industry?: string;
  volume?: string;
  color?: string;
  sort?: ListingSort;
}) {
  const where: Prisma.ProductWhereInput = { active: true };
  if (opts.categorySlug) where.category = { slug: opts.categorySlug };
  // Accumulate variant-level filters into a single `some` so form + volume AND
  // together on one matching variant (separate assignments would clobber). The
  // `active: true` floor also excludes listings with zero active variants.
  const variantWhere: Prisma.ProductVariantWhereInput = { active: true };
  if (opts.form) {
    variantWhere.specLabel = "Form";
    variantWhere.specValue = opts.form;
  }
  if (opts.volume) variantWhere.volume = opts.volume;
  where.variants = { some: variantWhere };
  if (opts.industry) where.industry = opts.industry;
  if (opts.color) where.color = opts.color;
  if (opts.q) {
    // SQLite LIKE (Prisma `contains`) is case-insensitive for ASCII, which
    // covers our catalog. Match across name + descriptions + variant skus.
    const q = opts.q.trim();
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { shortDescription: { contains: q } },
        { description: { contains: q } },
        { variants: { some: { sku: { contains: q } } } },
      ];
    }
  }
  return db.product.findMany({
    where,
    include: {
      category: true,
      variants: { where: { active: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { name: opts.sort === "za" ? "desc" : "asc" },
  });
}

export function getCategories() {
  return db.category.findMany({ orderBy: { sortOrder: "asc" } });
}

export function getCatalog() {
  return db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export function getCategoryBySlug(slug: string) {
  return db.category.findUnique({
    where: { slug },
    include: {
      products: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

/**
 * A category plus its child subsections, each with their active products.
 * Used to render grouped subsection headings (e.g. on Chemicals). When a
 * category has no children, `children` is `[]` and callers fall back to a flat
 * listing. Honors the same search/filter opts as {@link getProductsForListing}.
 */
export async function getCategoryWithChildren(
  slug: string,
  opts: {
    q?: string;
    industry?: string;
    volume?: string;
    color?: string;
    sort?: ListingSort;
  } = {},
) {
  const category = await db.category.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, description: true },
  });
  if (!category) return null;

  const children = await db.category.findMany({
    where: { parentId: category.id },
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true, description: true },
  });

  // Reuse the listing filters; scope to this category's id (and its children's
  // ids) so a search on the parent surfaces products filed under subsections.
  const categoryIds = [category.id, ...children.map((c) => c.id)];
  const where: Prisma.ProductWhereInput = {
    active: true,
    categoryId: { in: categoryIds },
  };
  if (opts.industry) where.industry = opts.industry;
  // Require ≥1 active variant (excludes emptied listings); fold the volume
  // filter into the same `some` so we never clobber the active floor.
  const variantWhere: Prisma.ProductVariantWhereInput = { active: true };
  if (opts.volume) variantWhere.volume = opts.volume;
  where.variants = { some: variantWhere };
  if (opts.color) where.color = opts.color;
  if (opts.q) {
    const q = opts.q.trim();
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { shortDescription: { contains: q } },
        { description: { contains: q } },
        { variants: { some: { sku: { contains: q } } } },
      ];
    }
  }
  const products = await db.product.findMany({
    where,
    include: {
      category: true,
      variants: { where: { active: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { name: opts.sort === "za" ? "desc" : "asc" },
  });

  return { category, children, products };
}

export function getFeaturedProducts() {
  return db.product.findMany({
    where: { active: true, featured: true, variants: { some: { active: true } } },
    orderBy: { sortOrder: "asc" },
    include: {
      category: true,
      variants: { where: { active: true }, orderBy: { sortOrder: "asc" } },
    },
    take: 8,
  });
}

export async function getProductBySlugInCategory(
  categorySlug: string,
  productSlug: string,
) {
  const product = await db.product.findUnique({
    where: { slug: productSlug },
    include: {
      category: true,
      variants: { where: { active: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (
    !product ||
    !product.active ||
    product.category.slug !== categorySlug ||
    // A listing whose variants were all deleted/deactivated is an un-quotable
    // dead-end; treat it as not found so a direct URL 404s. The include above
    // already filters `variants` to active, so an empty array means none.
    product.variants.length === 0
  ) {
    return null;
  }
  return product;
}

/** All categories with active-product counts, for the public API. */
export async function getCategoriesForApi() {
  const cats = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { products: { where: { active: true }, select: { id: true } } },
  });
  return cats.map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    productCount: c.products.length,
  }));
}

/** Filtered active-product list for the public API. */
export function getProductsForApi(opts: {
  q?: string;
  categorySlug?: string;
  form?: string;
  isChemical?: boolean;
  sampleAvailable?: boolean;
  featured?: boolean;
  limit: number;
}) {
  const where: Prisma.ProductWhereInput = { active: true };
  if (opts.categorySlug) where.category = { slug: opts.categorySlug };
  // Require ≥1 active variant (excludes emptied listings); fold the form filter
  // into the same `some` so we never clobber the active floor.
  const variantWhere: Prisma.ProductVariantWhereInput = { active: true };
  if (opts.form) {
    variantWhere.specLabel = "Form";
    variantWhere.specValue = opts.form;
  }
  where.variants = { some: variantWhere };
  if (opts.isChemical !== undefined) where.isChemical = opts.isChemical;
  if (opts.sampleAvailable !== undefined) where.sampleAvailable = opts.sampleAvailable;
  if (opts.featured !== undefined) where.featured = opts.featured;
  if (opts.q) {
    // SQLite LIKE (Prisma `contains`) is case-insensitive for ASCII.
    where.OR = [
      { name: { contains: opts.q } },
      { shortDescription: { contains: opts.q } },
      { variants: { some: { sku: { contains: opts.q } } } },
    ];
  }
  return db.product.findMany({
    where,
    include: {
      category: true,
      variants: { where: { active: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { name: "asc" },
    take: opts.limit,
  });
}

/**
 * Single active product by slug (with category + variants), or null if
 * missing/inactive or if it has no active variant (an un-quotable dead-end —
 * matches {@link getProductBySlugInCategory}).
 */
export async function getProductForApi(slug: string) {
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: true,
      variants: { where: { active: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  // The include filters `variants` to active-only, so an empty array means none.
  if (!product || !product.active || product.variants.length === 0) return null;
  return product;
}
