"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { requireAdmin } from "@/lib/auth/require-admin";

export type CategoryFormState = { error?: string };

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

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function createCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();
  const data = buildData(formData);
  if (!data.name) return { error: "Name is required." };
  if (!data.slug) return { error: "Could not derive a slug from the name." };
  try {
    await db.category.create({ data });
  } catch (e) {
    if (isUniqueViolation(e))
      return { error: "A category with that name or slug already exists." };
    throw e;
  }
  revalidatePath("/portal/categories");
  revalidatePath("/products");
  redirect("/portal/categories");
}

export async function updateCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { error: "Invalid category id." };
  const data = buildData(formData);
  if (!data.name) return { error: "Name is required." };
  if (!data.slug) return { error: "Could not derive a slug from the name." };
  try {
    await db.category.update({ where: { id }, data });
  } catch (e) {
    if (isUniqueViolation(e))
      return { error: "A category with that name or slug already exists." };
    throw e;
  }
  revalidatePath("/portal/categories");
  revalidatePath("/products");
  redirect("/portal/categories");
}

export async function deleteCategory(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const count = await db.product.count({ where: { categoryId: id } });
  if (count > 0) {
    return {
      error: `Cannot delete: ${count} product(s) still use this category. Reassign or delete them first.`,
    };
  }
  await db.category.delete({ where: { id } });
  revalidatePath("/portal/categories");
  revalidatePath("/products");
  return {};
}
