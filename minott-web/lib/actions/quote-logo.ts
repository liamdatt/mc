"use server";

import { after } from "next/server";
import { logoQuotaExceeded, saveLogo } from "@/lib/quote-logos";
import { maybeSweepOrphanLogos } from "@/lib/quote-logos-sweep";
import { checkRateLimit } from "@/lib/rate-limit";
import { currentRequestIp } from "@/lib/request-ip";

export type UploadQuoteLogoResult =
  | { ok: true; token: string; fileName: string }
  | { ok: false; error: string };

const UNAVAILABLE =
  "Uploads are temporarily unavailable — please email your logo to sales@minottchem.com";

/**
 * Unauthenticated upload of a custom mat logo (guests can quote). Guarded by a
 * per-IP limit, a global limit (the IP comes from x-forwarded-for and may be
 * spoofable), a 1 GB directory quota, the 10 MB cap and a magic-byte allowlist
 * (lib/quote-logos.ts). Returns an opaque token the cart stores; submitQuote
 * re-validates it. Each call may kick off the hourly orphan sweep after the
 * response.
 */
export async function uploadQuoteLogo(formData: FormData): Promise<UploadQuoteLogoResult> {
  after(() => maybeSweepOrphanLogos());

  const ip = await currentRequestIp();
  if (!checkRateLimit("quote-logo:" + ip, { max: 20, windowMs: 3_600_000 }).ok) {
    return { ok: false, error: "Too many uploads. Please try again later." };
  }
  if (!checkRateLimit("quote-logo:global", { max: 200, windowMs: 3_600_000 }).ok) {
    return { ok: false, error: UNAVAILABLE };
  }
  const file = formData.get("logo");
  if (!(file instanceof File)) return { ok: false, error: "Choose a logo file to upload." };
  try {
    if (await logoQuotaExceeded()) {
      console.warn("[uploadQuoteLogo] data/quote-logos over quota — refusing upload");
      return { ok: false, error: UNAVAILABLE };
    }
    const saved = await saveLogo(file);
    if (!saved.ok) return saved;
    const fileName = (file.name || "logo").slice(0, 120);
    return { ok: true, token: saved.token, fileName };
  } catch (e) {
    console.error("[uploadQuoteLogo] failed to store logo", e);
    return { ok: false, error: "Upload failed. Please try again." };
  }
}
