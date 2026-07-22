"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSalesSession } from "@/lib/sales";

export type RepCustomerState = { error?: string; success?: boolean };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Update one of the signed-in rep's customers' profile fields. The rep is
 * re-derived from the session and the target customer's salesRepId is verified
 * against it — an id from the form is never trusted. Email and rep-assignment
 * stay admin-only.
 */
export async function updateRepCustomer(
  _prev: RepCustomerState,
  formData: FormData,
): Promise<RepCustomerState> {
  const sales = await getSalesSession();
  if (!sales) redirect("/sales/sign-in");

  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!id) return { error: "Missing customer id." };
  if (!name) return { error: "Contact name is required." };

  const customer = await db.user.findUnique({
    where: { id },
    select: { salesRepId: true },
  });
  if (!customer || customer.salesRepId !== sales.rep.id)
    return { error: "That customer is not assigned to you." };

  await db.user.update({
    where: { id },
    data: {
      name,
      companyName: str(formData, "companyName") || null,
      phone: str(formData, "phone") || null,
      whatsapp: str(formData, "whatsapp") || null,
    },
  });

  revalidatePath("/sales/customers");
  revalidatePath(`/sales/customers/${id}`);
  return { success: true };
}
