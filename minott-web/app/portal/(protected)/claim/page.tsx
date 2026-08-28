import { redirect } from "next/navigation";
import { after } from "next/server";
import { db } from "@/lib/db";
import { getPortalSession, getCustomerScope } from "@/lib/portal";
import { INQUIRY_TYPE, MATCH_STATUS } from "@/lib/constants";
import { sendInquiryEmails } from "@/lib/email/send-inquiry-emails";

const REF_RE = /^[A-Za-z0-9_-]{16,64}$/;

/**
 * Landing page for the "Sign in" link on a guest quote's POTENTIAL_MATCH
 * panel (`components/quote/QuotePageClient.tsx`). Attaches that specific
 * guest quote to the now-authenticated user's company, then redirects into
 * the portal. Deliberately a page (not a Route Handler): `router.push(next)`
 * in `SignInForm` is a client-side App Router transition, and navigating it
 * to a Route Handler produces a real HTTP redirect that the client follows
 * via `fetch` without updating the address bar — the browser is left
 * showing the sign-in URL even though the destination rendered. A page
 * keeps the transition (and the URL bar) consistent.
 *
 * No `revalidatePath` here: it can only run inside a dispatched Server
 * Function or a Route Handler, not while a Server Component is rendering —
 * calling it here throws "used revalidatePath ... during render" at
 * runtime (a build-time-invisible failure). It would also be a no-op in
 * practice: the root layout is `force-dynamic` and Next's default
 * `staleTimes.dynamic` is 0s (since v15), so there is no client router
 * cache entry for `/portal/requests`, `/portal/history`, or `/portal` left
 * to invalidate — the next visit to any of them always re-renders from the
 * database.
 *
 * Ownership proof: the `ref` is an unguessable opaque token (24 random
 * bytes, `crypto.randomBytes` in `submitQuote`) that only the browser that
 * submitted the guest quote received — combined with a freshly
 * authenticated portal session, holding both is treated as sufficient proof
 * that the signed-in user is the one who submitted that quote. This mirrors
 * the existing `/register?ref=` and `/portal/recover?ref=` flows, which use
 * the same ref as their ownership proof. This page has a side effect on a
 * GET (unavoidable for a redirect-driven "sign in and land here" flow), so
 * whoever holds the ref can trigger an attach inside whichever session
 * happens to hit this URL — mitigated by the ref being unguessable and by
 * this only ever operating on guest (unclaimed) QUOTE rows.
 */
export default async function ClaimGuestQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const session = await getPortalSession();
  // The (protected) layout already guarantees a session exists; this page is
  // customer-only.
  if (!session || session.user.role !== "customer") redirect("/portal");

  const { ref } = await searchParams;
  const refValue = Array.isArray(ref) ? ref[0] : ref;
  if (!refValue || !REF_RE.test(refValue)) redirect("/portal");

  const inquiry = await db.inquiry.findUnique({
    where: { ref: refValue },
    select: { id: true, type: true, companyId: true, userId: true, matchStatus: true },
  });

  if (!inquiry || inquiry.type !== INQUIRY_TYPE.QUOTE) redirect("/portal/history");

  const scope = await getCustomerScope(session.user.id);

  // Already claimed by *someone* — either genuinely someone else's quote
  // (bounce to the list), or this is a second in-flight hit of this same
  // claim link (the App Router can fire more than one request for a single
  // client transition) that raced the first one to the update below. Guard
  // on identity (`userId`/`companyId` set) rather than `companyId` alone —
  // an orphan customer (no `companyId` on their own account) would
  // otherwise never look "claimed" and a repeat hit would re-run the
  // update and re-send the rep notification. `matchStatus === VERIFIED` is
  // an extra belt-and-braces check: this flow only ever claims guest rows.
  const alreadyClaimed =
    inquiry.userId !== null ||
    inquiry.companyId !== null ||
    inquiry.matchStatus === MATCH_STATUS.VERIFIED;

  if (alreadyClaimed) {
    const alreadyOurs =
      inquiry.userId === session.user.id ||
      (scope.companyId !== null && inquiry.companyId === scope.companyId);
    redirect(alreadyOurs ? `/portal/history/${inquiry.id}` : "/portal/history");
  }

  await db.inquiry.update({
    where: { id: inquiry.id },
    data: {
      companyId: scope.companyId,
      userId: session.user.id,
      matchStatus: MATCH_STATUS.VERIFIED,
      matchedCompanyId: null,
    },
  });

  after(() => sendInquiryEmails(inquiry.id, { verifiedNow: true }));

  redirect(`/portal/history/${inquiry.id}`);
}
