import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal";

/**
 * Authorization guard for admin-only Server Actions. Server Actions are public
 * HTTP endpoints reachable from ANY route, so route-level gates are not a
 * sufficient check — every admin mutation must verify the session itself.
 * Requires a better-auth session with role="admin"; redirects (aborting the
 * action) otherwise.
 */
export async function requireAdmin(): Promise<void> {
  const session = await getPortalSession();
  if (!session || session.user.role !== "admin") redirect("/portal/sign-in");
}

/** Server-Action guard for actions shared by several staff roles. */
export async function requireRole(roles: string[]): Promise<void> {
  const session = await getPortalSession();
  if (!session || !roles.includes(session.user.role ?? "")) redirect("/portal/sign-in");
}
