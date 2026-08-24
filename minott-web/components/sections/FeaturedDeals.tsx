import Link from "next/link";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { DealCardView } from "@/components/deals/DealCardView";
import { getFeaturedDeals } from "@/lib/deals";

// Homepage teaser for the top-4 live deals, by sortOrder. Renders nothing
// when there are no live deals; the "View all" CTA only shows once there
// are more live deals than fit in the grid.
export async function FeaturedDeals() {
  const { deals, total } = await getFeaturedDeals();
  if (deals.length === 0) return null;

  return (
    <Section tone="dark" id="deals">
      <Container>
        <RevealOnScroll className="text-center">
          <p>
            <Eyebrow tone="red">Exclusive Offers</Eyebrow>
          </p>
          <h2 className="mt-6 font-display-tight text-h2 uppercase text-mec-pure">
            Featured Deals
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lede text-mec-pure/70">
            Premium products. Limited-time savings. Built for performance.
          </p>
        </RevealOnScroll>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {deals.map((deal, i) => (
            <RevealOnScroll key={deal.id} delay={i * 0.05}>
              <DealCardView deal={deal} />
            </RevealOnScroll>
          ))}
        </div>

        {total > 4 && (
          <div className="mt-14 text-center">
            <Link
              href="/deals"
              data-cursor="View"
              className="inline-flex items-center justify-center gap-2 border border-mec-red px-7 py-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-mec-red transition-colors duration-200 hover:bg-mec-red hover:text-mec-pure"
            >
              View All Deals →
            </Link>
          </div>
        )}
      </Container>
    </Section>
  );
}
