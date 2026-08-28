import { timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

/** Success envelope: `{ data: ... }`. */
export function jsonData(data: unknown): NextResponse {
  return NextResponse.json({ data });
}

/** Error envelope: `{ error, message }` with a status code. */
export function jsonError(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ error: code, message }, { status });
}

/**
 * Returns a 429 response if the caller is over the limit, otherwise null.
 * Call at the top of every route handler: `const limited = enforceRateLimit(req); if (limited) return limited;`
 */
export function enforceRateLimit(req: NextRequest): NextResponse | null {
  const ip = clientIp(req);
  const { ok, retryAfter } = checkRateLimit(ip);
  if (ok) return null;
  console.warn(`[api] rate limit exceeded for ${ip}`);
  return NextResponse.json(
    { error: "rate_limited", message: "Too many requests. Please slow down." },
    { status: 429, headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined },
  );
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
