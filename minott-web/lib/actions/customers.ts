"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { provisionUser, sendInvite, INVITE_REDIRECT } from "@/lib/auth/provision";

export type CreateCustomerState = { error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** "" → null (Unassigned); otherwise a positive int or an error sentinel. */
function parseSalesRepId(formData: FormData): number | null | "invalid" {
  const raw = str(formData, "salesRepId");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : "invalid";
}

/**
 * Provision a portal customer from the (password-gated) MEC admin. The customer
 * sets their own password via the emailed invite — no admin-typed credential.
 */
export async function createCustomer(
  _prev: CreateCustomerState,
  formData: FormData,
): Promise<CreateCustomerState> {
  await requireAdmin();

  const email = str(formData, "email").toLowerCase();
  const name = str(formData, "name");
  const companyName = str(formData, "companyName");
  const phone = str(formData, "phone");
  const whatsapp = str(formData, "whatsapp");
  const salesRepId = parseSalesRepId(formData);
  if (salesRepId === "invalid") return { error: "Invalid sales rep." };
  if (!email) return { error: "Email is required." };
  if (!name) return { error: "Contact name is required." };

  const result = await provisionUser({
    email,
    name,
    role: "customer",
    redirectTo: INVITE_REDIRECT.customer,
    data: {
      companyName: companyName || undefined,
      phone: phone || undefined,
      whatsapp: whatsapp || undefined,
    },
  });
  if (!result.ok) return { error: result.error };

  if (salesRepId !== null) {
    try {
      await db.user.update({ where: { email }, data: { salesRepId } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003")
        return {
          error:
            "Customer created & invited, but the selected sales rep no longer exists. Assign one from the customer's edit page.",
        };
      throw e;
    }
  }

  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/**
 * Update a portal customer's profile from the MEC admin. Passwords are no longer
 * set here — use `resendInvite` to send a fresh set-password link instead.
 */
export async function updateCustomer(
  _prev: CreateCustomerState,
  formData: FormData,
): Promise<CreateCustomerState> {
  await requireAdmin();

  const id = str(formData, "id");
  const email = str(formData, "email").toLowerCase();
  const name = str(formData, "name");
  const companyName = str(formData, "companyName");
  const phone = str(formData, "phone");
  const whatsapp = str(formData, "whatsapp");
  const salesRepId = parseSalesRepId(formData);
  if (salesRepId === "invalid") return { error: "Invalid sales rep." };
  if (!id) return { error: "Missing customer id." };
  if (!email) return { error: "Email is required." };
  if (!name) return { error: "Contact name is required." };

  try {
    await db.user.update({
      where: { id },
      data: {
        email,
        name,
        companyName: companyName || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        salesRepId,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e))
      return { error: "Another customer already uses that email." };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025")
      return { error: "Customer not found." };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003")
      return { error: "Selected sales rep no longer exists." };
    throw e;
  }

  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}

export type ResendInviteState = { error?: string; success?: boolean };

/**
 * Re-send the set-password invite to a provisioned user (customer or rep). The
 * redirect portal is derived from the user's role so reps land on /sales.
 */
export async function resendInvite(
  _prev: ResendInviteState,
  formData: FormData,
): Promise<ResendInviteState> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) return { error: "Missing user id." };
  const user = await db.user.findUnique({
    where: { id },
    select: { email: true, role: true },
  });
  if (!user) return { error: "User not found." };
  await sendInvite(
    user.email,
    user.role === "rep" ? INVITE_REDIRECT.sales : INVITE_REDIRECT.customer,
  );
  revalidatePath("/admin/customers");
  revalidatePath("/admin/sales-reps");
  return { success: true };
}
