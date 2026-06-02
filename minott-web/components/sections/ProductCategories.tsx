"use client";
import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { Button } from "@/components/primitives/Button";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const CARDS = [
  {
    img: "/images/product-chemicals.jpg",
    eyebrow: "01 / 04",
    title: "Formulated for Jamaica.",
    cat: "Industrial & Household Chemicals",
    items: ["Floor cleaners", "Disinfectants", "Degreasers", "Bleach", "Sanitizers"],
    href: "/products/industrial-and-household-chemicals",
  },
  {
    img: "/images/product-janitorial.jpg",
    eyebrow: "02 / 04",
    title: "Built for the work.",
    cat: "Janitorial Equipment & Supplies",
    items: ["Vacuums", "Mops", "Carts", "Brooms", "Buckets", "Bins"],
    href: "/products/janitorial-equipment-and-supplies",
  },
  {
    img: "/images/product-ppe.jpg",
    eyebrow: "03 / 04",
    title: "Protection that fits.",
    cat: "Personal Protection Equipment",
    items: ["Surgical gloves", "Nitrile", "Latex", "Masks", "Isolation gowns"],
    href: "/products/personal-protection-equipment-ppe",
  },
  {
    img: "/images/product-paper.jpg",
    eyebrow: "04 / 04",
    title: "Never run out.",
    cat: "Paper Products",
    items: ["Hand towels", "Jumbo roll", "Bathroom tissue", "Napkins", "Dispensers"],
    href: "/products/paper-products",
  },
];

function Header({ progressRef }: { progressRef?: React.RefObject<HTMLDivElement | null> }) {
  return (
    <>
      <p>
        <Eyebrow tone="white">Our Catalog</Eyebrow>
      </p>
      <h2 className="mt-4 font-display-tight text-[clamp(2.25rem,4.5vw,4rem)] leading-[1]">
        Four categories. <span className="text-mec-red">One supplier.</span>
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-mec-pure/70 md:text-base">
        From hospital-grade disinfectant to bulk bathroom tissue, every line on
        this list ships from our Kingston floor or one of fifteen overseas
        partners — usually within forty-eight hours.
      </p>
      {progressRef && (
        <div className="mt-6 relative h-px w-full bg-mec-pure/15">
          <div
            ref={progressRef}
            className="absolute left-0 top-0 h-px w-full origin-left scale-x-0 bg-mec-red"
          />
        </div>
      )}
    </>
  );
}

export function ProductCategories() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const section = sectionRef.current;
      const track = trackRef.current;
      const progress = progressRef.current;
      if (!section || !track || !progress) return;

      gsap.registerPlugin(ScrollTrigger);

      const totalScroll = () => track.scrollWidth - window.innerWidth;

      gsap.to(track, {
        x: () => -totalScroll(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${totalScroll()}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      gsap.to(progress, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${totalScroll()}`,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    },
    { scope: sectionRef, dependencies: [reduced] },
  );

  return (
    <section
      ref={sectionRef}
      id="products"
      className="relative bg-mec-ink text-mec-pure"
    >
      {reduced ? (
        // Reduced-motion: header + snap carousel in normal flow
        <>
          <div className="mx-auto w-full max-w-[1440px] px-6 pt-24 md:px-10">
            <Header />
          </div>
          <div className="mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-16">
            {CARDS.map((c) => (
              <ProductCard key={c.cat} {...c} />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Mobile: header + snap carousel */}
          <div className="md:hidden">
            <div className="px-6 pt-24">
              <Header />
            </div>
            <div className="mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-16">
              {CARDS.map((c) => (
                <ProductCard key={c.cat} {...c} />
              ))}
            </div>
          </div>

          {/* Desktop: pinned 100vh column — header on top, cards fill remaining vertical space */}
          <div className="hidden h-screen flex-col md:flex">
            <div className="mx-auto w-full max-w-[1440px] flex-shrink-0 px-10 pt-24">
              <Header progressRef={progressRef} />
            </div>
            <div className="flex flex-1 items-center overflow-hidden">
              <div
                ref={trackRef}
                className="flex gap-10 pl-[max(2.5rem,calc((100vw-1440px)/2+2.5rem))] pr-[10vw] will-change-transform"
              >
                {CARDS.map((c) => (
                  <ProductCard key={c.cat} {...c} desktopPinned />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ProductCard({
  img,
  eyebrow,
  title,
  cat,
  items,
  href,
  desktopPinned = false,
}: {
  img: string;
  eyebrow: string;
  title: string;
  cat: string;
  items: string[];
  href: string;
  desktopPinned?: boolean;
}) {
  const heightCls = desktopPinned
    ? "h-[min(62vh,640px)] w-[72vw] max-w-[1040px]"
    : "h-[68vh] w-[88vw] md:h-[78vh] md:w-[78vw] md:max-w-[1080px]";
  return (
    <article
      className={`group relative flex shrink-0 snap-start overflow-hidden rounded-md ${heightCls}`}
      data-cursor="View"
    >
      <Image
        src={img}
        alt={cat}
        fill
        sizes={desktopPinned ? "72vw" : "(min-width: 768px) 78vw, 88vw"}
        className="object-cover transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-mec-ink via-mec-ink/40 to-transparent" />
      <div className="relative z-[2] flex w-full flex-col justify-between p-8 md:p-12">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-mec-red">
            {eyebrow}
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-mec-pure/60">
            {cat}
          </span>
        </div>
        <div className="max-w-xl">
          <h3 className="font-display-tight text-[clamp(2.25rem,4vw,4rem)] leading-[0.95] text-mec-pure">
            {title}
          </h3>
          <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-mec-pure/80">
            {items.map((i) => (
              <li
                key={i}
                className="inline-flex items-center after:ml-4 after:h-1 after:w-1 after:rounded-full after:bg-mec-red last:after:hidden"
              >
                {i}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Button href={href} variant="ghost-dark" arrow>
              View Products
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
