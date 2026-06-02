import { Hero } from "@/components/sections/Hero";
import { TrustBar } from "@/components/sections/TrustBar";

// Single-screen, non-scrollable landing: Hero + distributor carousel only.
export default function HomePage() {
  return (
    <div className="flex h-[100svh] flex-col overflow-hidden">
      <span id="top" className="sr-only" />
      <Hero />
      <TrustBar />
    </div>
  );
}
