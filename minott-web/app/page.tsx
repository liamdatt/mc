import { Hero } from "@/components/sections/Hero";
import { TrustBar } from "@/components/sections/TrustBar";
import { ValuePillars } from "@/components/sections/ValuePillars";
import { DualPlay } from "@/components/sections/DualPlay";
import { ProductCategories } from "@/components/sections/ProductCategories";
import { IndustriesGrid } from "@/components/sections/IndustriesGrid";
import { NumbersBar } from "@/components/sections/NumbersBar";
import { FounderStory } from "@/components/sections/FounderStory";
import { QuoteCTA } from "@/components/sections/QuoteCTA";
import { LocationContact } from "@/components/sections/LocationContact";

export default function HomePage() {
  return (
    <>
      <span id="top" className="sr-only" />
      <Hero />
      <TrustBar />
      <ValuePillars />
      <DualPlay />
      <ProductCategories />
      <IndustriesGrid />
      <NumbersBar />
      <FounderStory />
      <QuoteCTA />
      <LocationContact />
    </>
  );
}
