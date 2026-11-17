"use client";
import { Section } from "@/components/primitives/Section";
import { AnimatedNumber } from "@/components/primitives/AnimatedNumber";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { JamaicaOutline } from "@/components/sections/JamaicaOutline";
import { cn } from "@/lib/cn";

type Stat = {
  label: string;
  sub?: string;
} & (
  | { kind: "number"; value: number; suffix: string; spoken: string; duration?: number }
  | { kind: "map" }
);

const STATS: Stat[] = [
  {
    kind: "number",
    value: 38,
    suffix: "+",
    spoken: "38+",
    label: "Years in business",
    sub: "Incorporated 1988",
  },
  {
    kind: "number",
    value: 2000,
    suffix: "+",
    spoken: "2000+",
    duration: 1.6,
    label: "Stock product lines",
  },
  {
    kind: "number",
    value: 24,
    suffix: "HR",
    spoken: "24 hour",
    label: "Delivery in Kingston",
  },
  { kind: "map", label: "Weekly islandwide delivery" },
];

// The one dark band on the homepage. Figures are white faces with a hard red
// extrusion (.stat-3d / .stat-3d-shape in globals.css), drawn from the same
// glyph so the depth can't misalign.
export function NumbersBar() {
  return (
    <Section
      tone="dark"
      pad={false}
      className="py-16 md:py-20"
      data-section="stats"
    >
      <h2 className="sr-only">MEC at a glance</h2>
      <div className="mx-auto w-full max-w-[1440px] px-6 md:px-10">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4 lg:gap-0">
          {STATS.map((s, i) => (
            <RevealOnScroll
              key={s.label}
              delay={i * 0.08}
              className={cn(
                "min-w-0",
                i >= 2 && "border-t border-mec-pure/12 pt-10 lg:pt-0",
                "lg:border-t-0 lg:px-10",
                i === 0 ? "lg:pl-0" : "lg:border-l lg:border-mec-pure/12",
              )}
            >
              <p className="flex items-baseline pb-2 pr-2 font-display text-[clamp(4rem,7.2vw,7rem)] leading-none tabular-nums text-mec-pure">
                {s.kind === "number" ? (
                  <>
                    <span className="sr-only">{s.spoken}</span>
                    <span aria-hidden>
                      <AnimatedNumber
                        to={s.value}
                        duration={s.duration}
                        className="stat-3d"
                      />
                    </span>
                    <span
                      aria-hidden
                      className="ml-[0.1em] mt-[0.1em] self-start text-[0.45em] text-mec-red"
                    >
                      {s.suffix}
                    </span>
                  </>
                ) : (
                  <>
                    {/* Zero-width strut: gives this row the digits' line box,
                        so the island's bottom sits on their baseline. */}
                    <span aria-hidden className="invisible w-0 overflow-hidden">
                      0
                    </span>
                    <JamaicaOutline className="stat-3d-shape h-[0.72em] w-auto text-mec-pure" />
                  </>
                )}
              </p>
              <p className="mt-6 max-w-[22ch] text-[13px] font-semibold uppercase leading-snug tracking-[0.14em] text-mec-pure">
                {s.label}
              </p>
              {s.sub && (
                <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-mec-pure/55">
                  {s.sub}
                </p>
              )}
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </Section>
  );
}
