"use client";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { AnimatedNumber } from "@/components/primitives/AnimatedNumber";

const STATS = [
  { value: 35, suffix: "+", label: "Years building Jamaica’s clean standard" },
  { value: 15, suffix: "+", label: "Suppliers across the U.S. and China" },
  { value: 5, suffix: "", label: "Global Elite brands under one roof" },
  { value: 8, suffix: "", label: "Jamaican cities with twice-weekly delivery" },
];

export function NumbersBar() {
  return (
    <Section tone="dark">
      <Container>
        <ul className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <li
              key={s.label}
              className={`relative flex flex-col items-start ${
                i < STATS.length - 1
                  ? "lg:border-r lg:border-mec-red/30 lg:pr-8"
                  : ""
              }`}
            >
              <div className="relative">
                <span
                  aria-hidden
                  className="absolute -left-3 -top-3 select-none font-display text-[clamp(6rem,10vw,9rem)] leading-none text-mec-pure/[0.25]"
                  style={{ transform: "scale(1.3)" }}
                >
                  {s.value}
                </span>
                <span className="relative block font-display text-[clamp(4.5rem,7vw,6.5rem)] leading-none text-mec-red">
                  <AnimatedNumber to={s.value} suffix={s.suffix} />
                </span>
              </div>
              <p className="mt-5 max-w-[18ch] text-sm font-semibold uppercase tracking-[0.16em] text-mec-pure/80">
                {s.label}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
