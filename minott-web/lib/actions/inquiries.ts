"use server";

import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { INQUIRY_TYPE, MATCH_STATUS } from "@/lib/constants";
import { getPortalSession, getCustomerScope } from "@/lib/portal";
import { after } from "next/server";
import { sendInquiryEmails } from "@/lib/email/send-inquiry-emails";
import { getLiveDealBadges, pickBadgeForVariant } from "@/lib/deals";
import { matchGuest, type MatchStatus } from "@/lib/customer-match";
import { isIndustry } from "@/lib/industries";

export type InquiryResult = { ok: boolean; error?: string };

export type QuoteResult =
  | { ok: false; error?: string }
  | { ok: true; outcome: MatchStatus; ref?: string };

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function requireContact(
  formData: FormData,
): { ok: false; error: string } | null {
  if (!field(formData, "name")) return { ok: false, error: "Name is required." };
  if (!field(formData, "email"))
    return { ok: false, error: "Email is required." };
  return null;
}

export async function submitContact(
  _prev: InquiryResult,
  formData: FormData,
): Promise<InquiryResult> {
  const bad = requireContact(formData);
  if (bad) return bad;
  const inquiry = await db.inquiry.create({
    data: {
      type: INQUIRY_TYPE.CONTACT,
      name: field(formData, "name"),
      email: field(formData, "email"),
      company: field(formData, "company") || null,
      phone: field(formData, "phone") || null,
      message: field(formData, "message") || null,
    },
  });
  after(() => sendInquiryEmails(inquiry.id));
  return { ok: true };
}

export async function submitSample(
  _prev: InquiryResult,
  formData: FormData,
): Promise<InquiryResult> {
  const bad = requireContact(formData);
  if (bad) return bad;
  const productId = Number(formData.get("productId"));
  const variantId = Number(formData.get("variantId")) || null;
  const inquiry = await db.inquiry.create({
    data: {
      type: INQUIRY_TYPE.SAMPLE,
      productId: Number.isFinite(productId) ? productId : null,
      variantId,
      name: field(formData, "name"),
      email: field(formData, "email"),
      company: field(formData, "company") || null,
      phone: field(formData, "phone") || null,
      message: field(formData, "message") || null,
    },
  });
  after(() => sendInquiryEmails(inquiry.id));
  return { ok: true };
}

type CartLine = {
  productId?: number;
  variantId?: number;
  productName: string;
  quantity: number;
};

export async function submitQuote(
  _prev: QuoteResult,
  formData: FormData,
): Promise<QuoteResult> {
  const bad = requireContact(formData);
  if (bad) return bad;

  let items: CartLine[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { ok: false, error: "Could not read your quote list." };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "Your quote list is empty." };
  }

  // Signed-in: attach to the account + company from the session (never the
  // form) and skip matching — a known account is VERIFIED by definition.
  const session = await getPortalSession();
  const scope = session ? await getCustomerScope(session.user.id) : null;

  const name = field(formData, "name");
  const email = field(formData, "email");
  const company = field(formData, "company") || null;
  const phone = field(formData, "phone") || null;
  const message = field(formData, "message") || null;

  // Guest-only fields (spec §5).
  let industry: string | null = null;
  let location: string | null = null;
  let ref: string | null = null;
  let matchStatus: MatchStatus = MATCH_STATUS.VERIFIED;
  let matchedCompanyId: number | null = null;

  if (!session) {
    if (!company) return { ok: false, error: "Company is required." };
    if (!phone) return { ok: false, error: "Phone is required." };
    industry = field(formData, "industry");
    location = field(formData, "location");
    if (!isIndustry(industry)) return { ok: false, error: "Please choose your industry." };
    if (!location) return { ok: false, error: "Location is required." };
    ref = randomBytes(24).toString("base64url");
    try {
      const m = await matchGuest({ email, phone: phone ?? "", company: company ?? "" });
      matchStatus = m.status;
      matchedCompanyId = m.matchedCompanyId;
    } catch (e) {
      // Never lose a quote because the matcher failed.
      console.error("[match] matcher threw — treating as NO_MATCH:", e);
      matchStatus = MATCH_STATUS.NO_MATCH;
    }
  }

  const badges = await getLiveDealBadges();

  const inquiry = await db.inquiry.create({
    data: {
      type: INQUIRY_TYPE.QUOTE,
      userId: session?.user.id ?? null,
      companyId: scope?.companyId ?? null,
      name,
      email,
      company,
      phone,
      message,
      industry,
      location,
      ref,
      matchStatus,
      matchedCompanyId,
      items: {
        create: items.map((i) => ({
          productId: typeof i.productId === "number" ? i.productId : null,
          variantId: typeof i.variantId === "number" ? i.variantId : null,
          productName: String(i.productName).slice(0, 200),
          quantity:
            Number.isFinite(i.quantity) && i.quantity > 0 ? Math.floor(i.quantity) : 1,
          dealLabel: pickBadgeForVariant(
            badges,
            typeof i.productId === "number" ? i.productId : -1,
            typeof i.variantId === "number" ? i.variantId : null,
          ),
        })),
      },
    },
  });
  after(() => sendInquiryEmails(inquiry.id));
  return session
    ? { ok: true, outcome: MATCH_STATUS.VERIFIED }
    : { ok: true, outcome: matchStatus, ref: ref ?? undefined };
}
