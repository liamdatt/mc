import { db } from "@/lib/db";

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
