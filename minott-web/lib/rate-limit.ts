import type { NextRequest } from "next/server";

/**
 * Tiny in-memory fixed-window rate limiter keyed by an arbitrary string (IP, or
 * `bucket:ip` for per-feature limits). Acceptable because the site is
 * deployed as a single long-running Node server (`next start`), so this Map is
 * shared across all requests in the one process. Not suitable for multi-instance
 * deployments — revisit if the app is ever horizontally scaled.
 */
type Bucket = { count: number; resetAt: number };

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60; // per IP per window
const MAX_BUCKETS = 10_000; // hard cap so the Map can't grow unbounded

const buckets = new Map<string, Bucket>();

function prune(now: number): void {
  for (const [ip, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(ip);
  }
}

export function checkRateLimit(
  key: string,
  opts: { max?: number; windowMs?: number } = {},
): { ok: boolean; retryAfter?: number } {
  const max = opts.max ?? MAX_REQUESTS;
  const windowMs = opts.windowMs ?? WINDOW_MS;
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    if (buckets.size >= MAX_BUCKETS) prune(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= max) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { ok: true };
}

/** Best-effort client IP from proxy headers; falls back to a constant. */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
