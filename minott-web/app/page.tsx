import { CinematicHero } from "@/components/sections/CinematicHero";
import { TrustBar } from "@/components/sections/TrustBar";
import { SourceSpotlight } from "@/components/sections/SourceSpotlight";
import { FeaturedDeals } from "@/components/sections/FeaturedDeals";
import { NumbersBar } from "@/components/sections/NumbersBar";
import { QuoteCTA } from "@/components/sections/QuoteCTA";
import { VisitShowroom } from "@/components/sections/VisitShowroom";
import { getSpotlightDeal } from "@/lib/deals";

// Landing, top to bottom: short photo hero, static partner strip, "#1 Source"
// intro + promo spotlight, light featured-deals grid, the one dark stats band,
// the red quote CTA, and the showroom block; the footer comes from the shared
// chrome. Sized so the promo card starts above the fold at 1440×900.
// Deliberately no pinned/scroll-hijacking sections (client request).
export default async function HomePage() {
  // FeaturedDeals renders nothing without live deals, so the hero's
  // "See the Promotions" only targets #deals when that section exists.
  const hasDeals = (await getSpotlightDeal()) !== null;

  return (
    <>
      <span id="top" className="sr-only" />
      <CinematicHero hasDeals={hasDeals} />
      <TrustBar />
      <SourceSpotlight />
      <FeaturedDeals />
      <NumbersBar />
      <QuoteCTA />
      <VisitShowroom />
    </>
  );
}
