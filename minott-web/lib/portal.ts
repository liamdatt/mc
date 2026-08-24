import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/portal";

/**
 * Customer-portal read module (mirrors lib/products.ts: reads only — no
 * mutations). Server-side helpers for the BetterAuth session and the signed-in
 * user's quote/inquiry history. Mutations (sign-in/out) live in the client via
 * lib/auth/portal-client.ts; provisioning lives in the MEC admin actions.
 */

/**
 * The signed-in portal session, read server-side from the request cookies.
 * Returns `null` when there is no valid session.
 *
 * Use this in Server Components / the protected layout:
 *   const session = await getPortalSession();
 *   if (!session) redirect("/portal/sign-in");
 * The user object includes the B2B additional fields (phone/whatsapp).
 */
export async function getPortalSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session ?? null;
}

/**
 * Page gate for admin-only portal routes. Signed-out users are handled by the
 * (protected) layout; this redirects signed-in non-admins to their own
 * dashboard instead of an error page.
 */
export async function requireAdminSession() {
  const session = await getPortalSession();
  if (!session || session.user.role !== "admin") redirect("/portal");
  return session;
}

/**
 * Customer inquiry reads are company-scoped: every user at a company shares
 * the same history. Users without a company fall back to their own userId.
 */
export type CustomerScope = { userId: string; companyId: number | null };

export async function getCustomerScope(userId: string): Promise<CustomerScope> {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });
  return { userId, companyId: u?.companyId ?? null };
}

/** The signed-in user's company record (or null). For display + scope in one read. */
export async function getUserCompany(userId: string) {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { company: true },
  });
  return u?.company ?? null;
}

function ownerWhere(
  scope: CustomerScope,
): import("@prisma/client").Prisma.InquiryWhereInput {
  return scope.companyId != null
    ? { companyId: scope.companyId }
    : { userId: scope.userId };
}

/**
 * The latest inquiries belonging to a portal user's scope (newest first), with
 * line items and the linked product (for sample requests) included so the
 * dashboard and history pages can render type / status / date / item count.
 */
export function getUserInquiries(scope: CustomerScope, take = 5) {
  return db.inquiry.findMany({
    where: ownerWhere(scope),
    orderBy: { createdAt: "desc" },
    include: { items: { include: { variant: true } }, product: true, variant: true },
    take,
  });
}

/** Total number of inquiries in a portal user's scope. */
export function getUserInquiryCount(scope: CustomerScope) {
  return db.inquiry.count({ where: ownerWhere(scope) });
}

/** Number of a scope's inquiries of a given type (e.g. QUOTE). */
export function getUserInquiryCountByType(scope: CustomerScope, type: string) {
  return db.inquiry.count({ where: { ...ownerWhere(scope), type } });
}

/**
 * Filters for the portal history listing. All optional; absent filters are
 * ignored. `from`/`to` are inclusive ISO date strings (yyyy-mm-dd) bounding
 * `createdAt`. `categorySlug` matches inquiries that include at least one line
 * item (or sample product) in that category.
 */
export type HistoryFilters = {
  from?: string;
  to?: string;
  type?: string;
  status?: string;
  categorySlug?: string;
};

function buildHistoryWhere(scope: CustomerScope, filters: HistoryFilters) {
  const where: import("@prisma/client").Prisma.InquiryWhereInput = { ...ownerWhere(scope) };

  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;

  if (filters.from || filters.to) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (filters.from) {
      const d = new Date(`${filters.from}T00:00:00`);
      if (!Number.isNaN(d.getTime())) createdAt.gte = d;
    }
    if (filters.to) {
      const d = new Date(`${filters.to}T23:59:59.999`);
      if (!Number.isNaN(d.getTime())) createdAt.lte = d;
    }
    if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;
  }

  if (filters.categorySlug) {
    // Match a quote whose line items reference a product in the category, or a
    // sample request whose product is in the category.
    where.OR = [
      { items: { some: { product: { category: { slug: filters.categorySlug } } } } },
      { product: { category: { slug: filters.categorySlug } } },
    ];
  }

  return where;
}

/**
 * Full, filtered inquiry history for a portal user's scope (newest first),
 * with line items + linked products (and their categories) for category
 * linking and reorder. Used by the history listing and the CSV export.
 */
export function getUserHistory(scope: CustomerScope, filters: HistoryFilters = {}) {
  return db.inquiry.findMany({
    where: buildHistoryWhere(scope, filters),
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: { product: { include: { category: true } }, variant: true },
      },
      product: { include: { category: true } },
      variant: true,
    },
  });
}

/**
 * A single inquiry scoped to its owner. Returns `null` when the inquiry does
 * not exist OR is not owned by the scope (callers map that to `notFound()`).
 */
export async function getUserInquiryById(scope: CustomerScope, id: number) {
  const inquiry = await db.inquiry.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: { include: { category: true } }, variant: true },
      },
      product: { include: { category: true } },
      variant: true,
    },
  });
  if (!inquiry) return null;
  const owned =
    scope.companyId != null
      ? inquiry.companyId === scope.companyId
      : inquiry.userId === scope.userId;
  return owned ? inquiry : null;
}

/** Distinct categories referenced by a scope's inquiries, for the history filter. */
export async function getUserHistoryCategories(scope: CustomerScope) {
  const cats = await db.category.findMany({
    where: {
      products: {
        some: {
          OR: [
            { inquiryItems: { some: { inquiry: ownerWhere(scope) } } },
            { sampleInquiries: { some: ownerWhere(scope) } },
          ],
        },
      },
    },
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
  });
  return cats;
}

/** All customer companies with their users, for the admin management screen. */
export function getPortalCompanies() {
  return db.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      salesRep: { select: { name: true } },
      users: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true, activatedAt: true, banned: true },
      },
      _count: { select: { users: true, inquiries: true } },
    },
  });
}

/** List admin accounts for the /portal/admins management screen. */
export function getAdminUsers() {
  return db.user.findMany({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      activatedAt: true,
      banned: true,
      createdAt: true,
    },
  });
}
