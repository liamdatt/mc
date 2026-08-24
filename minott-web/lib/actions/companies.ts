"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { provisionUser, sendInvite, INVITE_REDIRECT } from "@/lib/auth/provision";

export type CompanyActionState = { error?: string };

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

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

function companyFields(formData: FormData) {
  return {
    name: str(formData, "name"),
    mecAccountNumber: str(formData, "mecAccountNumber") || null,
    industry: str(formData, "industry") || null,
    location: str(formData, "location") || null,
  };
}

/**
 * Create a customer company, optionally provisioning + inviting its first
 * portal user. The company is the account: rep assignment lives here, not on
 * the user.
 */
export async function createCompany(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  await requireAdmin();

  const fields = companyFields(formData);
  const salesRepId = parseSalesRepId(formData);
  if (salesRepId === "invalid") return { error: "Invalid sales rep." };
  if (!fields.name) return { error: "Company name is required." };

  const contactName = str(formData, "contactName");
  const contactEmail = str(formData, "contactEmail").toLowerCase();
  const contactPhone = str(formData, "contactPhone");
  if (contactEmail && !contactName)
    return { error: "Contact name is required when inviting a first user." };

  let company;
  try {
    company = await db.company.create({ data: { ...fields, salesRepId } });
  } catch (e) {
    if (isUniqueViolation(e))
      return { error: "Another company already uses that MEC account number." };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003")
      return { error: "Selected sales rep no longer exists." };
    throw e;
  }

  if (contactEmail) {
    const result = await provisionUser({
      email: contactEmail,
      name: contactName,
      role: "customer",
      redirectTo: INVITE_REDIRECT.customer,
      data: { phone: contactPhone || undefined },
    });
    if (!result.ok)
      return {
        error: `Company created, but inviting the first user failed: ${result.error} Add them from the company page.`,
      };
    await db.user.update({
      where: { id: result.userId },
      data: { companyId: company.id },
    });
  }

  revalidatePath("/portal/customers");
  redirect(`/portal/customers/${company.id}`);
}

/** Update a company's account-level fields (admin only). */
export async function updateCompany(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  const fields = companyFields(formData);
  const salesRepId = parseSalesRepId(formData);
  if (!Number.isInteger(id)) return { error: "Missing company id." };
  if (salesRepId === "invalid") return { error: "Invalid sales rep." };
  if (!fields.name) return { error: "Company name is required." };

  try {
    await db.company.update({ where: { id }, data: { ...fields, salesRepId } });
  } catch (e) {
    if (isUniqueViolation(e))
      return { error: "Another company already uses that MEC account number." };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003")
      return { error: "Selected sales rep no longer exists." };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025")
      return { error: "Company not found." };
    throw e;
  }

  revalidatePath("/portal/customers");
  revalidatePath(`/portal/customers/${id}`);
  return {};
}

/** Provision + invite an additional portal user under an existing company. */
export async function addCompanyUser(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  await requireAdmin();

  const companyId = Number(formData.get("companyId"));
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const phone = str(formData, "phone");
  const whatsapp = str(formData, "whatsapp");
  if (!Number.isInteger(companyId)) return { error: "Missing company id." };
  if (!name) return { error: "Contact name is required." };
  if (!email) return { error: "Email is required." };

  const company = await db.company.findUnique({ where: { id: companyId }, select: { id: true } });
  if (!company) return { error: "Company not found." };

  const result = await provisionUser({
    email,
    name,
    role: "customer",
    redirectTo: INVITE_REDIRECT.customer,
    data: { phone: phone || undefined, whatsapp: whatsapp || undefined },
  });
  if (!result.ok) return { error: result.error };

  await db.user.update({ where: { id: result.userId }, data: { companyId } });

  revalidatePath(`/portal/customers/${companyId}`);
  return {};
}

/** Update one portal user's contact details (admin only). */
export async function updateCompanyUser(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  await requireAdmin();

  const id = str(formData, "id");
  const companyId = Number(formData.get("companyId"));
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  if (!id) return { error: "Missing user id." };
  if (!Number.isInteger(companyId)) return { error: "Missing company id." };
  if (!name) return { error: "Contact name is required." };
  if (!email) return { error: "Email is required." };

  try {
    const { count } = await db.user.updateMany({
      where: { id, role: "customer" },
      data: {
        name,
        email,
        phone: str(formData, "phone") || null,
        whatsapp: str(formData, "whatsapp") || null,
      },
    });
    if (count === 0) return { error: "User not found." };
  } catch (e) {
    if (isUniqueViolation(e))
      return { error: "Another account already uses that email." };
    throw e;
  }

  revalidatePath(`/portal/customers/${companyId}`);
  redirect(`/portal/customers/${companyId}`);
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
  revalidatePath("/portal/customers");
  revalidatePath("/portal/sales-reps");
  return { success: true };
}
