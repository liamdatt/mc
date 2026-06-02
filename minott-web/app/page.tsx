import { Hero } from "@/components/sections/Hero";
import { TrustBar } from "@/components/sections/TrustBar";
import { DualPlay } from "@/components/sections/DualPlay";
import { ProductCategories } from "@/components/sections/ProductCategories";
import { NumbersBar } from "@/components/sections/NumbersBar";
import { QuoteCTA } from "@/components/sections/QuoteCTA";

export default function HomePage() {
  return (
    <>
      <span id="top" className="sr-only" />
      <Hero />
      <TrustBar />
      <DualPlay />
      <ProductCategories />
      <NumbersBar />
      <QuoteCTA />
    </>
  );
}
