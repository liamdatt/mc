import "server-only";
import { randomBytes } from "crypto";
import { after } from "next/server";
import { db } from "@/lib/db";
import { INQUIRY_TYPE, MATCH_STATUS } from "@/lib/constants";
import { matchGuest, type MatchStatus } from "@/lib/customer-match";
import { isIndustry } from "@/lib/industries";
import { getLiveDealBadges, pickBadgeForVariant } from "@/lib/deals";
import { sendInquiryEmails } from "@/lib/email/send-inquiry-emails";
import { verifyAccount } from "@/lib/integration/verify-account";

export type CreateQuoteInput = {
  source: "whatsapp" | "voice";
  contactName: string;
  phone: string | null;
  email: string | null;
  mecAccountNumber: string | null;
  companyName: string | null;
  industry: string | null;
  location: string | null;
  items: { slug: string; quantity: number; note: string | null }[];
  notes: string | null;
};

export type CreateQuoteResult =
  | { ok: false; error: "verification_failed" | "unknown_product" | "bad_request"; message: string }
  | {
      ok: true;
      ref: string;
      matchStatus: MatchStatus;
      itemCount: number;
      salesRepName: string | null;
      inquiryId: number;
    };

const MAX_ITEMS = 50;

/**
 * Integration-channel quote (SOP §D/§E, mirrors `submitQuote`). Verified path
 * links the Inquiry to the Company; guest path runs the existing matcher.
 * `Inquiry.message` is prefixed "[via <source>]" so the inbox shows the channel.
 */
export async function createQuote(input: CreateQuoteInput): Promise<CreateQuoteResult> {
  if (!input.contactName) return { ok: false, error: "bad_request", message: "contactName is required." };
  if (!input.email && !input.phone)
    return { ok: false, error: "bad_request", message: "At least one of email or phone is required." };
  if (input.items.length === 0) return { ok: false, error: "bad_request", message: "items must not be empty." };
  if (input.items.length > MAX_ITEMS)
    return { ok: false, error: "bad_request", message: `items must have at most ${MAX_ITEMS} entries.` };

  // Resolve every slug to an active product (+ its single variant when unambiguous).
  const slugs = Array.from(new Set(input.items.map((i) => i.slug)));
  const products = await db.product.findMany({
    where: { slug: { in: slugs }, active: true },
    select: { id: true, slug: true, name: true, variants: { where: { active: true }, select: { id: true } } },
  });
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const missing = slugs.find((s) => !bySlug.has(s));
  if (missing) return { ok: false, error: "unknown_product", message: `No product with slug ${missing}.` };

  let matchStatus: MatchStatus = MATCH_STATUS.NO_MATCH;
  let companyId: number | null = null;
  let matchedCompanyId: number | null = null;
  let companyName = input.companyName;
  let salesRepName: string | null = null;

  if (input.mecAccountNumber) {
    if (!input.companyName)
      return { ok: false, error: "bad_request", message: "companyName is required with mecAccountNumber." };
    const verified = await verifyAccount({
      mecAccountNumber: input.mecAccountNumber,
      companyName: input.companyName,
    });
    if (!verified)
      return {
        ok: false,
        error: "verification_failed",
        message: "Account number and company name did not match an MEC account.",
      };
    matchStatus = MATCH_STATUS.VERIFIED;
    companyId = verified.id;
    matchedCompanyId = verified.id;
    companyName = verified.name;
    salesRepName = verified.salesRepName;
  } else {
    if (!input.companyName) return { ok: false, error: "bad_request", message: "companyName is required." };
    if (!input.phone) return { ok: false, error: "bad_request", message: "phone is required for guest quotes." };
    if (!isIndustry(input.industry))
      return { ok: false, error: "bad_request", message: "industry must be one of the approved values." };
    if (!input.location) return { ok: false, error: "bad_request", message: "location is required." };
    try {
      const m = await matchGuest({ email: input.email ?? "", phone: input.phone, company: input.companyName });
      matchStatus = m.status;
      matchedCompanyId = m.matchedCompanyId;
    } catch (e) {
      // Never lose a quote because the matcher failed.
      console.error("[integration] matcher threw — treating as NO_MATCH:", e);
      matchStatus = MATCH_STATUS.NO_MATCH;
    }
  }

  const ref = randomBytes(24).toString("base64url");
  const badges = await getLiveDealBadges();
  const message = `[via ${input.source}]${input.notes ? ` ${input.notes}` : ""}`.slice(0, 2000);

  const inquiry = await db.inquiry.create({
    data: {
      type: INQUIRY_TYPE.QUOTE,
      userId: null,
      companyId,
      name: input.contactName,
      email: input.email ?? "",
      company: companyName,
      phone: input.phone,
      message,
      industry: matchStatus === MATCH_STATUS.VERIFIED ? null : input.industry,
      location: matchStatus === MATCH_STATUS.VERIFIED ? null : input.location,
      ref,
      matchStatus,
      matchedCompanyId,
      items: {
        create: input.items.map((i) => {
          const p = bySlug.get(i.slug)!;
          const variantId = p.variants.length === 1 ? p.variants[0]!.id : null;
          const productName = (i.note ? `${p.name} — ${i.note}` : p.name).slice(0, 200);
          return {
            productId: p.id,
            variantId,
            productName,
            quantity: i.quantity,
            dealLabel: pickBadgeForVariant(badges, p.id, variantId),
          };
        }),
      },
    },
    select: { id: true },
  });

  after(() => sendInquiryEmails(inquiry.id));
  return {
    ok: true,
    ref,
    matchStatus,
    itemCount: input.items.length,
    salesRepName,
    inquiryId: inquiry.id,
  };
}
