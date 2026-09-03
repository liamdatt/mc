"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { provisionUser, sendInvite, INVITE_REDIRECT } from "@/lib/auth/provision";
import { normalizeAccountNumber } from "@/lib/customer-match";
import { isParish, APPLICATION_STATUS, MATCH_STATUS } from "@/lib/constants";
import { getPortalSession } from "@/lib/portal";
import { sendInquiryEmails } from "@/lib/email/send-inquiry-emails";

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

type CompanyFieldsResult =
  | { ok: true; data: Prisma.CompanyUncheckedCreateInput & { name: string } }
  | { ok: false; error: string };

/** Parse every Company column from the admin form. Shipping is nulled when "same as billing". */
function companyFields(formData: FormData): CompanyFieldsResult {
  const opt = (key: string) => str(formData, key) || null;
  const acct = str(formData, "mecAccountNumber");
  const shippingSame = formData.get("shippingSame") === "on";

  const billingParish = opt("billingParish");
  const shippingParish = shippingSame ? null : opt("shippingParish");
  if (billingParish && !isParish(billingParish)) return { ok: false, error: "Invalid billing parish." };
  if (shippingParish && !isParish(shippingParish)) return { ok: false, error: "Invalid shipping parish." };

  const limitRaw = str(formData, "creditLimit");
  let creditLimit: Prisma.Decimal | null = null;
  if (limitRaw) {
    const n = Number(limitRaw);
    if (!Number.isFinite(n)) return { ok: false, error: "Credit limit must be a number." };
    if (n < 0) return { ok: false, error: "Credit limit cannot be negative." };
    creditLimit = new Prisma.Decimal(limitRaw);
  }

  return {
    ok: true,
    data: {
      name: str(formData, "name"),
      mecAccountNumber: acct ? normalizeAccountNumber(acct) || null : null,
      industry: opt("industry"),
      location: opt("location"),
      businessType: opt("businessType"),
      inBusinessSince: opt("inBusinessSince"),
      trn: opt("trn"),
      taxExemptionNumber: opt("taxExemptionNumber"),
      billingStreet: opt("billingStreet"),
      billingCity: opt("billingCity"),
      billingParish,
      billingZip: opt("billingZip"),
      shippingStreet: shippingSame ? null : opt("shippingStreet"),
      shippingCity: shippingSame ? null : opt("shippingCity"),
      shippingParish,
      shippingZip: shippingSame ? null : opt("shippingZip"),
      accountingName: opt("accountingName"),
      accountingPhone: opt("accountingPhone"),
      accountingEmail: str(formData, "accountingEmail").toLowerCase() || null,
      sector: opt("sector"),
      creditTerms: opt("creditTerms"),
      creditLimit,
      gctStatus: opt("gctStatus"),
    },
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

  const parsed = companyFields(formData);
  if (!parsed.ok) return { error: parsed.error };
  const fields = parsed.data;
  const salesRepId = parseSalesRepId(formData);
  if (salesRepId === "invalid") return { error: "Invalid sales rep." };
  if (!fields.name) return { error: "Company name is required." };

  const applicationIdRaw = str(formData, "applicationId");
  if (applicationIdRaw) {
    const applicationId = Number(applicationIdRaw);
    if (!Number.isInteger(applicationId)) return { error: "Invalid application." };
    return createCompanyFromApplication(applicationId, fields, salesRepId, {
      contactName: str(formData, "contactName"),
      contactEmail: str(formData, "contactEmail").toLowerCase(),
      contactPhone: str(formData, "contactPhone"),
    });
  }

  const contactName = str(formData, "contactName");
  const contactEmail = str(formData, "contactEmail").toLowerCase();
  const contactPhone = str(formData, "contactPhone");
  if (contactEmail && !contactName)
    return { error: "Contact name is required when inviting a first user." };

  const names = await db.company.findMany({ select: { name: true } });
  if (names.some((c) => c.name.trim().toLowerCase() === fields.name.toLowerCase()))
    return { error: "A company with that name already exists." };

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
    try {
      await db.user.update({
        where: { id: result.userId },
        data: { companyId: company.id },
      });
    } catch {
      return {
        error: `Company created and ${contactEmail} invited, but linking them to the company failed. Add them again from the company page to finish linking.`,
      };
    }
  }

  revalidatePath("/portal/customers");
  redirect(`/portal/customers/${company.id}`);
}

/**
 * Second step of the two-step approval: an admin turns an APPROVED application
 * into a Company + invited principal, and links the original quote. Ordered
 * writes with compensating deletes — no dangling company or user on failure.
 * Caller has already run requireAdmin() and parsed the form.
 */
