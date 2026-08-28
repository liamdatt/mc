"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/db";
import { INQUIRY_STATUS, INQUIRY_TYPE, MATCH_STATUS } from "@/lib/constants";
import { requireAdmin } from "@/lib/auth/require-admin";
import { sendInquiryEmails } from "@/lib/email/send-inquiry-emails";
import { matchGuest } from "@/lib/customer-match";

const VALID: Set<string> = new Set(Object.values(INQUIRY_STATUS));

export async function setInquiryStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "");
  if (!Number.isFinite(id) || !VALID.has(status)) return;
  await db.inquiry.update({ where: { id }, data: { status } });
  revalidatePath("/portal/requests");
}

export type AttachState = { error?: string; success?: boolean };

function revalidateAttachPaths(id: number) {
  revalidatePath("/portal/requests");
  revalidatePath(`/portal/requests/${id}`);
  revalidatePath("/portal/history");
  revalidatePath("/portal/quotes");
}

/**
 * Admin manual override for the guest-matching flow: attach any quote
 * request to a customer company, regardless of its matcher outcome. Used
 * from the admin request-detail page (`/portal/requests/[id]`) when a rep
 * or admin recognizes a caller/quote that the automatic matcher missed, or
 * to correct a wrong potential-match suggestion.
 */
export async function attachInquiryToCompany(
  _prev: AttachState,
  formData: FormData,
): Promise<AttachState> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  const companyId = Number(formData.get("companyId"));
  if (!Number.isInteger(id) || id <= 0) return { error: "Invalid request." };
  if (!Number.isInteger(companyId) || companyId <= 0) {
    return { error: "Please choose a company." };
  }

  const inquiry = await db.inquiry.findUnique({
    where: { id },
    select: { id: true, type: true },
  });
  if (!inquiry) return { error: "Request not found." };
  if (inquiry.type !== INQUIRY_TYPE.QUOTE) {
    return { error: "Only quote requests can be attached." };
  }

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });
  if (!company) return { error: "Company not found." };

  await db.inquiry.update({
    where: { id },
    data: {
      companyId,
      matchStatus: MATCH_STATUS.VERIFIED,
      matchedCompanyId: null,
    },
  });

  after(() => sendInquiryEmails(id, { verifiedNow: true }));

  revalidateAttachPaths(id);
  return { success: true };
}

/**
 * Detach a quote request from its company. A guest-submitted quote (no
 * `userId`) has its matchStatus re-derived by re-running the guest matcher
 * against the row's own submitted email/phone/company — this correctly
 * reverts it to POTENTIAL_MATCH or NO_MATCH depending on what the matcher
 * would say today, rather than assuming it was always a POTENTIAL_MATCH row.
 * A quote submitted by a signed-in customer keeps its VERIFIED status (the
 * user themselves is still an authenticated fact) but is no longer linked to
 * a company.
 */
export async function detachInquiryFromCompany(
  _prev: AttachState,
  formData: FormData,
): Promise<AttachState> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { error: "Invalid request." };

  const inquiry = await db.inquiry.findUnique({
    where: { id },
    select: { id: true, type: true, userId: true, email: true, phone: true, company: true },
  });
  if (!inquiry) return { error: "Request not found." };
  if (inquiry.type !== INQUIRY_TYPE.QUOTE) {
    return { error: "Only quote requests can be detached." };
  }

  let matchFields: { matchStatus: string; matchedCompanyId: number | null } | null = null;
  if (inquiry.userId === null) {
    try {
      const m = await matchGuest({
        email: inquiry.email,
        phone: inquiry.phone ?? "",
        company: inquiry.company ?? "",
      });
      matchFields = { matchStatus: m.status, matchedCompanyId: m.matchedCompanyId };
    } catch (e) {
      console.error("[admin-inquiries] matcher threw on detach — treating as NO_MATCH:", e);
      matchFields = { matchStatus: MATCH_STATUS.NO_MATCH, matchedCompanyId: null };
    }
  }

  await db.inquiry.update({
    where: { id },
    data: {
      companyId: null,
      ...(matchFields ?? {}),
    },
  });

  revalidateAttachPaths(id);
  return { success: true };
}
