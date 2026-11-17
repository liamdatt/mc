"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parsePromotionForm, type PromotionInput } from "@/lib/promotion-rules";

export type PromotionFormState = {
  error?: string;
  /** Submitted values, echoed back on error so React's post-action form reset
   *  doesn't wipe what the admin typed. */
  values?: Record<string, string>;
};

const FORM_KEYS = [
  "categoryId",
  "eyebrow",
  "title",
  "body",
  "badgeText",
  "ctaLabel",
  "startsAt",
  "endsAt",
] as const;

function formError(formData: FormData, error: string): PromotionFormState {
  const values: Record<string, string> = {};
  for (const k of FORM_KEYS) values[k] = String(formData.get(k) ?? "");
  values.active = formData.get("active") ? "on" : "";
  return { error, values };
}

/** Positive 32-bit integer id from the form, or null. */
function parseId(formData: FormData): number | null {
  const raw = String(formData.get("id") ?? "").trim();
  const id = Number(raw);
  return /^\d+$/.test(raw) && Number.isSafeInteger(id) && id > 0 && id <= 2147483647
    ? id
    : null;
}

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
  if ("error" in result) return formError(formData, result.error);
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
  const id = parseId(formData);
  if (id === null) return formError(formData, "Invalid promotion id.");
  const result = await buildData(formData);
  if ("error" in result) return formError(formData, result.error);
  try {
    await db.promotion.update({ where: { id }, data: result.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return formError(formData, "This promotion no longer exists.");
    }
    throw e;
  }
  revalidatePromotionSurfaces();
  redirect("/portal/promotions");
}

export async function deletePromotion(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = parseId(formData);
  if (id === null) return;
  // deleteMany: a stale/double submit is a no-op instead of an error page.
  await db.promotion.deleteMany({ where: { id } });
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
