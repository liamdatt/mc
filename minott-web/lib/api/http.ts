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
