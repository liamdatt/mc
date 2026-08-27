"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { isIndustry } from "@/lib/industries";
import { APPLICATION_STATUS, MATCH_STATUS } from "@/lib/constants";
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

  const data = {
    companyName: str(formData, "companyName"),
    industry: str(formData, "industry"),
    location: str(formData, "location"),
    contactName: str(formData, "contactName"),
    email: str(formData, "email").toLowerCase(),
    phone: str(formData, "phone"),
    notes: str(formData, "notes") || null,
  };
  if (!data.companyName) return { error: "Company name is required." };
  if (!isIndustry(data.industry)) return { error: "Please choose your industry." };
  if (!data.location) return { error: "Location is required." };
  if (!data.contactName) return { error: "Contact name is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { error: "A valid email is required." };
  if (!data.phone) return { error: "Phone is required." };

  const app = existing
    ? await db.customerApplication.update({
        where: { id: existing.id },
        data: { ...data, status: APPLICATION_STATUS.SUBMITTED, decisionNote: null },
      })
    : await db.customerApplication.create({ data: { ...data, inquiryId: inquiry.id } });

  after(() => sendApplicationEmails(app.id, "received", { resubmitted: Boolean(existing) }));
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

  await db.user.update({ where: { id: result.userId }, data: { companyId: company.id } });
  await db.inquiry.update({
    where: { id: app.inquiryId },
    data: { companyId: company.id, userId: result.userId, matchStatus: MATCH_STATUS.VERIFIED, matchedCompanyId: null },
  });
  await db.customerApplication.update({
    where: { id },
    data: {
      status: APPLICATION_STATUS.APPROVED,
      companyId: company.id,
      userId: result.userId,
      decidedAt: new Date(),
      decidedByUserId: session?.user.id ?? null,
      decisionNote: null,
    },
  });

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

  await db.customerApplication.update({
    where: { id },
    data: { status: APPLICATION_STATUS.INFO_REQUESTED, decisionNote: note },
  });
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

  await db.customerApplication.update({
    where: { id },
    data: {
      status: APPLICATION_STATUS.REJECTED,
      decisionNote: reason,
      decidedAt: new Date(),
      decidedByUserId: session?.user.id ?? null,
    },
  });
  after(() => sendApplicationEmails(id, "rejected"));
  revalidateAll(id);
  return { success: true };
}
