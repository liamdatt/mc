import { CinematicHero } from "@/components/sections/CinematicHero";
import { TrustBar } from "@/components/sections/TrustBar";
import { NumbersBar } from "@/components/sections/NumbersBar";
import { LegacyBanner } from "@/components/sections/LegacyBanner";
import { QuoteCTA } from "@/components/sections/QuoteCTA";

// Landing: a cinematic scroll experience — full-screen dark hero, distributor
// carousel, count-up stats, then the shared legacy + CTA closers. Deliberately
// no pinned/scroll-hijacking sections (client request).
export default function HomePage() {
  return (
    <>
      <span id="top" className="sr-only" />
      <CinematicHero />
      <TrustBar />
      <NumbersBar />
      <LegacyBanner />
      <QuoteCTA />
    </>
  );
}
