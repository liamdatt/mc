import "server-only";
import { db } from "@/lib/db";
import { normalizeAccountNumber, normalizeCompanyName } from "@/lib/customer-match";

export type VerifiedCompany = { id: number; name: string; salesRepName: string | null };

/**
 * Same rule as `recoverAccount` (SOP §D): the MEC account number AND the company
 * name must both match. Returns null on any miss. Only the display name and the
 * rep's name leave this function — never the account number, rep contact
 * details, industry, location or users.
 */
export async function verifyAccount(input: {
  mecAccountNumber: string;
  companyName: string;
}): Promise<VerifiedCompany | null> {
  const accountNumber = normalizeAccountNumber(input.mecAccountNumber);
  if (!accountNumber) return null;
  const company = await db.company.findUnique({
    where: { mecAccountNumber: accountNumber },
    select: { id: true, name: true, salesRep: { select: { name: true, active: true } } },
  });
  const matched =
    company && normalizeCompanyName(company.name) === normalizeCompanyName(input.companyName);
  if (!matched) {
    console.warn(`[integration] verify miss for ${accountNumber}`);
    return null;
  }
  return {
    id: company.id,
    name: company.name,
    salesRepName: company.salesRep?.active ? company.salesRep.name : null,
  };
}
