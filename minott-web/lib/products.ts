import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type ListingSort = "az" | "za";

/** Categories with their active-product counts, for the filter sidebar. */
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

/** Distinct "Form" spec values present on active products (e.g. Liquid). */
export async function getFormOptions(): Promise<string[]> {
  const rows = await db.product.findMany({
    where: { active: true, specLabel: "Form", specValue: { not: null } },
    select: { specValue: true },
    distinct: ["specValue"],
    orderBy: { specValue: "asc" },
  });
  return rows.map((r) => r.specValue as string);
}

/**
 * Distinct non-null values of a scalar product attribute (industry / volume /
 * color), optionally scoped to a category. Returns [] when no data exists so
 * filter UI can hide itself. Empty/whitespace strings are dropped.
 */
async function getDistinctAttr(
  field: "industry" | "volume" | "color",
  categorySlug?: string,
): Promise<string[]> {
  const where: Prisma.ProductWhereInput = {
    active: true,
    [field]: { not: null },
  };
  if (categorySlug) where.category = { slug: categorySlug };
  const rows = await db.product.findMany({
    where,
    select: { [field]: true },
    distinct: [field],
    orderBy: { [field]: "asc" },
  });
  return (rows as unknown as Record<string, string | null>[])
    .map((r) => r[field])
    .filter((v): v is string => !!v && v.trim().length > 0);
}

/** Distinct industries present on active products (optionally per category). */
export function getIndustryOptions(categorySlug?: string): Promise<string[]> {
  return getDistinctAttr("industry", categorySlug);
}

/** Distinct volumes present on active products (optionally per category). */
export function getVolumeOptions(categorySlug?: string): Promise<string[]> {
  return getDistinctAttr("volume", categorySlug);
}

/** Distinct colors present on active products (optionally per category). */
export function getColorOptions(categorySlug?: string): Promise<string[]> {
  return getDistinctAttr("color", categorySlug);
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
  if (opts.form) {
    where.specLabel = "Form";
    where.specValue = opts.form;
  }
  if (opts.industry) where.industry = opts.industry;
  if (opts.volume) where.volume = opts.volume;
  if (opts.color) where.color = opts.color;
  if (opts.q) {
    // SQLite LIKE (Prisma `contains`) is case-insensitive for ASCII, which
    // covers our catalog. Match across name + descriptions + sku.
    const q = opts.q.trim();
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { shortDescription: { contains: q } },
        { description: { contains: q } },
        { sku: { contains: q } },
      ];
    }
  }
  return db.product.findMany({
    where,
    include: { category: true },
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
  if (opts.volume) where.volume = opts.volume;
  if (opts.color) where.color = opts.color;
  if (opts.q) {
    const q = opts.q.trim();
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { shortDescription: { contains: q } },
        { description: { contains: q } },
        { sku: { contains: q } },
      ];
    }
  }
  const products = await db.product.findMany({
    where,
    include: { category: true },
    orderBy: { name: opts.sort === "za" ? "desc" : "asc" },
  });

  return { category, children, products };
}

export function getFeaturedProducts() {
  return db.product.findMany({
    where: { active: true, featured: true },
    orderBy: { sortOrder: "asc" },
    include: { category: true },
    take: 8,
  });
}

export async function getProductBySlugInCategory(
  categorySlug: string,
  productSlug: string,
) {
  const product = await db.product.findUnique({
    where: { slug: productSlug },
    include: { category: true },
  });
  if (!product || !product.active || product.category.slug !== categorySlug) {
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
  if (opts.form) {
    where.specLabel = "Form";
    where.specValue = opts.form;
  }
  if (opts.isChemical !== undefined) where.isChemical = opts.isChemical;
  if (opts.sampleAvailable !== undefined) where.sampleAvailable = opts.sampleAvailable;
  if (opts.featured !== undefined) where.featured = opts.featured;
  if (opts.q) {
    // SQLite LIKE (Prisma `contains`) is case-insensitive for ASCII.
    where.OR = [
      { name: { contains: opts.q } },
      { shortDescription: { contains: opts.q } },
      { sku: { contains: opts.q } },
    ];
  }
  return db.product.findMany({
    where,
    include: { category: true },
    orderBy: { name: "asc" },
    take: opts.limit,
  });
}

/** Single active product by slug (with category), or null if missing/inactive. */
export async function getProductForApi(slug: string) {
  const product = await db.product.findUnique({
    where: { slug },
    include: { category: true },
  });
  if (!product || !product.active) return null;
  return product;
}
