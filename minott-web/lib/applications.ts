import "server-only";
import { db } from "@/lib/db";

const REF_RE = /^[A-Za-z0-9_-]{16,64}$/;

/** A guest quote by its opaque ref, with the quote items and any application. */
export async function getInquiryByRef(ref: string | undefined) {
  if (!ref || !REF_RE.test(ref)) return null;
  return db.inquiry.findUnique({
    where: { ref },
    include: { items: true, application: true },
  });
}

export function getApplications() {
  return db.customerApplication.findMany({
    orderBy: { createdAt: "asc" },
    include: { inquiry: { select: { id: true, _count: { select: { items: true } } } } },
  });
}

export function getApplicationById(id: number) {
  return db.customerApplication.findUnique({
    where: { id },
    include: {
      inquiry: { include: { items: true } },
      decidedBy: { select: { name: true } },
      company: { select: { id: true, name: true } },
    },
  });
}

export function getActiveSalesReps() {
  return db.salesRep.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}
