"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";

export type SalesRepFormState = { error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function buildData(formData: FormData) {
  return {
    name: str(formData, "name"),
    email: str(formData, "email") || null,
    phone: str(formData, "phone") || null,
    // Checkbox: present in the form data only when checked.
    active: formData.get("active") !== null,
  };
}

export async function createSalesRep(
  _prev: SalesRepFormState,
  formData: FormData,
): Promise<SalesRepFormState> {
  await requireAdmin();
  const data = buildData(formData);
  if (!data.name) return { error: "Name is required." };
  await db.salesRep.create({ data });
  revalidatePath("/admin/sales-reps");
  redirect("/admin/sales-reps");
}

export async function updateSalesRep(
  _prev: SalesRepFormState,
  formData: FormData,
): Promise<SalesRepFormState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { error: "Invalid sales rep id." };
  const data = buildData(formData);
  if (!data.name) return { error: "Name is required." };
  try {
    await db.salesRep.update({ where: { id }, data });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    )
      return { error: "Sales rep not found." };
    throw e;
  }
  revalidatePath("/admin/sales-reps");
  revalidatePath("/admin/customers");
  redirect("/admin/sales-reps");
}

/**
 * Deleting a rep un-assigns their clients (User.salesRepId is SetNull);
 * the list page's delete button asks for confirmation before posting here.
 */
export async function deleteSalesRep(
  _prev: SalesRepFormState,
  formData: FormData,
): Promise<SalesRepFormState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { error: "Invalid sales rep id." };
  await db.salesRep.delete({ where: { id } });
  revalidatePath("/admin/sales-reps");
  revalidatePath("/admin/customers");
  return {};
}
