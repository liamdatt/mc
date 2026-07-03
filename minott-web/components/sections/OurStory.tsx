"use client";
import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Users } from "lucide-react";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { AnimatedNumber } from "@/components/primitives/AnimatedNumber";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { useReducedMotion } from "@/lib/use-reduced-motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(DrawSVGPlugin, ScrollTrigger);
}

const MILESTONES = [
  {
    years: 40,
    title: "1984 — A Vision Takes Root",
    body: "Forty years ago, our founder, Chester G. Minott, started Minott Equipment & Chemicals with a clear vision — to provide quality products, exceptional service, and honest relationships. With determination and hard work, he built a company grounded in integrity, reliability, and customer trust.",
    img: "/images/team/previous-ceo.png",
    imgAlt: "Chester G. Minott, founder and previous CEO of Minott Equipment & Chemicals",
  },
  {
    years: 15,
    title: "A New Chapter of Strength",
    body: "Fifteen years ago, [Successor Name] stepped in with courage and vision, taking the reins and leading the company through new challenges. Continuing the legacy, she transformed Minott Equipment & Chemicals into the strong, respected company it is today.",
    img: "/images/team/ceo.jpg",
    imgAlt: "The current CEO of Minott Equipment & Chemicals",
  },
];

export function OurStory() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const root = ref.current;
      if (!root) return;
      const path = root.querySelector<SVGPathElement>(".story-spine path");
      const timeline = root.querySelector(".story-timeline");
      if (!path || !timeline) return;

      gsap.from(path, {
        drawSVG: "0%",
        ease: "none",
        scrollTrigger: {
          trigger: timeline,
          start: "top 75%",
          end: "bottom 65%",
          scrub: 1,
        },
      });
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <Section tone="light" id="our-story">
      <div ref={ref}>
        <Container>
          <div className="flex items-center justify-center gap-6">
            <span aria-hidden className="h-px w-16 bg-mec-red/40" />
            <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] tracking-wide text-mec-ink">
              Our Story
            </h2>
            <span aria-hidden className="h-px w-16 bg-mec-red/40" />
          </div>

          <div className="story-timeline relative mt-16 grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-24">
            <svg
              aria-hidden
              className="story-spine pointer-events-none absolute left-1/2 top-0 hidden h-full w-[3px] -translate-x-1/2 lg:block"
              viewBox="0 0 3 100"
              preserveAspectRatio="none"
            >
              <path d="M1.5 0 L1.5 100" stroke="#E10600" strokeWidth="3" fill="none" />
            </svg>

            {MILESTONES.map((m, i) => (
              <RevealOnScroll
                key={m.title}
                delay={i * 0.12}
                className="relative flex flex-col gap-8"
              >
                <div className="flex items-start gap-6">
                  <div className="shrink-0 text-center">
                    <span className="block font-display text-[clamp(3rem,5vw,4.5rem)] leading-none text-mec-red">
                      <AnimatedNumber to={m.years} />
                    </span>
                    <span className="mt-1 block font-display text-lg tracking-[0.1em] text-mec-ink">
                      Years Ago
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-2xl tracking-wide text-mec-ink">
                      {m.title}
                    </h3>
                    <p className="mt-4 text-base leading-relaxed text-mec-ink/75">
                      {m.body}
                    </p>
                  </div>
                </div>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-mec-mist">
                  <Image
                    src={m.img}
                    alt={m.imgAlt}
                    fill
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-cover object-top"
                  />
                </div>
              </RevealOnScroll>
            ))}

            <div className="absolute left-1/2 top-1/2 hidden h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-mec-red text-mec-pure shadow-lift lg:grid">
              <Users className="h-7 w-7" aria-hidden />
            </div>
          </div>

          <RevealOnScroll className="mx-auto mt-20 max-w-3xl text-center">
            <h3 className="font-display text-[clamp(1.5rem,2.4vw,2rem)] tracking-wide text-mec-red">
              Today &amp; Beyond
            </h3>
            <p className="mt-5 text-lg leading-relaxed text-mec-ink/80">
              As a family, we remain hands-on in every aspect of the business.
              Our success is built not just on the products we provide, but on
              the relationships we build and the values we live by every day.
            </p>
          </RevealOnScroll>
        </Container>
      </div>
    </Section>
  );
}
