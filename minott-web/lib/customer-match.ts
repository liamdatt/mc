import "server-only";
import { db } from "@/lib/db";
import {
  normalizeEmail,
  normalizePhone,
  phoneKey,
  normalizeCompanyName,
  normalizeAccountNumber,
} from "@/lib/customer-match-normalize";

/**
 * Guest-submission matching engine (spec §4). Compares a guest's submitted
 * email / phone / company name against PORTAL records only (customer users +
 * companies). Never exposes what matched to the guest — the matchedCompanyId
 * hint is for admins.
 */
export type MatchStatus = "VERIFIED" | "POTENTIAL_MATCH" | "NO_MATCH";
export type MatchResult = {
  status: Exclude<MatchStatus, "VERIFIED">;
  matchedCompanyId: number | null;
};

export {
  normalizeEmail,
  normalizePhone,
  phoneKey,
  normalizeCompanyName,
  normalizeAccountNumber,
};

export async function matchGuest(input: {
  email: string;
  phone: string;
  company: string;
}): Promise<MatchResult> {
  // 1) email
  const email = normalizeEmail(input.email);
  if (email) {
    const byEmail = await db.user.findFirst({
      where: { email, role: "customer" },
      select: { companyId: true },
    });
    if (byEmail) return { status: "POTENTIAL_MATCH", matchedCompanyId: byEmail.companyId };
  }

  // 2) phone (JS compare — SQLite can't normalise phones in-query)
  const key = phoneKey(input.phone);
  if (key) {
    const users = await db.user.findMany({
      where: { role: "customer", OR: [{ phone: { not: null } }, { whatsapp: { not: null } }] },
      select: { companyId: true, phone: true, whatsapp: true },
    });
    const hit = users.find((u) => phoneKey(u.phone) === key || phoneKey(u.whatsapp) === key);
    if (hit) return { status: "POTENTIAL_MATCH", matchedCompanyId: hit.companyId };
  }

  // 3) company name
  const name = normalizeCompanyName(input.company);
  if (name) {
    const companies = await db.company.findMany({ select: { id: true, name: true } });
    const hit = companies.find((c) => normalizeCompanyName(c.name) === name);
    if (hit) return { status: "POTENTIAL_MATCH", matchedCompanyId: hit.id };
  }

  return { status: "NO_MATCH", matchedCompanyId: null };
}
