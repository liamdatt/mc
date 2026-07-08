// Official partner brand logos, rendered inside the TrustBar carousel chips.
//
// Each brand renders only its inner mark; the chip/card chrome lives in the
// caller (TrustBar) so spacing and hover behaviour stay consistent. Logos are
// the official client-supplied PNGs in /public/brand-logos, sized per brand so
// they optically balance against one another within the shared chip.

import Image from "next/image";
import type { ComponentType } from "react";

function ThreeMWordmark() {
  // 3M: bold square mark — keep it compact so it doesn't dwarf the wordmarks.
  return (
    <Image
      src="/brand-logos/3m.png"
      alt="3M"
      width={3000}
      height={2000}
      className="h-10 w-auto object-contain"
    />
  );
}

function SanJamarWordmark() {
  return (
    <Image
      src="/brand-logos/san-jamar.png"
      alt="San Jamar"
      width={900}
      height={500}
      className="h-12 w-auto object-contain"
    />
  );
}

function RubbermaidWordmark() {
  return (
    <Image
      src="/brand-logos/rubbermaid.png"
      alt="Rubbermaid Commercial Products"
      width={612}
      height={326}
      className="h-14 w-auto object-contain"
    />
  );
}

function PurellWordmark() {
  return (
    <Image
      src="/brand-logos/purell.png"
      alt="Purell"
      width={529}
      height={378}
      className="h-14 w-auto object-contain"
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
  { name: "Purell", desc: "Hand Sanitization", Wordmark: PurellWordmark },
];
