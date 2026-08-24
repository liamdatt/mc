"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { DEAL_TYPE } from "@/lib/deals";

export type DealFormState = { error?: string };

function num(formData: FormData, key: string, fallback = 0): number {
  const n = Number(formData.get(key));
  return Number.isFinite(n) ? n : fallback;
}
function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

type DealData = {
  type: string;
  percentOff: number | null;
  badgeText: string | null;
  description: string | null;
  productId: number;
  variantId: number | null;
  active: boolean;
  endsAt: Date | null;
  sortOrder: number;
};

/** Parse + validate the deal form. Returns an error string or the data. */
async function buildData(
  formData: FormData,
): Promise<{ error: string } | { data: DealData }> {
  const type =
    str(formData, "type") === DEAL_TYPE.CUSTOM
      ? DEAL_TYPE.CUSTOM
      : DEAL_TYPE.PERCENT;
  const percentOff = num(formData, "percentOff", NaN);
  const badgeText = str(formData, "badgeText");
  if (type === DEAL_TYPE.PERCENT) {
    if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 99)
      return { error: "Percent off must be a whole number from 1 to 99." };
  } else if (!badgeText) {
    return { error: "Badge text is required for a custom deal." };
  }

  const productId = num(formData, "productId", NaN);
  const product = Number.isFinite(productId)
    ? await db.product.findUnique({ where: { id: productId } })
    : null;
  if (!product) return { error: "Please choose a valid product." };

  const variantRaw = str(formData, "variantId"); // "" = whole product
  let variantId: number | null = null;
  if (variantRaw) {
    const v = await db.productVariant.findUnique({
      where: { id: Number(variantRaw) },
    });
    if (!v || v.productId !== product.id)
      return { error: "That SKU does not belong to the chosen product." };
    variantId = v.id;
  }

  const endsAtRaw = str(formData, "endsAt"); // <input type="date"> — "" = none
  let endsAt: Date | null = null;
  if (endsAtRaw) {
    // End of the given day in Jamaica time (fixed UTC-05:00, no DST), so
    // "ends Aug 30" includes all of Aug 30 in America/Jamaica.
    const d = new Date(`${endsAtRaw}T23:59:59-05:00`);
    if (Number.isNaN(d.getTime())) return { error: "Invalid end date." };
    endsAt = d;
  }

  return {
    data: {
      type,
      percentOff: type === DEAL_TYPE.PERCENT ? percentOff : null,
      badgeText: type === DEAL_TYPE.CUSTOM ? badgeText : null,
      description: str(formData, "description") || null,
      productId: product.id,
      variantId,
      active: formData.get("active") === "on" || formData.get("active") === "true",
      endsAt,
      sortOrder: num(formData, "sortOrder"),
    },
  };
}

function revalidateDealSurfaces() {
  revalidatePath("/");
  revalidatePath("/deals");
  revalidatePath("/products");
  revalidatePath("/portal/deals");
}

export async function createDeal(
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  await requireAdmin();
  const result = await buildData(formData);
  if ("error" in result) return { error: result.error };
  await db.deal.create({ data: result.data });
  revalidateDealSurfaces();
  redirect("/portal/deals");
}

export async function updateDeal(
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { error: "Invalid deal id." };
  const result = await buildData(formData);
  if ("error" in result) return { error: result.error };
  await db.deal.update({ where: { id }, data: result.data });
  revalidateDealSurfaces();
  redirect("/portal/deals");
}

export async function deleteDeal(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  await db.deal.delete({ where: { id } });
  revalidateDealSurfaces();
}

/** Swap sortOrder with the neighbor in the given direction. */
export async function moveDeal(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = num(formData, "id", NaN);
  const dir = str(formData, "direction") === "up" ? "up" : "down";
  const all = await db.deal.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  const idx = all.findIndex((d) => d.id === id);
  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapWith < 0 || swapWith >= all.length) return;
  // Rewrite sortOrder as the array index so duplicate values self-heal.
  const reordered = [...all];
  [reordered[idx], reordered[swapWith]] = [reordered[swapWith], reordered[idx]];
  await db.$transaction(
    reordered.map((d, i) =>
      db.deal.update({ where: { id: d.id }, data: { sortOrder: i } }),
    ),
  );
  revalidateDealSurfaces();
}
