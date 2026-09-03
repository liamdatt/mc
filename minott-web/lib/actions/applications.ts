"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { isIndustry } from "@/lib/industries";
import { APPLICATION_STATUS, MATCH_STATUS, isParish } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { currentRequestIp } from "@/lib/request-ip";
import { getInquiryByRef } from "@/lib/applications";
import { sendApplicationEmails } from "@/lib/email/send-application-emails";
import { requireRole } from "@/lib/auth/require-admin";
import { getPortalSession } from "@/lib/portal";
import { provisionUser, sendInvite, INVITE_REDIRECT } from "@/lib/auth/provision";
import { sendInquiryEmails } from "@/lib/email/send-inquiry-emails";

export type ApplicationFormState = { done?: boolean; error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Create (or, when info was requested, update) the New Customer Form for the
 * guest quote identified by `ref` (spec §8). Public endpoint: the ref is the
 * only credential and only unlocks the guest's own submission.
 */
export async function submitApplication(
  _prev: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const ip = await currentRequestIp();
  const limit = checkRateLimit(`apply:${ip}`, { max: 10, windowMs: 15 * 60_000 });
  if (!limit.ok) return { error: "Too many attempts. Please try again later." };

  const inquiry = await getInquiryByRef(str(formData, "ref"));
  if (!inquiry || inquiry.type !== "QUOTE" || inquiry.matchStatus !== MATCH_STATUS.NO_MATCH)
    return { error: "This link isn't valid. Please start a new quote request." };
  const existing = inquiry.application;
  if (existing && existing.status !== APPLICATION_STATUS.INFO_REQUESTED)
    return { error: "This application has already been submitted." };

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const opt = (key: string) => str(formData, key) || null;
  const shippingSame = formData.get("shippingSame") === "on";
  const billingCity = str(formData, "billingCity");
  const billingParish = str(formData, "billingParish");

  const data = {
    companyName: str(formData, "companyName"),
    industry: str(formData, "industry"),
    businessType: str(formData, "businessType"),
    inBusinessSince: opt("inBusinessSince"),
    trn: str(formData, "trn"),
    taxExemptionNumber: opt("taxExemptionNumber"),
    billingStreet: str(formData, "billingStreet"),
    billingCity,
    billingParish,
    billingZip: opt("billingZip"),
    shippingStreet: shippingSame ? null : opt("shippingStreet"),
    shippingCity: shippingSame ? null : opt("shippingCity"),
    shippingParish: shippingSame ? null : opt("shippingParish"),
    shippingZip: shippingSame ? null : opt("shippingZip"),
    location: `${billingCity}, ${billingParish}`,
    contactName: str(formData, "contactName"),
    principalTitle: opt("principalTitle"),
    email: str(formData, "email").toLowerCase(),
    phone: str(formData, "phone"),
    accountingName: opt("accountingName"),
    accountingPhone: opt("accountingPhone"),
    accountingEmail: str(formData, "accountingEmail").toLowerCase() || null,
    notes: opt("notes"),
  };
  if (!data.companyName) return { error: "Business name is required." };
  if (!isIndustry(data.industry)) return { error: "Please choose your industry." };
  if (!data.businessType) return { error: "Type of business is required." };
  if (!data.trn) return { error: "Tax Registration Number (TRN) is required." };
  if (!data.billingStreet || !data.billingCity) return { error: "Billing street and city are required." };
  if (!isParish(data.billingParish)) return { error: "Please choose your billing parish." };
  if (data.shippingParish && !isParish(data.shippingParish)) return { error: "Please choose a valid shipping parish." };
  if (!data.contactName) return { error: "Principal contact name is required." };
  if (!EMAIL_RE.test(data.email)) return { error: "A valid principal email is required." };
  if (!data.phone) return { error: "Principal telephone is required." };
  if (data.accountingEmail && !EMAIL_RE.test(data.accountingEmail)) return { error: "The accounting contact email is not valid." };

  let appId: number;
  if (existing) {
    // Status-guarded so two concurrent resubmits can't both go through.
    const claimed = await db.customerApplication.updateMany({
      where: { id: existing.id, status: APPLICATION_STATUS.INFO_REQUESTED },
      data: { ...data, status: APPLICATION_STATUS.SUBMITTED, decisionNote: null },
    });
    if (claimed.count === 0) return { error: "This application has already been submitted." };
    appId = existing.id;
  } else {
    const created = await db.customerApplication.create({
      data: { ...data, inquiryId: inquiry.id },
    });
    appId = created.id;
  }

  after(() => sendApplicationEmails(appId, "received", { resubmitted: Boolean(existing) }));
  return { done: true };
}

export type DecisionState = { error?: string; success?: boolean };

const STAFF = ["admin", "ar"];

async function loadOpenApplication(id: number) {
  const app = await db.customerApplication.findUnique({ where: { id } });
  if (!app) return { error: "Application not found." } as const;
  if (app.status === APPLICATION_STATUS.APPROVED || app.status === APPLICATION_STATUS.REJECTED)
    return { error: "This application has already been decided." } as const;
  return { app } as const;
}

function revalidateAll(id: number) {
  revalidatePath("/portal/applications");
  revalidatePath(`/portal/applications/${id}`);
  revalidatePath("/portal/requests");
  revalidatePath("/portal/customers");
  revalidatePath("/portal");
}

/**
 * Approve: create the Company, provision the contact (invite = "approved"
 * email), link the original quote, mark APPROVED, notify the rep (spec §9).
 * Ordered writes with a compensating delete — no dangling company.
 */
export async function approveApplication(
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  await requireRole(STAFF);
  const session = await getPortalSession();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Missing application id." };
  const loaded = await loadOpenApplication(id);
  if ("error" in loaded) return { error: loaded.error };
  const app = loaded.app;

  const repRaw = str(formData, "salesRepId");
  const salesRepId = repRaw ? Number(repRaw) : null;
  if (salesRepId !== null && !(Number.isInteger(salesRepId) && salesRepId > 0))
    return { error: "Invalid sales rep." };

  const existingUser = await db.user.findUnique({ where: { email: app.email }, select: { id: true } });
  if (existingUser)
    return { error: "An account with this email already exists — link it from Customers instead." };

  const company = await db.company.create({
    data: { name: app.companyName, industry: app.industry, location: app.location, salesRepId },
  });

  const result = await provisionUser({
    email: app.email,
    name: app.contactName,
    role: "customer",
    redirectTo: INVITE_REDIRECT.customer,
    data: { phone: app.phone },
    skipInvite: true,
  });
  if (!result.ok) {
    await db.company.delete({ where: { id: company.id } }).catch((e) =>
      console.error(`[applications] failed to roll back company ${company.id}:`, e),
    );
    return { error: result.error };
  }

  // Compensating cleanup for a half-finished approval: the provisioned user
  // and the company are both brand new here, so deleting them is safe.
  const rollback = async () => {
    await db.user
      .delete({ where: { id: result.userId } })
      .catch((e) => console.error(`[applications] failed to roll back user ${result.userId}:`, e));
    await db.company
      .delete({ where: { id: company.id } })
      .catch((e) => console.error(`[applications] failed to roll back company ${company.id}:`, e));
  };

  try {
    await db.$transaction([
      db.user.update({ where: { id: result.userId }, data: { companyId: company.id } }),
      db.inquiry.update({
        where: { id: app.inquiryId },
        data: { companyId: company.id, userId: result.userId, matchStatus: MATCH_STATUS.VERIFIED, matchedCompanyId: null },
      }),
      // Status-guarded: a concurrent decide/reject leaves count 0 and the
      // re-read below catches it.
      db.customerApplication.updateMany({
        where: {
          id,
          status: { in: [APPLICATION_STATUS.SUBMITTED, APPLICATION_STATUS.INFO_REQUESTED] },
        },
        data: {
          status: APPLICATION_STATUS.APPROVED,
          companyId: company.id,
          userId: result.userId,
          decidedAt: new Date(),
          decidedByUserId: session?.user.id ?? null,
          decisionNote: null,
        },
      }),
    ]);
  } catch (e) {
    console.error(`[applications] approval transaction failed for application ${id}:`, e);
    await rollback();
    return {
      error:
        "Approval failed while linking the new account — nothing was created. Please try again.",
    };
  }

  const decided = await db.customerApplication.findUnique({ where: { id }, select: { status: true } });
  if (decided?.status !== APPLICATION_STATUS.APPROVED) {
    await rollback();
    return { error: "This application was decided by someone else moments ago." };
  }

  // Now that the application row is APPROVED + linked, the invite hook picks
  // the "approved" copy (see lib/email/send-account-invite.tsx).
  await sendInvite(app.email, INVITE_REDIRECT.customer);
  after(() => sendInquiryEmails(app.inquiryId, { verifiedNow: true }));

  revalidateAll(id);
  return { success: true };
}

export async function requestApplicationInfo(
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  await requireRole(STAFF);
  const id = Number(formData.get("id"));
  const note = str(formData, "note");
  if (!Number.isInteger(id)) return { error: "Missing application id." };
  if (!note) return { error: "Tell the applicant what you need." };
  const loaded = await loadOpenApplication(id);
  if ("error" in loaded) return { error: loaded.error };

  const claimed = await db.customerApplication.updateMany({
    where: {
      id,
      status: { in: [APPLICATION_STATUS.SUBMITTED, APPLICATION_STATUS.INFO_REQUESTED] },
    },
    data: { status: APPLICATION_STATUS.INFO_REQUESTED, decisionNote: note },
  });
  if (claimed.count === 0) return { error: "This application has already been decided." };
  after(() => sendApplicationEmails(id, "info_requested"));
  revalidateAll(id);
  return { success: true };
}

export async function rejectApplication(
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  await requireRole(STAFF);
  const session = await getPortalSession();
  const id = Number(formData.get("id"));
  const reason = str(formData, "reason");
  if (!Number.isInteger(id)) return { error: "Missing application id." };
  if (!reason) return { error: "A reason is required." };
  const loaded = await loadOpenApplication(id);
  if ("error" in loaded) return { error: loaded.error };

  const claimed = await db.customerApplication.updateMany({
    where: {
      id,
      status: { in: [APPLICATION_STATUS.SUBMITTED, APPLICATION_STATUS.INFO_REQUESTED] },
    },
    data: {
      status: APPLICATION_STATUS.REJECTED,
      decisionNote: reason,
      decidedAt: new Date(),
      decidedByUserId: session?.user.id ?? null,
    },
  });
  if (claimed.count === 0) return { error: "This application has already been decided." };
  after(() => sendApplicationEmails(id, "rejected"));
  revalidateAll(id);
  return { success: true };
}
