import { db } from "@/lib/db";
import { getPortalSession } from "@/lib/portal";
import type { HistoryFilters } from "@/lib/portal";

/**
 * Sales-portal read module (reads only). `getSalesSession()` is the gate: a
 * valid BetterAuth session whose user has role="rep" AND an active linked
 * SalesRep. Returns the session + the rep record, or null. Every other helper
 * is scoped to a rep id so a rep can only ever see their own companies/quotes.
 */
export async function getSalesSession() {
  const session = await getPortalSession();
  if (!session || session.user.role !== "rep") return null;
  const rep = await db.salesRep.findUnique({
    where: { userId: session.user.id },
    select: { id: true, name: true, email: true, active: true },
  });
  if (!rep || !rep.active) return null;
  return { session, rep };
}

/** A rep's assigned companies (newest first) with users and quote counts. */
export function getRepCompanies(repId: number) {
  return db.company.findMany({
    where: { salesRepId: repId },
    orderBy: { createdAt: "desc" },
    include: {
      users: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true, phone: true, activatedAt: true },
      },
      _count: {
        select: { users: true, inquiries: { where: { type: "QUOTE" } } },
      },
    },
  });
}

/** One of a rep's companies, or null if not theirs (maps to notFound()). */
export async function getRepCompanyById(repId: number, companyId: number) {
  const company = await db.company.findUnique({
    where: { id: companyId },
    include: {
      users: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true, phone: true, whatsapp: true, activatedAt: true },
      },
    },
  });
  if (!company || company.salesRepId !== repId) return null;
  return company;
}

function buildRepQuoteWhere(repId: number, filters: HistoryFilters) {
  const where: import("@prisma/client").Prisma.InquiryWhereInput = {
    type: "QUOTE",
    companyRef: { salesRepId: repId },
  };
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
  return where;
}

/** A rep's companies' quote inquiries (newest first), filtered. */
export function getRepQuotes(repId: number, filters: HistoryFilters = {}) {
  return db.inquiry.findMany({
    where: buildRepQuoteWhere(repId, filters),
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true } },
      companyRef: { select: { name: true } },
      items: { include: { variant: true } },
      _count: { select: { items: true } },
    },
  });
}

/** The most recent quotes across a rep's companies, for the dashboard feed. */
export function getLatestRepQuotes(repId: number, take = 8) {
  return db.inquiry.findMany({
    where: { type: "QUOTE", companyRef: { salesRepId: repId } },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      user: { select: { name: true } },
      companyRef: { select: { name: true } },
      _count: { select: { items: true } },
    },
  });
}

/** A single quote scoped to the rep, with items + notes, or null if not theirs. */
export async function getRepQuoteById(repId: number, id: number) {
  const quote = await db.inquiry.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      companyRef: { select: { name: true, salesRepId: true } },
      items: { include: { product: { include: { category: true } }, variant: true } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!quote || quote.type !== "QUOTE" || quote.companyRef?.salesRepId !== repId)
    return null;
  return quote;
}

/** Dashboard tile counts for a rep. */
export async function getRepStats(repId: number) {
  const [customers, openQuotes, totalQuotes] = await Promise.all([
    db.company.count({ where: { salesRepId: repId } }),
    db.inquiry.count({
      where: { type: "QUOTE", companyRef: { salesRepId: repId }, status: { not: "CLOSED" } },
    }),
    db.inquiry.count({ where: { type: "QUOTE", companyRef: { salesRepId: repId } } }),
  ]);
  return { customers, openQuotes, totalQuotes };
}
