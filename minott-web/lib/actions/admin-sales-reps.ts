"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { provisionUser, INVITE_REDIRECT } from "@/lib/auth/provision";

export type SalesRepFormState = { error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function buildData(formData: FormData) {
  return {
    name: str(formData, "name"),
    email: str(formData, "email").toLowerCase(),
    phone: str(formData, "phone") || null,
    active: formData.get("active") !== null,
  };
}

/**
 * Create a sales rep: a directory record PLUS a portal login (role="rep") that
 * receives a set-password invite. Email is required — it's the invite address.
 */
export async function createSalesRep(
  _prev: SalesRepFormState,
  formData: FormData,
): Promise<SalesRepFormState> {
  await requireAdmin();
  const data = buildData(formData);
  if (!data.name) return { error: "Name is required." };
  if (!data.email) return { error: "Email is required (used to send the portal invite)." };

  const result = await provisionUser({
    email: data.email,
    name: data.name,
    role: "rep",
    redirectTo: INVITE_REDIRECT.sales,
  });
  if (!result.ok) return { error: result.error };

  try {
    // Single write links the login and the directory record atomically.
    await db.salesRep.create({ data: { ...data, userId: result.userId } });
  } catch (e) {
    // Compensate: remove the login we just created so the admin retries cleanly
    // (BetterAuth can't join a Prisma transaction, so this is manual).
    await db.user
      .delete({ where: { id: result.userId } })
      .catch((err) => console.error(`[sales-rep] failed to roll back user ${result.userId}:`, err));
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { error: "Another account already uses that email." };
    throw e;
  }

  revalidatePath("/admin/sales-reps");
  redirect("/admin/sales-reps");
}

export async function updateSalesRep(
  _prev: SalesRepFormState,
  formData: FormData,
): Promise<SalesRepFormState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { error: "Invalid sales rep id." };
  const data = buildData(formData);
  if (!data.name) return { error: "Name is required." };
  if (!data.email) return { error: "Email is required." };

  const existing = await db.salesRep.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!existing) return { error: "Sales rep not found." };

  try {
    await db.$transaction(async (tx) => {
      await tx.salesRep.update({ where: { id }, data });
      // Keep the linked login's name/email in sync with the directory record.
      if (existing.userId) {
        await tx.user.update({
          where: { id: existing.userId },
          data: { name: data.name, email: data.email },
        });
      }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025")
      return { error: "Sales rep not found." };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { error: "Another account already uses that email." };
    throw e;
  }

  // Legacy reps created before portal logins existed have no linked account.
  // Saving them now provisions a login + sends the set-password invite.
  if (!existing.userId) {
    const result = await provisionUser({
      email: data.email,
      name: data.name,
      role: "rep",
      redirectTo: INVITE_REDIRECT.sales,
    });
    if (!result.ok) {
      revalidatePath("/admin/sales-reps");
      return { error: `Rep saved, but the portal login could not be created: ${result.error}` };
    }
    await db.salesRep.update({ where: { id }, data: { userId: result.userId } });
  }

  revalidatePath("/admin/sales-reps");
  revalidatePath("/admin/customers");
  redirect("/admin/sales-reps");
}

/**
 * Delete a rep: removes the directory record AND its login account (their
 * clients are un-assigned via User.salesRepId SetNull; the rep-account FK is
 * SetNull, so we delete the login explicitly).
 */
export async function deleteSalesRep(
  _prev: SalesRepFormState,
  formData: FormData,
): Promise<SalesRepFormState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { error: "Invalid sales rep id." };
  const rep = await db.salesRep.findUnique({
    where: { id },
    select: { userId: true },
  });
  await db.salesRep.delete({ where: { id } });
  if (rep?.userId) {
    // Cascades delete the rep's sessions/accounts too.
    await db.user.delete({ where: { id: rep.userId } }).catch((e) =>
      console.error(`[sales-rep] failed to delete login for rep ${id}:`, e),
    );
  }
  revalidatePath("/admin/sales-reps");
  revalidatePath("/admin/customers");
  return {};
}
