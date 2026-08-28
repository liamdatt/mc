import "server-only";
import { db } from "@/lib/db";
import { MATCH_STATUS } from "@/lib/constants";

const REF_RE = /^[A-Za-z0-9_-]{16,64}$/;

/**
 * A guest quote by its opaque ref, with the quote items and any application.
 *
 * Integration-API quotes (`lib/integration/create-quote.ts`) carry a ref even
 * when VERIFIED — the WhatsApp/voice channel needs one for status lookups — so
 * a verified ref must NOT unlock the New Customer Form for an account that
 * already exists. The application branch keeps the other route to VERIFIED
 * working: approving an application flips its inquiry to VERIFIED
 * (`lib/actions/applications.ts`), and /register must still resolve that ref to
 * show the approved/rejected copy.
 */
export async function getInquiryByRef(ref: string | undefined) {
  if (!ref || !REF_RE.test(ref)) return null;
  return db.inquiry.findFirst({
    where: {
      ref,
      OR: [
        { matchStatus: { not: MATCH_STATUS.VERIFIED } },
        { application: { isNot: null } },
      ],
    },
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
