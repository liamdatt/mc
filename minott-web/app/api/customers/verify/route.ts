import type { NextRequest } from "next/server";
import {
  jsonData,
  jsonError,
  enforceRateLimit,
  enforceVerifyBucket,
  enforceVerifyMissGuard,
  recordVerifyMiss,
  clearVerifyMisses,
  requireIntegrationKey,
  readJson,
  isResponse,
} from "@/lib/api/http";
import { verifyAccount } from "@/lib/integration/verify-account";

export const dynamic = "force-dynamic";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;
  const denied = requireIntegrationKey(req);
  if (denied) return denied;

  const body = await readJson(req);
  if (isResponse(body)) return body;

  const mecAccountNumber = str(body.mecAccountNumber);
  const companyName = str(body.companyName);
  if (!mecAccountNumber) return jsonError("bad_request", "mecAccountNumber is required.", 400);

  // Brute-force guard on top of the global limiter (same shape as /portal/recover),
  // keyed per account number so one attacker can't lock out other callers.
  const bucketed = enforceVerifyBucket(req, mecAccountNumber);
  if (bucketed) return bucketed;
  // Enumeration guard: the per-account bucket alone would let one IP walk the
  // whole account-number space 10 tries at a time.
  const enumerating = enforceVerifyMissGuard(req);
  if (enumerating) return enumerating;

  const company = await verifyAccount({ mecAccountNumber, companyName: companyName || null });
  if (!company) {
    recordVerifyMiss(req);
    return jsonData({ verified: false });
  }
  // A real customer verified — this caller is the legitimate agent, not an
  // enumerator, so its accumulated misses are forgiven.
  clearVerifyMisses(req);
  return jsonData({
    verified: true,
    companyName: company.name,
    salesRep: company.salesRepName ? { name: company.salesRepName } : null,
  });
}
