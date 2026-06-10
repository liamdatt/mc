"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth/portal";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";

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
 * Provision a portal customer account from the (password-gated) MEC admin.
 *
 * Public sign-up is disabled on the portal auth instance, so accounts are
 * created here via the admin plugin's `auth.api.createUser`. We deliberately
 * call it WITHOUT `headers`: with no request context the admin-plugin endpoint
 * skips its own BetterAuth session/permission check, which lets our existing
 * shared-password admin (not itself a BetterAuth admin) create users. This
 * action is gated by `requireAdmin()` instead.
 */
export async function createCustomer(
  _prev: CreateCustomerState,
  formData: FormData,
): Promise<CreateCustomerState> {
  await requireAdmin();

  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  const name = str(formData, "name");
  const companyName = str(formData, "companyName");
  const phone = str(formData, "phone");
  const whatsapp = str(formData, "whatsapp");
  const salesRepId = parseSalesRepId(formData);
  if (salesRepId === "invalid") return { error: "Invalid sales rep." };

  if (!email) return { error: "Email is required." };
  if (!name) return { error: "Contact name is required." };
  if (password.length < 8)
    return { error: "Temporary password must be at least 8 characters." };

  try {
    await auth.api.createUser({
      body: {
        email,
        password,
        name,
        // role omitted → falls back to the configured defaultRole ("customer").
        // The plugin's createUser typings only allow "user" | "admin" here.
        data: {
          companyName: companyName || undefined,
          phone: phone || undefined,
          whatsapp: whatsapp || undefined,
        },
      },
      // NOTE: no `headers` — see the doc comment above.
    });
  } catch (e) {
    if (e instanceof APIError) {
      const msg = e.message || "";
      if (/already exists|existing/i.test(msg))
        return { error: "A customer with that email already exists." };
      return { error: msg || "Could not create the customer account." };
    }
    throw e;
  }

  // BetterAuth's createUser only handles its declared additional fields, so
  // the relational FK is set directly. Email is unique, so it identifies the
  // user we just created.
  if (salesRepId !== null) {
    await db.user.update({ where: { email }, data: { salesRepId } });
  }

  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/**
 * Update a portal customer's profile (and optionally reset their password)
 * from the MEC admin.
 *
 * Profile fields are written directly via Prisma — BetterAuth's
 * `adminUpdateUser` endpoint sits behind `adminMiddleware`, which requires a
 * BetterAuth session our shared-password admin doesn't have (unlike
 * `createUser`, it has no headerless escape hatch). The password is hashed and
 * stored through `auth.$context`'s internal adapter — the same code path the
 * admin `setUserPassword` endpoint uses — and all of the customer's sessions
 * are revoked so the old credentials stop working immediately.
 */
export async function updateCustomer(
  _prev: CreateCustomerState,
  formData: FormData,
): Promise<CreateCustomerState> {
  await requireAdmin();

  const id = str(formData, "id");
  const email = str(formData, "email").toLowerCase();
  const name = str(formData, "name");
  const password = str(formData, "password");
  const companyName = str(formData, "companyName");
  const phone = str(formData, "phone");
  const whatsapp = str(formData, "whatsapp");
  const salesRepId = parseSalesRepId(formData);
  if (salesRepId === "invalid") return { error: "Invalid sales rep." };

  if (!id) return { error: "Missing customer id." };
  if (!email) return { error: "Email is required." };
  if (!name) return { error: "Contact name is required." };
  if (password && password.length < 8)
    return { error: "New password must be at least 8 characters." };

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
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    )
      return { error: "Customer not found." };
    throw e;
  }

  if (password) {
    const ctx = await auth.$context;
    const hashed = await ctx.password.hash(password);
    await ctx.internalAdapter.updatePassword(id, hashed);
    await ctx.internalAdapter.deleteUserSessions(id);
  }

  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}
