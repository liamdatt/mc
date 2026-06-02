import type { Metadata } from "next";
import { FounderStory } from "@/components/sections/FounderStory";
import { DualPlay } from "@/components/sections/DualPlay";
import { NumbersBar } from "@/components/sections/NumbersBar";
import { TrustBar } from "@/components/sections/TrustBar";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";

export const metadata: Metadata = {
  title: "About Us — Minott Equipment & Chemicals Limited",
  description:
    "Founded by Chester G. Minott over 35 years ago, MEC is Jamaica's dual-play manufacturer of chemicals and Elite Distributor for the world's leading cleaning brands.",
};

export default function AboutPage() {
  return (
    <>
      <Section tone="light" className="pt-40">
        <Container>
          <Eyebrow tone="red">About Minott</Eyebrow>
          <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95]">
            35+ years keeping Jamaica clean.
          </h1>
          <p className="mt-8 max-w-2xl text-lede text-mec-ink/80">
            Minott Equipment &amp; Chemicals Limited began over 35 years ago as a
            cleaning-equipment distributor. Today we are both a manufacturer of
            our own extensive chemical line and the Elite Distributor for 3M,
            NSS, San Jamar, Rubbermaid Commercial, and Purell.
          </p>
        </Container>
      </Section>
      <FounderStory />
      <DualPlay />
      <NumbersBar />
      <TrustBar />
    </>
  );
}
