"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { requireAdmin } from "@/lib/auth/require-admin";

export type VariantFormState = { error?: string };

const PACK_TYPES = ["Each", "Case"] as const;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function num(formData: FormData, key: string, fallback = 0): number {
  const n = Number(formData.get(key));
  return Number.isFinite(n) ? n : fallback;
}
function bool(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}
function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

function revalidate() {
  revalidatePath("/portal/products");
  revalidatePath("/products");
}

/** Build a slug not already used by another listing, appending -2, -3, ... */
async function uniqueListingSlug(base: string): Promise<string> {
  const root = base || "listing";
  let candidate = root;
  let n = 2;
  while (await db.product.findUnique({ where: { slug: candidate } })) {
    candidate = `${root}-${n}`;
    n += 1;
  }
  return candidate;
}

export async function updateVariant(
  _prev: VariantFormState,
  formData: FormData,
): Promise<VariantFormState> {
  await requireAdmin();
  const id = num(formData, "id", NaN);
  if (!Number.isFinite(id)) return { error: "Invalid variant id." };

  const sku = str(formData, "sku");
  if (!sku) return { error: "SKU is required." };

  const packType = str(formData, "packType") || "Each";
  if (!PACK_TYPES.includes(packType as (typeof PACK_TYPES)[number]))
    return { error: 'Pack type must be "Each" or "Case".' };

  try {
    await db.productVariant.update({
      where: { id },
      data: {
        sku,
        size: str(formData, "size") || null,
        label: str(formData, "label") || null,
        packType,
        active: bool(formData, "active"),
        sortOrder: num(formData, "sortOrder"),
      },
    });
  } catch (e) {
    if (isUniqueViolation(e))
      return { error: `Another variant already uses SKU "${sku}".` };
    throw e;
  }
  revalidate();
  return {};
}

export async function createVariant(
  _prev: VariantFormState,
  formData: FormData,
): Promise<VariantFormState> {
  await requireAdmin();
  const productId = num(formData, "productId", NaN);
  if (!Number.isFinite(productId)) return { error: "Invalid listing id." };

  const sku = str(formData, "sku");
  if (!sku) return { error: "SKU is required." };

  const packType = str(formData, "packType") || "Each";
  if (!PACK_TYPES.includes(packType as (typeof PACK_TYPES)[number]))
    return { error: 'Pack type must be "Each" or "Case".' };

  const listing = await db.product.findUnique({ where: { id: productId } });
  if (!listing) return { error: "Listing not found." };

  const max = await db.productVariant.aggregate({
    where: { productId },
    _max: { sortOrder: true },
  });
  const sortOrder = (max._max.sortOrder ?? -1) + 1;

  try {
    await db.productVariant.create({
      data: {
        productId,
        sku,
        size: str(formData, "size") || null,
        label: str(formData, "label") || null,
        packType,
        active: true,
        sortOrder,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e))
      return { error: `A variant with SKU "${sku}" already exists.` };
    throw e;
  }
  revalidate();
  return {};
}

export async function deleteVariant(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;
  await db.productVariant.delete({ where: { id } });
  revalidate();
}

/** MERGE: move a variant onto another existing listing. */
export async function reassignVariant(formData: FormData): Promise<void> {
  await requireAdmin();
  const variantId = Number(formData.get("variantId"));
  const targetProductId = Number(formData.get("targetProductId"));
  if (!Number.isFinite(variantId) || !Number.isFinite(targetProductId)) return;
  const target = await db.product.findUnique({
    where: { id: targetProductId },
  });
  if (!target) return;
  await db.productVariant.update({
    where: { id: variantId },
    data: { productId: targetProductId },
  });
  revalidate();
}

/** SPLIT: clone the variant's listing into a new listing and move it there. */
export async function splitVariantToNewListing(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const variantId = Number(formData.get("variantId"));
  if (!Number.isFinite(variantId)) return;

  const v = await db.productVariant.findUniqueOrThrow({
    where: { id: variantId },
    include: { product: true },
  });
  const base = v.product;

  const suffix = v.size ?? v.sku;
  const slug = await uniqueListingSlug(slugify(`${base.slug}-${v.sku}`));

  const listing = await db.product.create({
    data: {
      slug,
      name: `${base.name} (${suffix})`,
      categoryId: base.categoryId,
      shortDescription: base.shortDescription,
      description: base.description,
      imagePath: v.imagePath ?? base.imagePath,
      isChemical: base.isChemical,
      sampleAvailable: base.sampleAvailable,
      color: base.color,
      industry: base.industry,
      sdsUrl: base.sdsUrl,
      active: base.active,
    },
  });

  await db.productVariant.update({
    where: { id: variantId },
    data: { productId: listing.id, sortOrder: 0 },
  });
  revalidate();
}
