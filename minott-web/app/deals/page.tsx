import type { Metadata } from "next";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { Button } from "@/components/primitives/Button";
import { DealCardView } from "@/components/deals/DealCardView";
import { getAllLiveDeals } from "@/lib/deals";

export const metadata: Metadata = {
  title: "Deals — Minott Chemicals",
  description:
    "Every live deal at Minott Chemicals — premium products, limited-time savings.",
};

export default async function DealsPage() {
  const deals = await getAllLiveDeals();

  return (
    <Section tone="dark" className="pt-40">
      <Container>
        <Eyebrow tone="red">Exclusive Offers</Eyebrow>
        <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95] text-mec-pure">
          All deals.
        </h1>

        {deals.length === 0 ? (
          <div className="mt-16 max-w-xl">
            <p className="text-lede text-mec-pure/70">
              No active deals right now — check back soon.
            </p>
            <div className="mt-8">
              <Button href="/products/all" variant="ghost-dark">
                Browse Products
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {deals.map((deal) => (
              <DealCardView key={deal.id} deal={deal} />
            ))}
          </div>
        )}
      </Container>
    </Section>
  );
}
