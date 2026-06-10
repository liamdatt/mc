"use client";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

// Approved "Simple" option from client.
// Two alternate options are on file if they want to swap:
//   Option A (Action): "We equip businesses across Jamaica with the chemical,
//     sanitation, and facility products they need to operate clean, safe, and
//     efficient environments — backed by 40 years of expertise."
//   Option B (Legacy): "For over 40 years Minott Equipment & Chemicals has
//     helped Jamaican businesses create cleaner, safer workplaces. Our mission
//     is to keep that legacy alive — one customer, one solution at a time."
const MISSION =
  "To deliver comprehensive chemical, sanitation, and facility solutions that create cleaner, safer, and more productive environments for the businesses and communities we serve.";

export function MissionStatement() {
  return (
    <Section tone="mist" id="mission">
      <Container>
        <RevealOnScroll className="mx-auto max-w-4xl text-center">
          <Eyebrow tone="red" className="justify-center text-sm font-semibold uppercase tracking-[0.2em]">
            Our Mission
          </Eyebrow>
          <p className="mt-8 font-display text-[clamp(1.5rem,3.2vw,2.75rem)] leading-[1.15] tracking-wide text-mec-ink">
            {MISSION}
          </p>
          <span aria-hidden className="mt-10 mx-auto block h-1 w-16 bg-mec-red" />
        </RevealOnScroll>
      </Container>
    </Section>
  );
}
