"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function num(formData: FormData, key: string): number {
  const n = Number(formData.get(key));
  return Number.isFinite(n) ? n : 0;
}

function buildData(formData: FormData) {
  const name = str(formData, "name");
  return {
    name,
    slug: slugify(str(formData, "slug") || name),
    description: str(formData, "description") || null,
    imagePath: str(formData, "imagePath") || null,
    sortOrder: num(formData, "sortOrder"),
  };
}

export async function createCategory(formData: FormData): Promise<void> {
  await db.category.create({ data: buildData(formData) });
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  redirect("/admin/categories");
}

export async function updateCategory(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  await db.category.update({ where: { id }, data: buildData(formData) });
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  redirect("/admin/categories");
}

export async function deleteCategory(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const id = Number(formData.get("id"));
  const count = await db.product.count({ where: { categoryId: id } });
  if (count > 0) {
    return {
      error: `Cannot delete: ${count} product(s) still use this category. Reassign or delete them first.`,
    };
  }
  await db.category.delete({ where: { id } });
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  return {};
}
