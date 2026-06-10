import { headers } from "next/headers";
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
 * The user object includes the B2B additional fields (companyName/phone/whatsapp).
 */
export async function getPortalSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session ?? null;
}

/**
 * The latest inquiries belonging to a portal user (newest first), with line
 * items and the linked product (for sample requests) included so the dashboard
 * and history pages can render type / status / date / item count.
 */
export function getUserInquiries(userId: string, take = 5) {
  return db.inquiry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: true, product: true },
    take,
  });
}

/** Total number of inquiries a portal user has submitted. */
export function getUserInquiryCount(userId: string) {
  return db.inquiry.count({ where: { userId } });
}

/** Number of a user's inquiries of a given type (e.g. QUOTE). */
export function getUserInquiryCountByType(userId: string, type: string) {
  return db.inquiry.count({ where: { userId, type } });
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

function buildHistoryWhere(userId: string, filters: HistoryFilters) {
  const where: import("@prisma/client").Prisma.InquiryWhereInput = { userId };

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
 * Full, filtered inquiry history for a portal user (newest first), with line
 * items + linked products (and their categories) for category linking and
 * reorder. Used by the history listing and the CSV export.
 */
export function getUserHistory(userId: string, filters: HistoryFilters = {}) {
  return db.inquiry.findMany({
    where: buildHistoryWhere(userId, filters),
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { product: { include: { category: true } } } },
      product: { include: { category: true } },
    },
  });
}

/**
 * A single inquiry scoped to its owner. Returns `null` when the inquiry does
 * not exist OR is not owned by `userId` (callers map that to `notFound()`).
 */
export async function getUserInquiryById(userId: string, id: number) {
  const inquiry = await db.inquiry.findUnique({
    where: { id },
    include: {
      items: { include: { product: { include: { category: true } } } },
      product: { include: { category: true } },
    },
  });
  if (!inquiry || inquiry.userId !== userId) return null;
  return inquiry;
}

/** Distinct categories referenced by a user's inquiries, for the history filter. */
export async function getUserHistoryCategories(userId: string) {
  const cats = await db.category.findMany({
    where: {
      products: {
        some: {
          OR: [
            { inquiryItems: { some: { inquiry: { userId } } } },
            { sampleInquiries: { some: { userId } } },
          ],
        },
      },
    },
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
  });
  return cats;
}

/** List all portal customer accounts for the admin provisioning screen. */
export function getPortalUsers() {
  return db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      companyName: true,
      phone: true,
      whatsapp: true,
      salesRep: { select: { name: true } },
      role: true,
      banned: true,
      createdAt: true,
      _count: { select: { inquiries: true } },
    },
  });
}
