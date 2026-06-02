import type { Metadata } from "next";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";

export const metadata: Metadata = {
  title: "Social Responsibility — Minott Chemicals",
  description:
    "Earth-friendly chemicals safe for daycares and Homes for the Aged, a commitment to quality and safety, and support for the Jamaican communities we serve.",
};

const PILLARS = [
  {
    title: "Safer formulations",
    body: "Our earth-friendly chemicals are formulated to be safe for sensitive environments — including daycare facilities and Homes for the Aged — while staying strong enough for restaurants and meeting government specifications for destroying bacteria.",
  },
  {
    title: "Quality & safety first",
    body: "As a manufacturer of our own line, we hold ourselves to a standard of excellence in how products are made, labelled, and supplied — so the people who use them, and the spaces they clean, stay protected.",
  },
  {
    title: "Rooted in Jamaica",
    body: "We manufacture on-island, employ locally, and serve a loyal client base across the country — investing in the communities that have supported Minott for more than 35 years.",
  },
];

export default function SocialResponsibilityPage() {
  return (
    <Section tone="light" className="pt-40">
      <Container>
        <Eyebrow tone="red">Social Responsibility</Eyebrow>
        <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95]">
          Clean that cares.
        </h1>
        <p className="mt-8 max-w-2xl text-lede text-mec-ink/80">
          Doing right by people and place is part of how we do business —
          from the chemistry we put in the bottle to the communities we serve.
        </p>
        {/* CONTENT NOTE: claims below are drawn from the knowledge base and
            third-party directories — confirm with the client before launch. */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title}>
              <span aria-hidden className="block h-1 w-12 bg-mec-red" />
              <h2 className="mt-5 font-display-tight text-h3">{p.title}</h2>
              <p className="mt-3 text-mec-ink/75">{p.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
