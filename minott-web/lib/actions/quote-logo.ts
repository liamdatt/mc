"use server";

import { saveLogo } from "@/lib/quote-logos";
import { checkRateLimit } from "@/lib/rate-limit";
import { currentRequestIp } from "@/lib/request-ip";

export type UploadQuoteLogoResult =
  | { ok: true; token: string; fileName: string }
  | { ok: false; error: string };

/**
 * Unauthenticated upload of a custom mat logo (guests can quote). Guarded by a
 * per-IP limit, the 10 MB cap and a magic-byte allowlist (lib/quote-logos.ts).
 * Returns an opaque token the cart stores; submitQuote re-validates it.
 */
export async function uploadQuoteLogo(formData: FormData): Promise<UploadQuoteLogoResult> {
  const ip = await currentRequestIp();
  if (!checkRateLimit("quote-logo:" + ip, { max: 20, windowMs: 3_600_000 }).ok) {
    return { ok: false, error: "Too many uploads. Please try again later." };
  }
  const file = formData.get("logo");
  if (!(file instanceof File)) return { ok: false, error: "Choose a logo file to upload." };
  try {
    const saved = await saveLogo(file);
    if (!saved.ok) return saved;
    const fileName = (file.name || "logo").slice(0, 120);
    return { ok: true, token: saved.token, fileName };
  } catch (e) {
    console.error("[uploadQuoteLogo] failed to store logo", e);
    return { ok: false, error: "Upload failed. Please try again." };
  }
}
