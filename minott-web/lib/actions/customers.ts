"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth/portal";
import { requireAdmin } from "@/lib/auth/require-admin";

export type CreateCustomerState = { error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
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

  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}
