import type { Metadata } from "next";
import { IndustriesGrid } from "@/components/sections/IndustriesGrid";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";

export const metadata: Metadata = {
  title: "Solutions — Industries We Serve | Minott Chemicals",
  description:
    "Tailored cleaning, sanitation, and PPE programs for hospitality, medical, manufacturing, financial, telecoms, entertainment, retail, janitorial, and sanitation operations across Jamaica.",
};

const INDUSTRIES = [
  { name: "Hospitality", blurb: "Hotels and resorts: housekeeping carts, amenities, paper, and floor care that protect guest experience." },
  { name: "Medical", blurb: "Clinics and hospitals: hospital-grade disinfectants, PPE, and biohazard handling that meet sanitation specs." },
  { name: "Manufacturing", blurb: "Plants and factories: industrial degreasers, floor machines, and safety gear for demanding environments." },
  { name: "Financial", blurb: "Banks and offices: discreet, dependable janitorial supply that keeps institutional spaces immaculate." },
  { name: "Telecoms", blurb: "Data and network facilities: precise, low-residue cleaning for sensitive equipment areas." },
  { name: "Entertainment", blurb: "Venues and theatres: fast turnaround cleaning supplies for high-traffic public spaces." },
  { name: "Retail", blurb: "Stores and malls: nightly maintenance programs that keep sales floors spotless." },
  { name: "Janitorial & Sanitation", blurb: "Contract cleaners: bulk chemicals, equipment, and consumables with island-wide twice-weekly delivery." },
];

export default function SolutionsPage() {
  return (
    <>
      <Section tone="light" className="pt-40">
        <Container>
          <Eyebrow tone="red">Solutions</Eyebrow>
          <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95]">
            Built around your industry.
          </h1>
          <p className="mt-8 max-w-2xl text-lede text-mec-ink/80">
            We supply a tailored mix of manufactured chemicals and
            elite-distributed equipment to keep every kind of Jamaican operation
            clean, safe, and compliant.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {INDUSTRIES.map((i) => (
              <div
                key={i.name}
                className="rounded-md border border-black/10 bg-mec-pure p-6"
              >
                <h2 className="font-display-tight text-h3 text-mec-ink">
                  {i.name}
                </h2>
                <p className="mt-2 text-mec-ink/75">{i.blurb}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>
      <IndustriesGrid />
    </>
  );
}
