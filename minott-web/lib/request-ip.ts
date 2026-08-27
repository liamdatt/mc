import { headers } from "next/headers";

/** Best-effort client IP inside Server Actions / Server Components. */
export async function currentRequestIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}
