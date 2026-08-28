import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  jsonError,
  enforceRateLimit,
  requireIntegrationKey,
  readJson,
  isResponse,
} from "@/lib/api/http";
import { getOrigin } from "@/lib/api/serialize";
import { createQuote, type CreateQuoteInput } from "@/lib/integration/create-quote";

export const dynamic = "force-dynamic";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function opt(v: unknown): string | null {
  const s = str(v);
  return s ? s : null;
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
    if (!Number.isFinite(q) || q <= 0) return null;
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

  const result = await createQuote({
    source,
    contactName: str(body.contactName),
    phone: opt(body.phone),
    email: opt(body.email),
    mecAccountNumber: opt(body.mecAccountNumber),
    companyName: opt(body.companyName),
    industry: opt(body.industry),
    location: opt(body.location),
    items,
    notes: opt(body.notes),
  });

  if (!result.ok) {
    const status = result.error === "unknown_product" ? 404 : 400;
    return jsonError(result.error, result.message, status);
  }

  const origin = getOrigin(req);
  const data: Record<string, unknown> = {
    ref: result.ref,
    matchStatus: result.matchStatus,
    itemCount: result.itemCount,
  };
  if (result.matchStatus === "VERIFIED" && result.salesRepName) data.salesRep = { name: result.salesRepName };
  if (result.matchStatus === "NO_MATCH") {
    const path = `/register?ref=${encodeURIComponent(result.ref)}`;
    data.newCustomerFormUrl = origin ? `${origin}${path}` : path;
  }
  return NextResponse.json({ data }, { status: 201 });
}
