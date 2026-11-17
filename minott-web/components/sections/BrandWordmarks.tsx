// Official partner brand logos, rendered bare in the homepage partner strip
// (TrustBar). Logos are the official client-supplied PNGs in
// /public/brand-logos, trimmed to their ink so heights compare like for like;
// each is sized per brand so they optically balance. TrustBar caps the height.

import Image from "next/image";
import type { ComponentType } from "react";

function ThreeMWordmark() {
  // 3M: bold square mark — keep it compact so it doesn't dwarf the wordmarks.
  return (
    <Image
      src="/brand-logos/3m.png"
      alt="3M"
      width={2308}
      height={1206}
      className="h-9 w-auto object-contain"
    />
  );
}

function SanJamarWordmark() {
  return (
    <Image
      src="/brand-logos/san-jamar.png"
      alt="San Jamar"
      width={864}
      height={180}
      className="h-8 w-auto object-contain"
    />
  );
}

function RubbermaidWordmark() {
  return (
    <Image
      src="/brand-logos/rubbermaid.png"
      alt="Rubbermaid Commercial Products"
      width={544}
      height={271}
      className="h-12 w-auto object-contain"
    />
  );
}

export interface BrandSlot {
  name: string;
  desc: string;
  Wordmark: ComponentType;
}

export const BRAND_SLOTS: BrandSlot[] = [
  { name: "3M", desc: "Safety, PPE, Adhesives", Wordmark: ThreeMWordmark },
  {
    name: "San Jamar",
    desc: "Foodservice & Dispensing",
    Wordmark: SanJamarWordmark,
  },
  {
    name: "Rubbermaid",
    desc: "Carts, Bins, Mop Systems",
    Wordmark: RubbermaidWordmark,
  },
];
