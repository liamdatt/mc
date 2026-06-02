import type { Metadata } from "next";
import { AboutHero } from "@/components/sections/AboutHero";
import { OurStory } from "@/components/sections/OurStory";
import { CompanyValues } from "@/components/sections/CompanyValues";
import { LeadershipTeam } from "@/components/sections/LeadershipTeam";
import { BoardOfDirectors } from "@/components/sections/BoardOfDirectors";
import { LegacyBanner } from "@/components/sections/LegacyBanner";

export const metadata: Metadata = {
  title: "About Us — Minott Equipment & Chemicals Limited",
  description:
    "Our legacy, our family, our commitment. For over 40 years Minott Equipment & Chemicals has supplied Jamaica with quality chemicals, equipment, and janitorial solutions — a family business built on hard work and strong values.",
};

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <OurStory />
      <CompanyValues />
      <LeadershipTeam />
      <BoardOfDirectors />
      <LegacyBanner />
    </>
  );
}
