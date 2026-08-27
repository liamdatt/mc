"use server";

import { after } from "next/server";
import { db } from "@/lib/db";
import { isIndustry } from "@/lib/industries";
import { APPLICATION_STATUS, MATCH_STATUS } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { currentRequestIp } from "@/lib/request-ip";
import { getInquiryByRef } from "@/lib/applications";
import { sendApplicationEmails } from "@/lib/email/send-application-emails";

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
