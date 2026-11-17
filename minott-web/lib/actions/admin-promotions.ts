"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parsePromotionForm, type PromotionInput } from "@/lib/promotion-rules";

export type PromotionFormState = { error?: string };

function num(formData: FormData, key: string, fallback = 0): number {
  const n = Number(formData.get(key));
  return Number.isFinite(n) ? n : fallback;
}
function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Parse + validate the form, and confirm the category exists. */
async function buildData(
  formData: FormData,
): Promise<{ error: string } | { data: PromotionInput }> {
  const parsed = parsePromotionForm((k) => formData.get(k) as string | null);
  if ("error" in parsed) return parsed;
  const category = await db.category.findUnique({
    where: { id: parsed.data.categoryId },
    select: { id: true },
  });
  if (!category) return { error: "Please choose a valid category." };
  return parsed;
}

function revalidatePromotionSurfaces() {
  revalidatePath("/");
  revalidatePath("/portal/promotions");
}

export async function createPromotion(
  _prev: PromotionFormState,
  formData: FormData,
): Promise<PromotionFormState> {
  await requireAdmin();
  const result = await buildData(formData);
  if ("error" in result) return { error: result.error };
  const last = await db.promotion.aggregate({ _max: { sortOrder: true } });
  await db.promotion.create({
    data: { ...result.data, sortOrder: (last._max.sortOrder ?? -1) + 1 },
  });
  revalidatePromotionSurfaces();
  redirect("/portal/promotions");
}

export async function updatePromotion(
  _prev: PromotionFormState,
  formData: FormData,
): Promise<PromotionFormState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { error: "Invalid promotion id." };
  const result = await buildData(formData);
  if ("error" in result) return { error: result.error };
  await db.promotion.update({ where: { id }, data: result.data });
  revalidatePromotionSurfaces();
  redirect("/portal/promotions");
}

export async function deletePromotion(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  await db.promotion.delete({ where: { id } });
  revalidatePromotionSurfaces();
}

/** Swap sortOrder with the neighbor in the given direction. */
export async function movePromotion(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = num(formData, "id", NaN);
  const dir = str(formData, "direction") === "up" ? "up" : "down";
  const all = await db.promotion.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const idx = all.findIndex((p) => p.id === id);
  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapWith < 0 || swapWith >= all.length) return;
  // Rewrite sortOrder as the array index so duplicate values self-heal.
  const reordered = [...all];
  [reordered[idx], reordered[swapWith]] = [reordered[swapWith], reordered[idx]];
  await db.$transaction(
    reordered.map((p, i) =>
      db.promotion.update({ where: { id: p.id }, data: { sortOrder: i } }),
    ),
  );
  revalidatePromotionSurfaces();
}