async function createCompanyFromApplication(
  applicationId: number,
  fields: Prisma.CompanyUncheckedCreateInput & { name: string },
  salesRepId: number | null,
  contact: { contactName: string; contactEmail: string; contactPhone: string },
): Promise<CompanyActionState> {
  const session = await getPortalSession();
  const app = await db.customerApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, status: true, companyId: true, inquiryId: true, email: true },
  });
  if (!app || app.status !== APPLICATION_STATUS.APPROVED || app.companyId !== null)
    return { error: "This application is no longer awaiting account setup." };
  if (!contact.contactName) return { error: "Principal contact name is required." };
  if (contact.contactEmail !== app.email)
    return { error: "The principal's email must match the application. Add other users from the company page afterwards." };

  const existingUser = await db.user.findUnique({ where: { email: app.email }, select: { id: true } });
  if (existingUser)
    return { error: "An account with this email already exists — link it from Customers instead." };

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

  const provisioned = await provisionUser({
    email: app.email,
    name: contact.contactName,
    role: "customer",
    redirectTo: INVITE_REDIRECT.customer,
    data: { phone: contact.contactPhone || undefined },
    skipInvite: true,
  });
  if (!provisioned.ok) {
    await db.company.delete({ where: { id: company.id } }).catch((e) =>
      console.error(`[companies] failed to roll back company ${company.id}:`, e),
    );
    return { error: provisioned.error };
  }
  const userId = provisioned.userId;

  const rollback = async () => {
    await db.user.delete({ where: { id: userId } }).catch((e) =>
      console.error(`[companies] failed to roll back user ${userId}:`, e),
    );
    await db.company.delete({ where: { id: company.id } }).catch((e) =>
      console.error(`[companies] failed to roll back company ${company.id}:`, e),
    );
  };

  try {
    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { companyId: company.id } }),
      db.inquiry.update({
        where: { id: app.inquiryId },
        data: { companyId: company.id, userId, matchStatus: MATCH_STATUS.VERIFIED, matchedCompanyId: null },
      }),
      // Status-guarded: a concurrent create/revert leaves count 0; re-read below catches it.
      db.customerApplication.updateMany({
        where: { id: applicationId, status: APPLICATION_STATUS.APPROVED, companyId: null },
        data: {
          status: APPLICATION_STATUS.ACCOUNT_CREATED,
          companyId: company.id,
          userId,
          accountCreatedAt: new Date(),
          accountCreatedByUserId: session?.user.id ?? null,
        },
      }),
    ]);
  } catch (e) {
    console.error(`[companies] account creation failed for application ${applicationId}:`, e);
    await rollback();
    return { error: "Creating the account failed while linking the quote — nothing was created. Please try again." };
  }

  const done = await db.customerApplication.findUnique({ where: { id: applicationId }, select: { status: true, companyId: true } });
  if (done?.status !== APPLICATION_STATUS.ACCOUNT_CREATED || done.companyId !== company.id) {
    await rollback();
    return { error: "This application was handled by someone else moments ago." };
  }

  // Application is ACCOUNT_CREATED + linked, so the invite hook picks the "approved" copy.
  await sendInvite(app.email, INVITE_REDIRECT.customer);
  after(() => sendInquiryEmails(app.inquiryId, { verifiedNow: true }));

  revalidatePath("/portal/customers");
  revalidatePath("/portal/applications");
  revalidatePath(`/portal/applications/${applicationId}`);
  revalidatePath("/portal/requests");
  revalidatePath("/portal");
  redirect(`/portal/customers/${company.id}`);
}

/** Update a company's account-level fields (admin only). */
export async function updateCompany(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  const parsed = companyFields(formData);
  if (!parsed.ok) return { error: parsed.error };
  const fields = parsed.data;
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

/**
 * Provision + invite an additional portal user under an existing company. If
 * the email already belongs to an unlinked (companyId=null) customer — left
 * behind by an earlier failed link — adopt it into this company instead of
 * hard-failing.
 */
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

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true, role: true, companyId: true, activatedAt: true },
  });
  if (existing) {
    if (existing.role !== "customer" || existing.companyId !== null) {
      return { error: "An account with that email already exists." };
    }
    // Adopt the unlinked customer into this company.
    await db.user.update({
      where: { id: existing.id },
      data: {
        companyId,
        name,
        phone: phone || null,
        whatsapp: whatsapp || null,
      },
    });
    if (!existing.activatedAt) {
      await sendInvite(email, INVITE_REDIRECT.customer);
    }
    revalidatePath(`/portal/customers/${companyId}`);
    return {};
  }

  const result = await provisionUser({
    email,
    name,
    role: "customer",
    redirectTo: INVITE_REDIRECT.customer,
    data: { phone: phone || undefined, whatsapp: whatsapp || undefined },
  });
  if (!result.ok) return { error: result.error };

  try {
    await db.user.update({ where: { id: result.userId }, data: { companyId } });
  } catch {
    return {
      error: `${email} was invited, but linking them to the company failed. Add them again to finish linking.`,
    };
  }

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
      where: { id, role: "customer", companyId },
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
