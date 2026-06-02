"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

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

export async function createProduct(formData: FormData): Promise<void> {
  await db.product.create({ data: buildData(formData) });
  revalidatePath("/admin/products");
  revalidatePath("/products");
  redirect("/admin/products");
}

export async function updateProduct(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  await db.product.update({ where: { id }, data: buildData(formData) });
  revalidatePath("/admin/products");
  revalidatePath("/products");
  redirect("/admin/products");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  await db.product.delete({ where: { id } });
  revalidatePath("/admin/products");
  revalidatePath("/products");
}
