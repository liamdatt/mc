"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSalesSession } from "@/lib/sales";
import { INQUIRY_STATUS } from "@/lib/constants";

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

async function assertRepOwnsQuote(repId: number, inquiryId: number) {
  const quote = await db.inquiry.findUnique({
    where: { id: inquiryId },
    select: { type: true, user: { select: { salesRepId: true } } },
  });
  if (!quote || quote.type !== "QUOTE" || quote.user?.salesRepId !== repId) return false;
  return true;
}

export type QuoteActionState = { error?: string; success?: boolean };

/** Update the status of one of the rep's quotes (ownership-checked). */
export async function updateRepQuoteStatus(
  _prev: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const sales = await getSalesSession();
  if (!sales) redirect("/sales/sign-in");

  const inquiryId = Number(formData.get("inquiryId"));
  const status = str(formData, "status");
  if (!Number.isFinite(inquiryId)) return { error: "Invalid quote id." };
  if (!(status in INQUIRY_STATUS)) return { error: "Invalid status." };
  if (!(await assertRepOwnsQuote(sales.rep.id, inquiryId)))
    return { error: "That quote is not assigned to you." };

  await db.inquiry.update({ where: { id: inquiryId }, data: { status } });
  revalidatePath(`/sales/quotes/${inquiryId}`);
  revalidatePath("/sales/quotes");
  revalidatePath("/sales");
  return { success: true };
}

/** Add a note to one of the rep's quotes (ownership-checked). */
export async function addQuoteNote(
  _prev: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const sales = await getSalesSession();
  if (!sales) redirect("/sales/sign-in");

  const inquiryId = Number(formData.get("inquiryId"));
  const body = str(formData, "body");
  if (!Number.isFinite(inquiryId)) return { error: "Invalid quote id." };
  if (!body) return { error: "Note cannot be empty." };
  if (!(await assertRepOwnsQuote(sales.rep.id, inquiryId)))
    return { error: "That quote is not assigned to you." };

  await db.inquiryNote.create({
    data: { inquiryId, body: body.slice(0, 2000), authorLabel: sales.rep.name },
  });
  revalidatePath(`/sales/quotes/${inquiryId}`);
  return { success: true };
}
