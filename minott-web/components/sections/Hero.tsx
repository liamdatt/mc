"use client";
import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { motion, useScroll, useTransform } from "framer-motion";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { Button } from "@/components/primitives/Button";
import { Shield, Truck, Headphones } from "lucide-react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText, DrawSVGPlugin);
}

const TRUST_ITEMS = [
  { icon: Shield, label: "Quality Products" },
  { icon: Truck, label: "Reliable Supply" },
  { icon: Headphones, label: "Expert Support" },
];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yImg = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const scaleImg = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const fadeText = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  useGSAP(
    () => {
      if (reduced) return;
      const root = ref.current;
      if (!root) return;
      const line1 = root.querySelector(".hero-line-1");
      const line2 = root.querySelector(".hero-line-2");
      if (!line1 || !line2) return;

      const s1 = new SplitText(line1, { type: "chars" });
      const s2 = new SplitText(line2, { type: "chars" });

      gsap.set([s1.chars, s2.chars], { yPercent: 110 });
      gsap.set(".hero-eyebrow, .hero-lede, .hero-cta > *", {
        y: 24,
        opacity: 0,
      });
      gsap.set(".hero-trust > *", { y: 12, opacity: 0 });
      gsap.set(".hero-image-clip", { clipPath: "inset(0 0 100% 0)" });

      const tl = gsap.timeline({
        defaults: { ease: "expo.out" },
        delay: 0.3,
      });

      tl.to(".hero-eyebrow", { y: 0, opacity: 1, duration: 0.6 })
        .to(s1.chars, { yPercent: 0, stagger: 0.025, duration: 0.9 }, "-=0.3")
        .to(s2.chars, { yPercent: 0, stagger: 0.025, duration: 0.9 }, "-=0.7")
        .to(".hero-lede", { y: 0, opacity: 1, duration: 0.6 }, "-=0.5")
        .to(
          ".hero-cta > *",
          { y: 0, opacity: 1, stagger: 0.08, duration: 0.5 },
          "-=0.3",
        )
        .to(
          ".hero-trust > *",
          { y: 0, opacity: 1, stagger: 0.06, duration: 0.4 },
          "-=0.3",
        )
        .from(
          ".hero-sweep path",
          { drawSVG: "0%", duration: 1.4, ease: "power2.inOut" },
          0,
        )
        .to(
          ".hero-image-clip",
          { clipPath: "inset(0 0 0% 0)", duration: 1.2 },
          0.2,
        )
        .from(
          ".hero-image",
          { scale: 1.18, duration: 1.6, ease: "power2.out" },
          0.2,
        );

      return () => {
        s1.revert();
        s2.revert();
      };
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <section
      ref={ref}
      className="relative min-h-[100svh] overflow-hidden bg-mec-pure"
    >
      {/* Background grid */}
      <div aria-hidden className="absolute inset-0 bg-grid opacity-60" />

      {/* Diagonal sweep across the boundary */}
      <svg
        aria-hidden
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        className="hero-sweep pointer-events-none absolute inset-0 h-full w-full"
      >
        <path
          d="M 0 760 L 1440 200"
          stroke="#E10600"
          strokeWidth="3"
          fill="none"
        />
      </svg>

      <div className="relative mx-auto grid min-h-[100svh] w-full max-w-[1440px] grid-cols-1 items-center gap-12 px-6 pt-32 pb-24 md:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <motion.div style={{ opacity: fadeText }} className="relative z-[2]">
          <p className="hero-eyebrow">
            <Eyebrow tone="red">
              Jamaica&apos;s Most Trusted Partner in Clean — Since 1990
            </Eyebrow>
          </p>

          <h1 className="mt-8 font-display-tight text-[clamp(3.5rem,8vw,7.5rem)] leading-[0.92]">
            <span className="hero-line-1 block overflow-hidden text-mec-ink">
              CLEANER SPACES.
            </span>
            <span className="hero-line-2 block overflow-hidden text-mec-red">
              STRONGER BUSINESS.
            </span>
          </h1>

          <p className="hero-lede mt-8 max-w-[52ch] text-[clamp(1.125rem,1.4vw,1.375rem)] leading-relaxed text-mec-ink/80">
            We power clean, safe, and productive spaces across Jamaica — with
            manufactured-on-island chemicals and elite-distributed equipment
            from 3M, NSS, San Jamar, Rubbermaid Commercial, and Purell.
          </p>

          <div className="hero-cta mt-10 flex flex-wrap items-center gap-4">
            <Button href="#contact" variant="primary" arrow>
              Request a Quote
            </Button>
            <Button href="#products" variant="ghost">
              See Our Products
            </Button>
          </div>

          <ul className="hero-trust mt-12 flex flex-wrap gap-x-8 gap-y-4">
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-mec-ink/70"
              >
                <Icon className="h-4 w-4 text-mec-red" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="hero-image-wrapper relative h-[480px] w-full overflow-hidden rounded-md md:h-[600px] lg:h-[680px]">
          <div className="hero-image-clip absolute inset-0 overflow-hidden">
            <motion.div
              style={{ y: yImg, scale: scaleImg }}
              className="hero-image relative h-full w-full"
            >
              <Image
                src="/images/hero-main.jpg"
                alt="A worker pushes a Rubbermaid commercial cleaning cart down a warehouse aisle with a wet-floor caution sign in foreground"
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </motion.div>
          </div>

          {/* Floating Elite Distributor card */}
          <div className="absolute bottom-6 left-6 right-6 z-[2] flex items-center gap-3 rounded-md border border-white/15 bg-white/10 px-5 py-3 text-mec-pure backdrop-blur-lg md:bottom-8 md:left-8 md:right-auto">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-mec-red text-sm font-bold">
              ★
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">
                Elite Distributor
              </p>
              <p className="text-sm font-semibold">
                3M · NSS · San Jamar · Rubbermaid · Purell
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        aria-hidden
        className="absolute bottom-6 left-1/2 z-[2] flex -translate-x-1/2 flex-col items-center gap-2 text-mec-ink/50"
      >
        <span className="font-display text-xs tracking-[0.3em]">SCROLL</span>
        <span className="block h-10 w-px animate-[scrollLine_2s_ease-in-out_infinite] bg-mec-ink/40" />
      </div>

    </section>
  );
}
