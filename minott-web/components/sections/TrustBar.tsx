"use client";
import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { BRAND_SLOTS } from "@/components/sections/BrandWordmarks";

export function TrustBar() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) {
        tweenRef.current = null;
        return;
      }
      const track = trackRef.current;
      if (!track) return;
      tweenRef.current = gsap.to(track, {
        xPercent: -50,
        duration: 36,
        ease: "none",
        repeat: -1,
      });
    },
    { scope: sectionRef, dependencies: [reduced] },
  );

  const onEnter = (name: string) => {
    setHovered(name);
    tweenRef.current?.pause();
  };
  const onLeave = () => {
    setHovered(null);
    tweenRef.current?.play();
  };

  const items = [...BRAND_SLOTS, ...BRAND_SLOTS];

  return (
    <section
      ref={sectionRef}
      id="trust"
      className="relative shrink-0 overflow-hidden bg-mec-mist py-6"
    >
      <div className="mx-auto mb-4 w-full max-w-[1280px] px-6 md:px-10">
        <p className="text-center">
          <Eyebrow tone="ink">Proud Elite Distributor For</Eyebrow>
        </p>
      </div>

      <div className="relative">
        <div ref={trackRef} className="flex w-max items-center gap-8 px-8">
          {items.map((b, i) => {
            const { Wordmark } = b;
            const isOther = hovered && hovered !== b.name;
            const isActive = hovered === b.name;
            return (
              <div
                key={`${b.name}-${i}`}
                className="group relative flex shrink-0 items-center justify-center"
                onMouseEnter={() => onEnter(b.name)}
                onMouseLeave={onLeave}
                data-cursor={b.name}
              >
                {/* Consistent chip; real SVGs drop into each Wordmark later. */}
                <div
                  className="flex h-20 w-52 items-center justify-center rounded-lg border border-mec-ink/10 bg-mec-pure px-6 shadow-[0_1px_0_rgba(13,13,13,0.04)] transition-all duration-300"
                  style={{
                    opacity: isOther ? 0.4 : 1,
                    transform: isActive ? "scale(1.05)" : "scale(1)",
                    borderColor: isActive
                      ? "rgba(225,6,0,0.4)"
                      : "rgba(13,13,13,0.1)",
                    boxShadow: isActive
                      ? "0 18px 40px -16px rgba(13,13,13,0.25)"
                      : "0 1px 0 rgba(13,13,13,0.04)",
                  }}
                >
                  <Wordmark />
                </div>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-3 whitespace-nowrap rounded-md bg-mec-ink px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-mec-pure transition-all duration-200"
                  style={
                    isActive
                      ? { opacity: 1, transform: "translate(-50%, 0)" }
                      : { opacity: 0 }
                  }
                >
                  {b.desc}
                </div>
              </div>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-mec-mist to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-mec-mist to-transparent" />
      </div>
    </section>
  );
}
