import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  jsonError,
  enforceRateLimit,
  enforceVerifyBucket,
  enforceVerifyMissGuard,
  recordVerifyMiss,
  requireIntegrationKey,
  readJson,
  isResponse,
} from "@/lib/api/http";
import { getOrigin } from "@/lib/api/serialize";
import { createQuote, type CreateQuoteInput } from "@/lib/integration/create-quote";

export const dynamic = "force-dynamic";

const MAX_QUANTITY = 100_000;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function opt(v: unknown): string | null {
  const s = str(v);
  return s ? s : null;
}
/** Identity fields are free-form caller input — cap them before they hit the DB. */
const MAX_FIELD = 200;
function optCapped(v: unknown): string | null {
  return opt(v)?.slice(0, MAX_FIELD) ?? null;
}

function parseItems(v: unknown): CreateQuoteInput["items"] | null {
  if (!Array.isArray(v)) return null;
  const out: CreateQuoteInput["items"] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const slug = str(r.slug);
    if (!slug) return null;
    const q = r.quantity === undefined ? 1 : Number(r.quantity);
    // Upper bound as well as lower: an out-of-range integer would blow up inside
    // Prisma rather than coming back as a 400.
    if (!Number.isFinite(q) || q <= 0 || q > MAX_QUANTITY) return null;
    out.push({ slug, quantity: Math.floor(q), note: opt(r.note)?.slice(0, 120) ?? null });
  }
  return out;
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;
  const denied = requireIntegrationKey(req);
  if (denied) return denied;

  const body = await readJson(req);
  if (isResponse(body)) return body;

  const source = str(body.source);
  if (source !== "whatsapp" && source !== "voice")
    return jsonError("bad_request", 'source must be "whatsapp" or "voice".', 400);
  const items = parseItems(body.items);
  if (!items) return jsonError("bad_request", "items must be an array of { slug, quantity?, note? }.", 400);

  // Same per-(IP, account number) brute-force bucket the verify endpoint uses:
  // this route verifies an MEC account too when one is supplied.
  const accountNumber = opt(body.mecAccountNumber);
  if (accountNumber) {
    const bucketed = enforceVerifyBucket(req, accountNumber);
    if (bucketed) return bucketed;
    const enumerating = enforceVerifyMissGuard(req);
    if (enumerating) return enumerating;
  }

  let result: Awaited<ReturnType<typeof createQuote>>;
  try {
    result = await createQuote({
      source,
      contactName: str(body.contactName).slice(0, MAX_FIELD),
      phone: optCapped(body.phone),
      email: optCapped(body.email),
      mecAccountNumber: accountNumber,
      companyName: optCapped(body.companyName),
      industry: opt(body.industry),
      location: optCapped(body.location),
      items,
      notes: opt(body.notes),
    });
  } catch (e) {
    console.error("[integration] createQuote threw:", e);
    return jsonError("internal_error", "Could not submit the quote. Please try again.", 500);
  }

  if (!result.ok) {
    // A failed verification here counts against the same per-IP enumeration
    // guard the verify endpoint uses, so this route isn't a way around it.
    if (result.error === "verification_failed") recordVerifyMiss(req);
    const status = result.error === "unknown_product" ? 404 : 400;
    return jsonError(result.error, result.message, status);
  }

  // The form URL is handed to a chat/voice agent, so it must always be absolute.
  const origin =
    getOrigin(req) ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const data: Record<string, unknown> = {
    ref: result.ref,
    matchStatus: result.matchStatus,
    itemCount: result.itemCount,
  };
  // Uniform with GET /api/quotes/{ref}: VERIFIED always carries the key.
  if (result.matchStatus === "VERIFIED")
    data.salesRep = result.salesRepName ? { name: result.salesRepName } : null;
  if (result.matchStatus === "NO_MATCH") {
    data.newCustomerFormUrl = `${origin}/register?ref=${encodeURIComponent(result.ref)}`;
  }
  return NextResponse.json({ data }, { status: 201 });
}
