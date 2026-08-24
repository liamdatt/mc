import type { Metadata } from "next";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { QuotePageClient } from "@/components/quote/QuotePageClient";
import { getPortalSession, getUserCompany } from "@/lib/portal";
import { getLiveDealBadges } from "@/lib/deals";

export const metadata: Metadata = {
  title: "My Quote — Minott Chemicals",
  description:
    "Review the products on your quote list and send them to Minott for a same-day price.",
};

export default async function QuotePage() {
  // Serialize only what the client form needs; the full session object
  // isn't a plain serializable value.
  const session = await getPortalSession();
  const company = session ? await getUserCompany(session.user.id) : null;
  const portalUser = session
    ? {
        name: session.user.name,
        email: session.user.email,
        companyName: company?.name ?? null,
        phone: session.user.phone ?? null,
      }
    : null;

  // Live deal chips for the cart. Nothing is stored client-side: the cart
  // holds ids only, and the labels are looked up fresh on every render.
  // Empty CUSTOM labels are filtered out so we never render a blank chip.
  const badges = (await getLiveDealBadges()).filter((b) => b.label);
  // Rows arrive sorted by sortOrder asc and the lowest sortOrder wins, so
  // build the maps in reverse: earlier rows overwrite later ones.
  const reversed = [...badges].reverse();
  const deals = {
    byVariant: Object.fromEntries(
      reversed
        .filter((b) => b.variantId != null)
        .map((b) => [b.variantId as number, b.label]),
    ),
    byProduct: Object.fromEntries(
      reversed
        .filter((b) => b.variantId == null)
        .map((b) => [b.productId, b.label]),
    ),
  };

  return (
    <Section tone="light" className="pt-40">
      <Container>
        <Eyebrow tone="red">Request a Quote</Eyebrow>
        <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95]">
          Your quote list.
        </h1>
        <p className="mt-8 max-w-2xl text-lede text-mec-ink/80">
          Review your items, add your details, and we&apos;ll price everything
          within one business day.
        </p>
        <div className="mt-12">
          <QuotePageClient portalUser={portalUser} deals={deals} />
        </div>
      </Container>
    </Section>
  );
}
