"use client";
import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { motion, useScroll, useTransform } from "framer-motion";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { Button } from "@/components/primitives/Button";
import { Shield, Truck, Headphones } from "lucide-react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText);
}

const TRUST_ITEMS = [
  { icon: Shield, label: "Quality Products" },
  { icon: Truck, label: "Reliable Supply" },
  { icon: Headphones, label: "Expert Support" },
];

// Deterministic pseudo-random particle field (index-derived so SSR markup is
// stable). Tiny red/white motes that drift in the warehouse haze.
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  left: `${((i * 53) % 94) + 3}%`,
  top: `${((i * 37) % 76) + 10}%`,
  size: 2 + (i % 3),
  red: i % 4 === 0,
}));

export function CinematicHero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  // Scroll-driven depth: background sinks and swells, content lifts away.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const scaleBg = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
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
      gsap.set(".chero-trust > *, .chero-chip", {
        y: 14,
        opacity: 0,
      });
      gsap.set(".chero-watermark", { opacity: 0, yPercent: 12 });
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
        .to(
          ".chero-watermark",
          { opacity: 1, yPercent: 0, duration: 1.4, ease: "power2.out" },
          "<",
        )
        .to(".chero-lede", { y: 0, opacity: 1, duration: 0.6 }, "-=0.6")
        .to(
          ".chero-cta > *",
          { y: 0, opacity: 1, stagger: 0.08, duration: 0.5 },
          "-=0.35",
        )
        .to(
          ".chero-trust > *",
          { y: 0, opacity: 1, stagger: 0.07, duration: 0.45 },
          "-=0.3",
        )
        .to(".chero-chip", { y: 0, opacity: 1, duration: 0.5 }, "-=0.4");

      return () => {
        split.revert();
      };
    },
    { scope: ref, dependencies: [reduced] },
  );

  // Ambient life: drifting particles, a recurring red light-sweep, and
  // pointer parallax. All transform/opacity only, fully reduced-motion gated.
  useGSAP(
    () => {
      if (reduced) return;
      const root = ref.current;
      if (!root) return;

      gsap.to(".chero-particle", {
        y: (i) => (i % 2 === 0 ? -34 : 26),
        x: (i) => (i % 3 === 0 ? 18 : -14),
        opacity: (i) => 0.15 + (i % 4) * 0.12,
        duration: (i) => 5 + (i % 5) * 1.6,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: { each: 0.3, from: "random" },
      });

      gsap.fromTo(
        ".chero-sweep",
        { xPercent: -160 },
        {
          xPercent: 480,
          duration: 3.6,
          ease: "sine.inOut",
          repeat: -1,
          repeatDelay: 5,
          delay: 2,
        },
      );

      // Pointer parallax — background leans away, content leans in.
      const xBg = gsap.quickTo(".chero-drift", "x", {
        duration: 1.1,
        ease: "power3.out",
      });
      const yBgDrift = gsap.quickTo(".chero-drift", "y", {
        duration: 1.1,
        ease: "power3.out",
      });
      const xFg = gsap.quickTo(".chero-content", "x", {
        duration: 1.4,
        ease: "power3.out",
      });
      const onMove = (e: MouseEvent) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        xBg(nx * -26);
        yBgDrift(ny * -16);
        xFg(nx * 10);
      };
      window.addEventListener("mousemove", onMove, { passive: true });
      return () => window.removeEventListener("mousemove", onMove);
    },
    { scope: ref, dependencies: [reduced] },
  );

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-mec-ink text-mec-pure"
    >
      {/* ── Background stack: image → tint → sweep → particles → grid ── */}
      <motion.div
        aria-hidden
        style={{ y: yBg, scale: scaleBg }}
        className="absolute inset-0"
      >
        <div className="chero-drift absolute -inset-[3%]">
          <div className="chero-bg relative h-full w-full">
            <Image
              src="/images/hero-promotional.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </div>
      </motion.div>

      {/* Legibility tint + cinematic vignette */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-mec-ink/70 via-mec-ink/40 to-mec-ink/10"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-mec-ink/45 via-transparent to-mec-ink/85"
      />
      {/* Entrance veil — raised to full black by GSAP, then faded out */}
      <div aria-hidden className="chero-veil absolute inset-0 bg-mec-ink opacity-0" />

      {/* Recurring red light-sweep across the scene */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="chero-sweep absolute inset-y-0 left-0 w-[30%] -skew-x-12 bg-gradient-to-r from-transparent via-mec-red/[0.07] to-transparent" />
      </div>

      {/* Drifting haze particles */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className={`chero-particle absolute rounded-full ${
              p.red ? "bg-mec-red/40" : "bg-mec-pure/25"
            }`}
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              opacity: 0.12,
            }}
          />
        ))}
      </div>

      {/* Giant outlined watermark, anchored behind the content */}
      <div
        aria-hidden
        className="chero-watermark pointer-events-none absolute -right-4 bottom-[18svh] hidden select-none font-display leading-none text-outline-pure lg:block"
        style={{ fontSize: "clamp(8rem, 18vw, 16rem)" }}
      >
        1990
      </div>

      {/* ── Content ── */}
      <div className="relative z-[2] mx-auto flex w-full max-w-[1440px] flex-1 flex-col justify-end px-6 pb-8 pt-28 md:px-10 md:pb-10">
        <motion.div
          style={{ opacity: fadeContent, y: yContent }}
          className="chero-content max-w-4xl"
        >
          <p className="chero-eyebrow">
            <Eyebrow tone="white">
              Jamaica&apos;s Most Trusted Partner in Clean — Since 1990
            </Eyebrow>
          </p>

          <h1
            role="text"
            className="chero-heading mt-6 font-display-tight text-[clamp(3rem,7.5vw,6.75rem)] leading-[0.92]"
          >
            The premium standard in{" "}
            <span className="text-mec-red">equipment &amp; chemicals.</span>
          </h1>

          <p className="chero-lede mt-6 max-w-[58ch] text-[clamp(1.05rem,1.3vw,1.25rem)] leading-relaxed text-mec-pure/95">
            For over 30 years, MEC has powered clean, safe, and productive
            spaces across Jamaica — locally manufactured chemical solutions,
            backed by world-class equipment from 3M, San Jamar, Rubbermaid, and
            Purell.
          </p>

          <div className="chero-cta mt-8 flex flex-wrap items-center gap-4">
            <Button href="/products" variant="primary" arrow>
              See Our Products
            </Button>
            <Button href="/quote" variant="ghost-dark">
              Request a Quote
            </Button>
          </div>
        </motion.div>

        {/* Bottom strip: trust items / distributor chip / scroll cue */}
        <div className="mt-10 flex flex-wrap items-end justify-between gap-8 border-t border-mec-pure/15 pt-6">
          <ul className="chero-trust flex flex-wrap gap-x-8 gap-y-3">
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-mec-pure/90"
              >
                <Icon className="h-4 w-4 text-mec-red" aria-hidden />
                {label}
              </li>
            ))}
          </ul>

          <div className="chero-chip flex items-center gap-3 rounded-md border border-white/15 bg-white/10 px-5 py-3 backdrop-blur-lg">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-mec-red text-sm font-bold">
              ★
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">
                Elite Distributor
              </p>
              <p className="text-sm font-semibold">
                3M · San Jamar · Rubbermaid · Purell
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
