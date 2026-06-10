import type { Metadata } from "next";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { CsrGallery } from "@/components/sections/CsrGallery";

export const metadata: Metadata = {
  title: "Social Responsibility — Minott Equipment & Chemicals Limited",
  description:
    "Doing right by the people and place that have facilitated our growth — from safer formulations to community investment across Jamaica.",
};

// Alternate heading option: "A Legacy of Service, A Future of Impact"

const PILLARS = [
  {
    title: "Safer Formulations",
    body: "Our earth-friendly chemicals are formulated to be safe for sensitive environments — including daycare facilities and Homes for the Aged — while staying strong enough for restaurants and meeting government specifications for destroying bacteria.",
  },
  {
    title: "Quality & Safety First",
    body: "As a manufacturer of our own line, we hold ourselves to a standard of excellence in how products are made, labelled, and supplied — so the people who use them, and the spaces they clean, stay protected.",
  },
  {
    title: "Rooted in Jamaica",
    body: "We manufacture on-island, employ locally, and serve a loyal client base across the country — investing in the communities that have supported Minott for more than 35 years.",
  },
];

export default function SocialResponsibilityPage() {
  return (
    <>
      {/* Hero / intro section */}
      <Section tone="light" className="pt-40">
        <Container>
          <RevealOnScroll>
            <Eyebrow tone="red">Social Responsibility</Eyebrow>
            <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95]">
              Clean That Cares.
            </h1>
            <p className="mt-8 max-w-2xl text-lede text-mec-ink/80">
              Doing right by the people and place that have facilitated our
              growth is how we do business — from the chemistry we put in the
              bottle to the communities we serve.
            </p>
          </RevealOnScroll>

          {/* CSR pillars */}
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {PILLARS.map((p, i) => (
              <RevealOnScroll key={p.title} delay={i * 0.1}>
                <span aria-hidden className="block h-1 w-12 bg-mec-red" />
                <h2 className="mt-5 font-display-tight text-h3 text-mec-ink">
                  {p.title}
                </h2>
                <p className="mt-3 leading-relaxed text-mec-ink/75">{p.body}</p>
              </RevealOnScroll>
            ))}
          </div>
        </Container>
      </Section>

      {/* Photo gallery of CSR events */}
      <CsrGallery />
    </>
  );
}
