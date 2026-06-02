"use client";
import { Container } from "@/components/primitives/Container";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

export function LegacyBanner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-mec-graphite via-mec-ink to-mec-ink py-24 text-mec-pure">
      <div aria-hidden className="absolute inset-0 bg-grid opacity-20" />
      <Container>
        <RevealOnScroll className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <h2 className="font-display-tight text-[clamp(2rem,4vw,3.5rem)] leading-[1.05]">
            <span className="text-mec-red">Building on our past.</span>
            <br />
            Investing in our future.
          </h2>
          <p className="text-lg leading-relaxed text-mec-pure/75 lg:border-l lg:border-mec-red/30 lg:pl-16">
            We honor the legacy of our founder and the strength of our leaders
            today by continuing to innovate, expand, and deliver exceptional
            value to our customers. The best is yet to come.
          </p>
        </RevealOnScroll>
      </Container>
    </section>
  );
}
