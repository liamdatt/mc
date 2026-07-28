import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Authorization guard for admin-only Server Actions. Server Actions are public
 * HTTP endpoints reachable from ANY route, so the proxy path matcher is not a
 * sufficient gate — every admin mutation must verify the session itself.
 * Redirects to the login page (which aborts the action) when unauthenticated.
 */
export async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const ok = await verifySession(process.env.SESSION_SECRET ?? "", token, "admin");
  if (!ok) redirect("/admin/login");
}
