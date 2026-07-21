"use server";

import { db } from "@/lib/db";
import { INQUIRY_TYPE } from "@/lib/constants";
import { getPortalSession } from "@/lib/portal";
import { after } from "next/server";
import { sendInquiryEmails } from "@/lib/email/send-inquiry-emails";

export type InquiryResult = { ok: boolean; error?: string };

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function requireContact(formData: FormData): InquiryResult | null {
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
  _prev: InquiryResult,
  formData: FormData,
): Promise<InquiryResult> {
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

  // Attach the quote to the signed-in portal account, if any. The user id is
  // derived from the session cookie server-side — never from form data.
  const session = await getPortalSession();

  const inquiry = await db.inquiry.create({
    data: {
      type: INQUIRY_TYPE.QUOTE,
      userId: session?.user.id ?? null,
      name: field(formData, "name"),
      email: field(formData, "email"),
      company: field(formData, "company") || null,
      phone: field(formData, "phone") || null,
      message: field(formData, "message") || null,
      items: {
        create: items.map((i) => ({
          productId:
            typeof i.productId === "number" ? i.productId : null,
          variantId:
            typeof i.variantId === "number" ? i.variantId : null,
          productName: String(i.productName).slice(0, 200),
          quantity:
            Number.isFinite(i.quantity) && i.quantity > 0
              ? Math.floor(i.quantity)
              : 1,
        })),
      },
    },
  });
  after(() => sendInquiryEmails(inquiry.id));
  return { ok: true };
}
