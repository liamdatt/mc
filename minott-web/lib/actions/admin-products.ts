"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { requireAdmin } from "@/lib/auth/require-admin";

export type ProductFormState = { error?: string };

function num(formData: FormData, key: string, fallback = 0): number {
  const n = Number(formData.get(key));
  return Number.isFinite(n) ? n : fallback;
}
function bool(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}
function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function buildData(formData: FormData) {
  const name = str(formData, "name");
  const providedSlug = str(formData, "slug");
  return {
    name,
    slug: slugify(providedSlug || name),
    categoryId: num(formData, "categoryId"),
    shortDescription: str(formData, "shortDescription") || null,
    description: str(formData, "description") || null,
    imagePath: str(formData, "imagePath") || "/images/product-placeholder.png",
    sku: str(formData, "sku") || null,
    sdsUrl: str(formData, "sdsUrl") || null,
    isChemical: bool(formData, "isChemical"),
    sampleAvailable: bool(formData, "sampleAvailable"),
    featured: bool(formData, "featured"),
    active: bool(formData, "active"),
    sortOrder: num(formData, "sortOrder"),
  };
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();
  const data = buildData(formData);
  if (!data.name) return { error: "Name is required." };
  if (!data.slug) return { error: "Could not derive a slug from the name." };
  const category = await db.category.findUnique({
    where: { id: data.categoryId },
  });
  if (!category) return { error: "Please choose a valid category." };
  try {
    await db.product.create({ data });
  } catch (e) {
    if (isUniqueViolation(e))
      return { error: "A product with that name or slug already exists." };
    throw e;
  }
  revalidatePath("/admin/products");
  revalidatePath("/products");
  redirect("/admin/products");
}

export async function updateProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { error: "Invalid product id." };
  const data = buildData(formData);
  if (!data.name) return { error: "Name is required." };
  if (!data.slug) return { error: "Could not derive a slug from the name." };
  const category = await db.category.findUnique({
    where: { id: data.categoryId },
  });
  if (!category) return { error: "Please choose a valid category." };
  try {
    await db.product.update({ where: { id }, data });
  } catch (e) {
    if (isUniqueViolation(e))
      return { error: "A product with that name or slug already exists." };
    throw e;
  }
  revalidatePath("/admin/products");
  revalidatePath("/products");
  redirect("/admin/products");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  await db.product.delete({ where: { id } });
  revalidatePath("/admin/products");
  revalidatePath("/products");
}
