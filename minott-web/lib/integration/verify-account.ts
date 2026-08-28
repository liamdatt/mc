import "server-only";
import { db } from "@/lib/db";
import { normalizeAccountNumber, normalizeCompanyName } from "@/lib/customer-match";

export type VerifiedCompany = { id: number; name: string; salesRepName: string | null };

/**
 * The MEC account number (printed on every invoice) is the credential: on its
 * own it verifies the account. `companyName` is optional — speech-to-text
 * mangles company names on voice calls, so agents may omit it — but when it IS
 * supplied it must still match (unchanged strictness for callers that send a
 * name). Returns null on any miss. Only the display name and the rep's name
 * leave this function — never the account number, rep contact details,
 * industry, location or users.
 */
export async function verifyAccount(input: {
  mecAccountNumber: string;
  companyName?: string | null;
}): Promise<VerifiedCompany | null> {
  const accountNumber = normalizeAccountNumber(input.mecAccountNumber);
  if (!accountNumber) return null;
  const company = await db.company.findUnique({
    where: { mecAccountNumber: accountNumber },
    select: { id: true, name: true, salesRep: { select: { name: true, active: true } } },
  });
  const claimedName = input.companyName?.trim() ?? "";
  const matched =
    company &&
    (!claimedName || normalizeCompanyName(company.name) === normalizeCompanyName(claimedName));
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
