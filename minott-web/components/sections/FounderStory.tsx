"use client";
import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { useReducedMotion } from "@/lib/use-reduced-motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText, ScrollTrigger);
}

const PARAS = [
  "Thirty-five years ago, Chester G. Minott opened the doors of a small equipment distribution shop in Kingston with a single conviction: that Jamaican businesses deserved the same caliber of cleaning, sanitation, and chemical supplies as any company in Miami, Atlanta, or Toronto.",
  "That conviction built MEC into Jamaica's largest supplier of chemicals — the country's go-to manufacturer for industrial and household formulations, and the Elite Distributor of choice for 3M, NSS, San Jamar, Rubbermaid Commercial Solutions, and Purell.",
  "Three and a half decades later, we still answer to one standard: the work we deliver should let our clients run their businesses without ever having to think about ours.",
];

export function FounderStory() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const root: HTMLDivElement | null = ref.current;
      if (!root) return;

      const lines = Array.from(root.querySelectorAll<HTMLElement>(".founder-line"));
      const splits = lines.map(
        (el) => new SplitText(el, { type: "lines", linesClass: "split-line" }),
      );
      const allLines = splits.flatMap((s) => s.lines);

      gsap.set(allLines, { yPercent: 110 });
      gsap.set(".founder-image-clip", { clipPath: "inset(0 100% 0 0)" });
      gsap.set(".founder-eyebrow, .founder-h2", { y: 24, opacity: 0 });

      const trigger = ScrollTrigger.create({
        trigger: root,
        start: "top 65%",
        once: true,
        onEnter: () => {
          const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
          tl.to(".founder-image-clip", {
            clipPath: "inset(0 0% 0 0)",
            duration: 1.2,
          })
            .to(
              ".founder-eyebrow, .founder-h2",
              { y: 0, opacity: 1, duration: 0.6, stagger: 0.1 },
              "-=0.8",
            )
            .to(
              allLines,
              { yPercent: 0, duration: 0.8, stagger: 0.05 },
              "-=0.4",
            );
        },
      });

      return () => {
        trigger.kill();
        splits.forEach((s) => s.revert());
      };
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <Section id="founder" tone="light" as="section">
      <div ref={ref}>
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1fr] lg:gap-20">
            <div className="founder-image-wrap relative aspect-[4/5] w-full overflow-hidden rounded-md bg-mec-mist">
              <div className="founder-image-clip absolute inset-0">
                <Image
                  src="/images/founder-portrait.jpg"
                  alt="Portrait of the Minott Chemicals founder inside the company's facility"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-mec-red/15 mix-blend-multiply" />
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <p className="founder-eyebrow">
                <Eyebrow tone="red">The Founder</Eyebrow>
              </p>
              <h2 className="founder-h2 mt-6 font-display-tight text-h2">
                Chester G. Minott started with one truck and a standard.
              </h2>
              <div className="mt-10 space-y-6 text-lg leading-relaxed text-mec-ink/80">
                {PARAS.map((p, i) => (
                  <p key={i} className="founder-line overflow-hidden">
                    {p}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </div>
    </Section>
  );
}
