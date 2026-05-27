"use client";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { Eyebrow } from "@/components/primitives/Eyebrow";

export function DualPlay() {
  const [hover, setHover] = useState<"left" | "right" | null>(null);

  const flexLeft =
    hover === "left" ? 1.04 : hover === "right" ? 0.96 : 1;
  const flexRight =
    hover === "right" ? 1.04 : hover === "left" ? 0.96 : 1;

  return (
    <section className="relative flex min-h-[80vh] w-full flex-col overflow-hidden lg:flex-row">
      {/* Left: WE MAKE */}
      <motion.button
        type="button"
        animate={{ flex: flexLeft }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onMouseEnter={() => setHover("left")}
        onMouseLeave={() => setHover(null)}
        className="group relative flex min-h-[60vh] w-full items-end p-10 text-left text-mec-pure md:p-16 lg:min-h-[80vh] lg:w-1/2"
        data-cursor="We Make"
      >
        <Image
          src="/images/dualplay-manufacturing.jpg"
          alt="Inside a chemical manufacturing facility, stainless steel mixing vats and blue 55-gallon drums lined up"
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-mec-ink via-mec-ink/60 to-transparent" />
        <div className="relative max-w-md">
          <Eyebrow tone="white">We Make</Eyebrow>
          <h3 className="mt-4 font-display text-h3 leading-tight">
            Our Own Chemical Line.
          </h3>
          <p className="mt-4 text-sm text-mec-pure/80 md:text-base">
            Industrial and household formulations, mixed at our Kingston
            facility, tuned for Jamaican climate, regulations, and use cases.
          </p>
        </div>
      </motion.button>

      {/* Center red rule */}
      <motion.span
        aria-hidden
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
        className="hidden w-[4px] origin-top bg-mec-red lg:block"
      />

      {/* Right: WE DISTRIBUTE */}
      <motion.button
        type="button"
        animate={{ flex: flexRight }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onMouseEnter={() => setHover("right")}
        onMouseLeave={() => setHover(null)}
        className="group relative flex min-h-[60vh] w-full items-end p-10 text-left text-mec-pure md:p-16 lg:min-h-[80vh] lg:w-1/2 lg:justify-end"
        data-cursor="We Distribute"
      >
        <Image
          src="/images/dualplay-distribution.jpg"
          alt="A clean modern warehouse with palletized cardboard boxes stacked on industrial racking"
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-mec-ink via-mec-ink/50 to-transparent" />
        <div className="relative max-w-md lg:text-right">
          <Eyebrow tone="white">We Distribute</Eyebrow>
          <h3 className="mt-4 font-display text-h3 leading-tight">
            The World&apos;s Best Equipment.
          </h3>
          <p className="mt-4 text-sm text-mec-pure/80 md:text-base">
            Elite Distributor for 3M, NSS, San Jamar, Rubbermaid Commercial,
            and Purell — the brands that set global standards.
          </p>
        </div>
      </motion.button>
    </section>
  );
}
