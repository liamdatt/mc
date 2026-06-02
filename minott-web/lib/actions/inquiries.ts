"use server";

import { db } from "@/lib/db";
import { INQUIRY_TYPE } from "@/lib/constants";

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
  await db.inquiry.create({
    data: {
      type: INQUIRY_TYPE.CONTACT,
      name: field(formData, "name"),
      email: field(formData, "email"),
      company: field(formData, "company") || null,
      phone: field(formData, "phone") || null,
      message: field(formData, "message") || null,
    },
  });
  return { ok: true };
}

export async function submitSample(
  _prev: InquiryResult,
  formData: FormData,
): Promise<InquiryResult> {
  const bad = requireContact(formData);
  if (bad) return bad;
  const productId = Number(formData.get("productId"));
  await db.inquiry.create({
    data: {
      type: INQUIRY_TYPE.SAMPLE,
      productId: Number.isFinite(productId) ? productId : null,
      name: field(formData, "name"),
      email: field(formData, "email"),
      company: field(formData, "company") || null,
      phone: field(formData, "phone") || null,
      message: field(formData, "message") || null,
    },
  });
  return { ok: true };
}

type CartLine = { productId?: number; productName: string; quantity: number };

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

  await db.inquiry.create({
    data: {
      type: INQUIRY_TYPE.QUOTE,
      name: field(formData, "name"),
      email: field(formData, "email"),
      company: field(formData, "company") || null,
      phone: field(formData, "phone") || null,
      message: field(formData, "message") || null,
      items: {
        create: items.map((i) => ({
          productId:
            typeof i.productId === "number" ? i.productId : null,
          productName: String(i.productName).slice(0, 200),
          quantity:
            Number.isFinite(i.quantity) && i.quantity > 0
              ? Math.floor(i.quantity)
              : 1,
        })),
      },
    },
  });
  return { ok: true };
}
