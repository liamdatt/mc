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

/** Filtered + sorted product list for the catalog listing page. */
export function getProductsForListing(opts: {
  categorySlug?: string;
  form?: string;
  sort?: ListingSort;
}) {
  const where: Prisma.ProductWhereInput = { active: true };
  if (opts.categorySlug) where.category = { slug: opts.categorySlug };
  if (opts.form) {
    where.specLabel = "Form";
    where.specValue = opts.form;
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
