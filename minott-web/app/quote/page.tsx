import type { Metadata } from "next";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { QuotePageClient } from "@/components/quote/QuotePageClient";
import { getPortalSession, getUserCompany } from "@/lib/portal";

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
          <QuotePageClient portalUser={portalUser} />
        </div>
      </Container>
    </Section>
  );
}
