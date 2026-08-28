import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, peekRateLimit, resetRateLimit, clientIp } from "@/lib/rate-limit";
import { normalizeAccountNumber } from "@/lib/customer-match-normalize";

/** Success envelope: `{ data: ... }`. */
export function jsonData(data: unknown): NextResponse {
  return NextResponse.json({ data });
}

/** Error envelope: `{ error, message }` with a status code. */
export function jsonError(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: code, message }, { status });
}

/** The one 429 shape every limiter returns: `rate_limited` + an optional `Retry-After`. */
function rateLimited(message: string, retryAfter?: number): NextResponse {
  return NextResponse.json(
    { error: "rate_limited", message },
    { status: 429, headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined },
  );
}

const VERIFY_LIMIT_MESSAGE = "Too many verification attempts. Please try again later.";

/**
 * Returns a 429 response if the caller is over the limit, otherwise null.
 * Call at the top of every route handler: `const limited = enforceRateLimit(req); if (limited) return limited;`
 */
export function enforceRateLimit(req: NextRequest): NextResponse | null {
  const ip = clientIp(req);
  const { ok, retryAfter } = checkRateLimit(ip);
  if (ok) return null;
  console.warn(`[api] rate limit exceeded for ${ip}`);
  return rateLimited("Too many requests. Please slow down.", retryAfter);
}

/** Per-(IP, account number) brute-force guard shared by every endpoint that verifies an MEC account. 429 or null. */
export function enforceVerifyBucket(req: NextRequest, accountNumber: string): NextResponse | null {
  const key = `verify:${clientIp(req)}:${normalizeAccountNumber(accountNumber)}`;
  const { ok, retryAfter } = checkRateLimit(key, { max: 10, windowMs: 15 * 60_000 });
  if (ok) return null;
  return rateLimited(VERIFY_LIMIT_MESSAGE, retryAfter);
}

const MISS_MAX = 100;
const MISS_WINDOW_MS = 15 * 60_000;

function missKey(req: NextRequest): string {
  return `verifymiss:${clientIp(req)}`;
}

/**
 * Enumeration guard: 429 once an IP has accumulated 100 failed verifications in
 * 15 min. Peeks the bucket WITHOUT incrementing — only `recordVerifyMiss` moves
 * the counter, and only misses count.
 *
 * The ceiling is deliberately high and `clearVerifyMisses` resets it on every
 * successful verification, because in production every OneChat agent call
 * arrives from a SINGLE egress IP: a per-IP counter is really a per-fleet
 * counter, so a low cap would let one caller's typos 429 every other customer.
 */
export function enforceVerifyMissGuard(req: NextRequest): NextResponse | null {
  const { ok, retryAfter } = peekRateLimit(missKey(req), { max: MISS_MAX });
  if (ok) return null;
  return rateLimited(VERIFY_LIMIT_MESSAGE, retryAfter);
}

/** Counts one failed verification against the caller's IP. */
export function recordVerifyMiss(req: NextRequest): void {
  checkRateLimit(missKey(req), { max: MISS_MAX, windowMs: MISS_WINDOW_MS });
}

/**
 * Clears the caller's accumulated misses. Called on every successful
 * verification: a real customer verifying proves the caller is the legitimate
 * agent and not an enumerator, so the counter restarts.
 */
export function clearVerifyMisses(req: NextRequest): void {
  resetRateLimit(missKey(req));
}

/**
 * Bearer gate for the integration endpoints. Fail closed when the key is not
 * configured. Constant-time compare on equal-length buffers.
 */
export function requireIntegrationKey(req: NextRequest): NextResponse | null {
  const expected = process.env.INTEGRATION_API_KEY ?? "";
  if (!expected) {
    return jsonError("integration_disabled", "Integration API is not configured.", 503);
  }
  const header = req.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
  if (!ok) return jsonError("unauthorized", "Missing or invalid API key.", 401);
  return null;
}

/** Parse a JSON object body; returns a 400 response on anything else. */
export async function readJson(
  req: NextRequest,
): Promise<Record<string, unknown> | NextResponse> {
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonError("bad_request", "Body must be a JSON object.", 400);
    }
    return body as Record<string, unknown>;
  } catch {
    return jsonError("bad_request", "Body must be valid JSON.", 400);
  }
}

export function isResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}
