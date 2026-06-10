import type { Metadata } from "next";
import { IndustriesGrid } from "@/components/sections/IndustriesGrid";
import { TailoredSolutions } from "@/components/sections/TailoredSolutions";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";

export const metadata: Metadata = {
  title: "Solutions — Industries We Serve | Minott Chemicals",
  description:
    "Tailored cleaning, sanitation, and PPE programs for hospitality, medical, manufacturing, financial, telecoms, entertainment, retail, janitorial, and sanitation operations across Jamaica.",
};

export default function SolutionsPage() {
  return (
    <>
      {/* Page hero */}
      <Section tone="light" className="pt-40" pad={false}>
        <Container>
          <Eyebrow tone="red">Solutions</Eyebrow>
          <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95]">
            Built around your industry.
          </h1>
          <p className="mt-8 pb-24 max-w-2xl text-lede text-mec-ink/80">
            We supply a tailored mix of manufactured chemicals and
            elite-distributed equipment to keep every kind of Jamaican operation
            clean, safe, and compliant.
          </p>
        </Container>
      </Section>

      {/* Tailored Solutions — three-card offering segment */}
      <TailoredSolutions />

      {/* Industries grid */}
      <IndustriesGrid />
    </>
  );
}
