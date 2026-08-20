"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { getPortalSession } from "@/lib/portal";
import { provisionUser, sendInvite, INVITE_REDIRECT } from "@/lib/auth/provision";

export type CreateAdminState = { error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Provision a new admin account; they set their password via the invite. */
export async function createAdmin(
  _prev: CreateAdminState,
  formData: FormData,
): Promise<CreateAdminState> {
  await requireAdmin();
  const email = str(formData, "email").toLowerCase();
  const name = str(formData, "name");
  if (!email) return { error: "Email is required." };
  if (!name) return { error: "Name is required." };

  const result = await provisionUser({
    email,
    name,
    role: "admin",
    redirectTo: INVITE_REDIRECT.admin,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/portal/admins");
  redirect("/portal/admins");
}

/** Re-send the set-password invite to a pending (or locked-out) admin. */
export async function resendAdminInvite(formData: FormData): Promise<void> {
  await requireAdmin();
  const email = str(formData, "email").toLowerCase();
  if (email) await sendInvite(email, INVITE_REDIRECT.admin);
  revalidatePath("/portal/admins");
}

/**
 * Deactivate/reactivate an admin via better-auth's `banned` flag (the admin
 * plugin refuses sign-in for banned users). Direct DB write instead of the
 * plugin's banUser endpoint (which wants an admin session's headers), so we
 * also revoke live sessions ourselves. Guards: no self-deactivation, and the
 * last active admin can't be deactivated.
 */
export async function setAdminActive(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = str(formData, "userId");
  const makeActive = str(formData, "active") === "true";
  if (!userId) return;

  if (!makeActive) {
    const session = await getPortalSession();
    if (session?.user.id === userId) return; // never deactivate yourself
    const activeAdmins = await db.user.count({
      where: { role: "admin", NOT: { banned: true }, activatedAt: { not: null } },
    });
    const target = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, banned: true, activatedAt: true },
    });
    if (!target || target.role !== "admin") return;
    const targetIsActive = !target.banned && target.activatedAt !== null;
    if (targetIsActive && activeAdmins <= 1) return; // keep at least one
  }

  await db.user.update({
    where: { id: userId },
    data: { banned: !makeActive, banReason: null, banExpires: null },
  });
  if (!makeActive) {
    await db.session.deleteMany({ where: { userId } });
  }
  revalidatePath("/portal/admins");
}
