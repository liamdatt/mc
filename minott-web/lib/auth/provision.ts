import { randomBytes } from "crypto";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth/portal";
import { db } from "@/lib/db";

/** A random, never-shared password. The invitee sets their own via email. */
function randomPassword(): string {
  return randomBytes(24).toString("hex");
}

export type ProvisionResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

/**
 * Create a BetterAuth portal user with a random password and send the
 * set-password invite. `role` is applied after creation (the admin plugin's
 * createUser typings only allow "user"|"admin"). `redirectTo` decides which
 * portal the set-password link lands on. Never sets a usable password itself.
 */
export async function provisionUser(opts: {
  email: string;
  name: string;
  role: "customer" | "rep" | "admin";
  redirectTo: string;
  data?: { phone?: string; whatsapp?: string };
}): Promise<ProvisionResult> {
  const { email, name, role, redirectTo, data } = opts;
  try {
    await auth.api.createUser({
      body: { email, password: randomPassword(), name, data: data ?? {} },
      // No `headers` — headerless admin escape hatch (see lib/auth/portal.ts).
    });
  } catch (e) {
    if (e instanceof APIError) {
      const msg = e.message || "";
      if (/already exists|existing/i.test(msg))
        return { ok: false, error: "An account with that email already exists." };
      return { ok: false, error: msg || "Could not create the account." };
    }
    throw e;
  }

  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return { ok: false, error: "Account creation did not persist." };

  if (role !== "customer") {
    await db.user.update({ where: { id: user.id }, data: { role } });
  }

  await sendInvite(email, redirectTo);
  return { ok: true, userId: user.id };
}

/**
 * Fire BetterAuth's password-reset flow, which mints a token and calls our
 * `sendResetPassword` hook (the invite email). Used for first invite AND for
 * admin "resend invite". Best-effort — a missing email must not hard-fail the
 * surrounding admin action.
 */
export async function sendInvite(email: string, redirectTo: string): Promise<void> {
  try {
    await auth.api.requestPasswordReset({ body: { email, redirectTo } });
  } catch (e) {
    console.error(`[invite] requestPasswordReset failed for ${email}:`, e);
  }
}

/** Portal-specific set-password landing paths (token is appended by BetterAuth). */
export const INVITE_REDIRECT = {
  customer: "/set-password?portal=customer",
  sales: "/set-password?portal=sales",
  admin: "/set-password?portal=admin",
} as const;
