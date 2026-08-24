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
 * Update one of the signed-in rep's companies' profile fields. The rep is
 * re-derived from the session and the company's salesRepId is verified against
 * it — an id from the form is never trusted. Rep assignment and portal users
 * stay admin-only.
 */
export async function updateRepCompany(
  _prev: RepCustomerState,
  formData: FormData,
): Promise<RepCustomerState> {
  const sales = await getSalesSession();
  if (!sales) redirect("/portal");

  const id = Number(formData.get("id"));
  const name = str(formData, "name");
  if (!Number.isInteger(id)) return { error: "Missing company id." };
  if (!name) return { error: "Company name is required." };

  const company = await db.company.findUnique({
    where: { id },
    select: { salesRepId: true },
  });
  if (!company || company.salesRepId !== sales.rep.id)
    return { error: "That company is not assigned to you." };

  await db.company.update({
    where: { id },
    data: {
      name,
      industry: str(formData, "industry") || null,
      location: str(formData, "location") || null,
    },
  });

  revalidatePath("/portal/customers");
  revalidatePath(`/portal/customers/${id}`);
  return { success: true };
}

async function assertRepOwnsQuote(repId: number, inquiryId: number) {
  const quote = await db.inquiry.findUnique({
    where: { id: inquiryId },
    select: { type: true, companyRef: { select: { salesRepId: true } } },
  });
  if (!quote || quote.type !== "QUOTE" || quote.companyRef?.salesRepId !== repId) return false;
  return true;
}

export type QuoteActionState = { error?: string; success?: boolean };

/** Update the status of one of the rep's quotes (ownership-checked). */
export async function updateRepQuoteStatus(
  _prev: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const sales = await getSalesSession();
  if (!sales) redirect("/portal");

  const inquiryId = Number(formData.get("inquiryId"));
  const status = str(formData, "status");
  if (!Number.isInteger(inquiryId)) return { error: "Invalid quote id." };
  if (!Object.prototype.hasOwnProperty.call(INQUIRY_STATUS, status))
    return { error: "Invalid status." };
  if (!(await assertRepOwnsQuote(sales.rep.id, inquiryId)))
    return { error: "That quote is not assigned to you." };

  await db.inquiry.update({ where: { id: inquiryId }, data: { status } });
  revalidatePath(`/portal/quotes/${inquiryId}`);
  revalidatePath("/portal/quotes");
  revalidatePath("/portal");
  return { success: true };
}

/** Add a note to one of the rep's quotes (ownership-checked). */
export async function addQuoteNote(
  _prev: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const sales = await getSalesSession();
  if (!sales) redirect("/portal");

  const inquiryId = Number(formData.get("inquiryId"));
  const body = str(formData, "body");
  if (!Number.isInteger(inquiryId)) return { error: "Invalid quote id." };
  if (!body) return { error: "Note cannot be empty." };
  if (!(await assertRepOwnsQuote(sales.rep.id, inquiryId)))
    return { error: "That quote is not assigned to you." };

  await db.inquiryNote.create({
    data: { inquiryId, body: body.slice(0, 2000), authorLabel: sales.rep.name },
  });
  revalidatePath(`/portal/quotes/${inquiryId}`);
  return { success: true };
}
