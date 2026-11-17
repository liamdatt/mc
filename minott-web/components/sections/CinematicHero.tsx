"use client";
import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { motion, useScroll, useTransform } from "framer-motion";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { Button } from "@/components/primitives/Button";
import { DealsAnchorButton } from "@/components/sections/DealsAnchorButton";
import { useReducedMotion } from "@/lib/use-reduced-motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText);
}

// Short homepage hero: the Minott warehouse backdrop under a left-to-right ink
// gradient, with the headline vertically centred and lined up with the nav
// logo. Sized so the partner strip and the top of the promo spotlight sit
// above the fold at 1440×900.
export function CinematicHero({ hasDeals }: { hasDeals: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  // Scroll-driven depth: background sinks and swells, content lifts away.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const scaleBg = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const fadeContent = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const yContent = useTransform(scrollYProgress, [0, 0.55], ["0%", "-12%"]);

  // Entrance choreography — masked line reveal, then the supporting cast.
  useGSAP(
    () => {
      if (reduced) return;
      const root = ref.current;
      if (!root) return;
      const heading = root.querySelector(".chero-heading");
      if (!heading) return;

      const split = new SplitText(heading, {
        type: "lines,words",
        linesClass: "overflow-hidden",
      });

      gsap.set(split.words, { yPercent: 112 });
      gsap.set(".chero-eyebrow, .chero-lede, .chero-cta > *", {
        y: 28,
        opacity: 0,
      });
      // The veil ships at CSS opacity 0 (so reduced-motion/no-JS users see the
      // scene); raise it just for the entrance, then fade it away.
      gsap.set(".chero-veil", { opacity: 1 });

      const tl = gsap.timeline({ defaults: { ease: "expo.out" }, delay: 0.35 });

      tl.from(".chero-bg", { scale: 1.22, duration: 2.2, ease: "power2.out" }, 0)
        .to(
          ".chero-veil",
          { opacity: 0, duration: 1.6, ease: "power1.inOut" },
          0,
        )
        .to(".chero-eyebrow", { y: 0, opacity: 1, duration: 0.6 }, 0.25)
        .to(
          split.words,
          { yPercent: 0, stagger: 0.035, duration: 1.0 },
          "-=0.35",
        )
        .to(".chero-lede", { y: 0, opacity: 1, duration: 0.6 }, "-=0.6")
        .to(
          ".chero-cta > *",
          { y: 0, opacity: 1, stagger: 0.08, duration: 0.5 },
          "-=0.35",
        );

      return () => {
        split.revert();
      };
    },
    { scope: ref, dependencies: [reduced] },
  );

  // Pointer parallax on the background only. Reduced-motion gated.
  useGSAP(
    () => {
      if (reduced) return;
      const root = ref.current;
      if (!root) return;

      const xBg = gsap.quickTo(".chero-drift", "x", {
        duration: 1.1,
        ease: "power3.out",
      });
      const yBgDrift = gsap.quickTo(".chero-drift", "y", {
        duration: 1.1,
        ease: "power3.out",
      });
      const onMove = (e: MouseEvent) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        xBg(nx * -26);
        yBgDrift(ny * -16);
      };
      window.addEventListener("mousemove", onMove, { passive: true });
      return () => window.removeEventListener("mousemove", onMove);
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <section
      ref={ref}
      className="relative flex min-h-0 flex-col overflow-hidden bg-mec-ink pb-10 pt-[calc(80px+2.5rem)] text-mec-pure md:min-h-[clamp(440px,58svh,540px)] md:pt-20"
    >
      {/* ── Background: photo → legibility tint → entrance veil ── */}
      <motion.div
        aria-hidden
        style={{ y: yBg, scale: scaleBg }}
        className="absolute inset-0"
      >
        <div className="chero-drift absolute -inset-[3%]">
          <div className="chero-bg relative h-full w-full">
            <Image
              src="/images/hero-minott-warehouse.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-[70%_50%]"
            />
          </div>
        </div>
      </motion.div>

      {/* Flat tint below md (text spans the width); left-to-right gradient above */}
      <div aria-hidden className="absolute inset-0 bg-mec-ink/75 md:hidden" />
      <div
        aria-hidden
        className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(13,13,13,0.96)_0%,rgba(13,13,13,0.88)_32%,rgba(13,13,13,0.45)_58%,rgba(13,13,13,0.05)_100%)] md:block"
      />
      <div aria-hidden className="chero-veil absolute inset-0 bg-mec-ink opacity-0" />

      {/* ── Content ── */}
      <div className="relative z-[2] mx-auto flex w-full max-w-[1440px] flex-1 flex-col justify-center px-6 md:px-10">
        <motion.div
          style={{ opacity: fadeContent, y: yContent }}
          className="max-w-[760px]"
        >
          <p className="chero-eyebrow">
            <Eyebrow tone="white">
              Jamaica&rsquo;s Most Trusted Partner in Clean — Since 1988
            </Eyebrow>
          </p>

          <h1
            role="text"
            className="chero-heading mt-4 font-display-tight text-[clamp(2.5rem,4.6vw,4.25rem)] uppercase leading-[0.95]"
          >
            The premium standard in{" "}
            <span className="text-mec-red">equipment &amp; chemicals.</span>
          </h1>

          <p className="chero-lede mt-4 max-w-[56ch] text-[15px] leading-relaxed text-mec-pure/90 sm:text-[clamp(1rem,1.15vw,1.125rem)]">
            Locally manufactured chemical solutions, backed by world-class
            equipment from 3M, San Jamar and Rubbermaid.
          </p>

          <div className="chero-cta mt-6 flex flex-wrap gap-3 sm:mt-7 sm:gap-4 [&>*]:max-sm:py-3.5">
            {hasDeals ? (
              <DealsAnchorButton>See the Promotions</DealsAnchorButton>
            ) : (
              <Button href="/deals" variant="primary" arrow>
                See the Promotions
              </Button>
            )}
            <Button href="/products" variant="ghost-dark">
              Explore Products
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
