// Typographic wordmark treatments for partner brands.
//
// Official logo SVG files are not available yet. Each brand gets its own
// distinct treatment (weight / case / color tuned toward the real brand
// identity) inside a consistent chip, rendered as a self-contained component
// per brand slot. When real SVGs arrive, swap the inner JSX of the matching
// component for an <Image src="/brand-logos/<brand>.svg" .../> (or inline SVG)
// without touching the carousel or callers.

import type { ComponentType } from "react";

// Each wordmark renders only its inner mark; the chip/card chrome lives in the
// caller (TrustBar) so spacing and hover behaviour stay consistent.

function ThreeMWordmark() {
  // 3M: heavy, tightly-tracked, brand red.
  return (
    <span className="font-display text-[2.6rem] leading-none tracking-[-0.02em] text-mec-red">
      3M
    </span>
  );
}

function SanJamarWordmark() {
  // San Jamar: clean two-tone body type, deep ink with a red accent dot.
  return (
    <span className="font-body text-2xl font-bold leading-none tracking-tight text-mec-ink">
      San<span className="text-mec-red">Jamar</span>
    </span>
  );
}

function RubbermaidWordmark() {
  // Rubbermaid: bold lowercase, rounded weight, graphite.
  return (
    <span className="font-body text-[1.55rem] font-extrabold lowercase leading-none tracking-[-0.01em] text-mec-graphite">
      rubbermaid
    </span>
  );
}

function PurellWordmark() {
  // Purell: brand blue, uppercase display, wide tracking.
  return (
    <span className="font-display text-[2.1rem] leading-none tracking-[0.04em] text-[#0072CE]">
      PURELL
    </span>
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
