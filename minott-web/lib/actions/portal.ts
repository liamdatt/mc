"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/portal";
import { db } from "@/lib/db";
import { getPortalSession } from "@/lib/portal";
import { checkRateLimit } from "@/lib/rate-limit";
import { currentRequestIp } from "@/lib/request-ip";

/**
 * Sign the current portal user out and return them to the sign-in page.
 *
 * BetterAuth's `nextCookies()` plugin (last in the plugins list) clears the
 * session cookie automatically when `auth.api.signOut` runs inside a Server
 * Action, so the cookie store does not need to be touched manually.
 */
export async function portalSignOut(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/portal/sign-in");
}

export type ProfileFormState = { error?: string; success?: boolean };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Update the signed-in portal user's personal contact details (the company
 * is admin-managed). Gated on the portal session itself — Server Actions are
 * public endpoints, so the owning user is resolved from the session, never
 * trusted from the form. Email/password are not editable here (managed by
 * MEC staff).
 */
export async function updatePortalProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await getPortalSession();
  if (!session) redirect("/portal/sign-in");

  const name = str(formData, "name");
  if (!name) return { error: "Your name is required." };

  await db.user.update({
    where: { id: session.user.id },
    data: {
      name,
      phone: str(formData, "phone") || null,
      whatsapp: str(formData, "whatsapp") || null,
    },
  });

  revalidatePath("/portal/profile");
  revalidatePath("/portal");
  return { success: true };
}

export type ForgotState = { done?: boolean; error?: string };

/**
 * Self-service password reset for every portal role. Always resolves to the
 * same `done` state whether or not the email exists (no account enumeration).
 * Per-IP limited: 5 requests / 15 min.
 */
export async function requestPasswordResetEmail(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const ip = await currentRequestIp();
  const limit = checkRateLimit(`forgot:${ip}`, { max: 5, windowMs: 15 * 60_000 });
  if (!limit.ok) return { error: "Too many attempts. Please try again later." };

  const email = str(formData, "email").toLowerCase();
  if (!email) return { error: "Email is required." };

  // The role lookup and the reset send both run after the response, so a
  // known address and an unknown one take the same time to answer.
  after(async () => {
    try {
      const user = await db.user.findUnique({ where: { email }, select: { role: true } });
      const portal =
        user?.role === "rep"
          ? "sales"
          : user?.role === "admin" || user?.role === "ar"
            ? "admin"
            : "customer";
      await auth.api.requestPasswordReset({
        body: { email, redirectTo: `/set-password?portal=${portal}&mode=reset` },
      });
    } catch (e) {
      console.error("[forgot] requestPasswordReset failed:", e);
    }
  });
  return { done: true };
}
