"use server";

import { after } from "next/server";
import { db } from "@/lib/db";
import { sendInvite } from "@/lib/auth/provision";
import { normalizeAccountNumber, normalizeCompanyName } from "@/lib/customer-match";
import { checkRateLimit } from "@/lib/rate-limit";
import { currentRequestIp } from "@/lib/request-ip";
import { sendInquiryEmails } from "@/lib/email/send-inquiry-emails";
import { MATCH_STATUS } from "@/lib/constants";

export type RecoverState = { done?: boolean; error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Account recovery gated on the MEC account number (spec §7). Constant
 * response on hit and miss; never reveals which email(s) were contacted.
 * On a hit, reset links go to every active customer user of the company
 * (max 10) and, when a guest quote `ref` is supplied, that quote is stamped
 * as belonging to the company (Status 1 — Verified).
 */
export async function recoverAccount(
  _prev: RecoverState,
  formData: FormData,
): Promise<RecoverState> {
  const ip = await currentRequestIp();
  const limit = checkRateLimit(`recover:${ip}`, { max: 5, windowMs: 15 * 60_000 });
  if (!limit.ok) return { error: "Too many attempts. Please try again later." };

  const companyName = str(formData, "companyName");
  const accountRaw = str(formData, "accountNumber");
  const ref = str(formData, "ref");
  if (!companyName) return { error: "Company name is required." };
  if (!accountRaw) return { error: "MEC account number is required." };

  const accountNumber = normalizeAccountNumber(accountRaw);
  const company = await db.company.findUnique({
    where: { mecAccountNumber: accountNumber },
    select: { id: true, name: true },
  });
  const matched =
    company && normalizeCompanyName(company.name) === normalizeCompanyName(companyName);

  if (!matched) {
    console.warn(`[recover] no match for account ${accountNumber} from ${ip}`);
    return { done: true };
  }

  // Everything slow (email fan-out, quote stamping) runs after the response
  // so a hit and a miss are indistinguishable by timing (spec §7).
  after(async () => {
    try {
      const cooldown = checkRateLimit(`recover-co:${company.id}`, {
        max: 1,
        windowMs: 60 * 60_000,
      });
      if (!cooldown.ok) {
        console.warn(
          `[recover] company ${company.id} is within its 1/hour cooldown — skipping invite fan-out`,
        );
      } else {
        const users = await db.user.findMany({
          where: { companyId: company.id, role: "customer", NOT: { banned: true } },
          orderBy: { createdAt: "asc" },
          take: 10,
          select: { email: true },
        });
        for (const u of users) {
          await sendInvite(u.email, "/set-password?portal=customer&mode=reset");
        }
      }

      if (ref) {
        const quote = await db.inquiry.findUnique({
          where: { ref },
          select: { id: true, type: true, companyId: true },
        });
        if (quote && quote.type === "QUOTE" && quote.companyId === null) {
          await db.inquiry.update({
            where: { id: quote.id },
            data: {
              companyId: company.id,
              matchStatus: MATCH_STATUS.VERIFIED,
              matchedCompanyId: null,
            },
          });
          await sendInquiryEmails(quote.id, { verifiedNow: true });
        }
      }
    } catch (e) {
      console.error("[recover] post-response work failed:", e);
    }
  });

  return { done: true };
}
