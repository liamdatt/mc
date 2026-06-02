"use client";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { Calendar, Users, Package, MapPin } from "lucide-react";
import { Container } from "@/components/primitives/Container";
import { AnimatedNumber } from "@/components/primitives/AnimatedNumber";
import { useReducedMotion } from "@/lib/use-reduced-motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText);
}

type Stat = {
  icon: typeof Calendar;
  value?: number;
  suffix?: string;
  display?: string;
  label: string;
};

const STATS: Stat[] = [
  { icon: Calendar, value: 40, suffix: "+", label: "Years of Excellence" },
  { icon: Users, value: 1000, suffix: "+", label: "Customers Served" },
  { icon: Package, value: 5000, suffix: "+", label: "Products Available" },
  { icon: MapPin, display: "Nationwide", label: "Coverage Across Jamaica" },
];

export function AboutHero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const root = ref.current;
      if (!root) return;
      const title = root.querySelector(".about-title");
      if (!title) return;

      const split = new SplitText(title, { type: "chars" });
      gsap.set(split.chars, { yPercent: 110 });
      gsap.set(".about-sub, .about-lede > *, .about-stat", {
        y: 24,
        opacity: 0,
      });

      const tl = gsap.timeline({ defaults: { ease: "expo.out" }, delay: 0.2 });
      tl.to(split.chars, { yPercent: 0, stagger: 0.03, duration: 0.9 })
        .to(".about-sub", { y: 0, opacity: 1, duration: 0.6 }, "-=0.5")
        .to(
          ".about-lede > *",
          { y: 0, opacity: 1, stagger: 0.1, duration: 0.6 },
          "-=0.4",
        )
        .to(
          ".about-stat",
          { y: 0, opacity: 1, stagger: 0.08, duration: 0.5 },
          "-=0.4",
        );

      return () => split.revert();
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <section ref={ref} className="relative overflow-hidden bg-mec-pure pt-40 pb-24">
      <div aria-hidden className="absolute inset-0 bg-grid opacity-50" />
      <svg
        aria-hidden
        viewBox="0 0 1440 600"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
      >
        <path d="M 700 0 L 1440 360" stroke="#E10600" strokeWidth="2" fill="none" opacity="0.25" />
        <path d="M 900 0 L 1440 200" stroke="#E10600" strokeWidth="2" fill="none" opacity="0.15" />
      </svg>

      <Container>
        <div className="relative grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <h1 className="about-title overflow-hidden font-display-tight text-h1 leading-[0.9]">
              <span role="text">
                ABOUT <span className="text-mec-red">US</span>
              </span>
            </h1>
            <p className="about-sub mt-6 font-display text-[clamp(1.5rem,2.6vw,2.25rem)] leading-tight text-mec-ink">
              Our Legacy. Our Family.
              <br />
              Our Commitment to You.
            </p>
            <span aria-hidden className="mt-6 block h-1 w-16 bg-mec-red" />
            <div className="about-lede mt-8 max-w-xl space-y-5 text-lede text-mec-ink/80">
              <p>
                For over 40 years, Minott Equipment &amp; Chemicals has been
                built on hard work, strong values, and an unwavering commitment
                to our customers.
              </p>
              <p>A family business then, today, and for generations to come.</p>
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:gap-x-4">
            {STATS.map(({ icon: Icon, value, suffix, display, label }) => (
              <li
                key={label}
                className="about-stat flex flex-col items-start border-l border-mec-red/30 pl-4"
              >
                <Icon className="h-7 w-7 text-mec-red" aria-hidden />
                <span className="mt-4 font-display text-[clamp(2rem,3vw,2.75rem)] leading-none text-mec-ink">
                  {display ? (
                    display
                  ) : (
                    <AnimatedNumber to={value ?? 0} suffix={suffix} />
                  )}
                </span>
                <span className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-mec-ink/70">
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
