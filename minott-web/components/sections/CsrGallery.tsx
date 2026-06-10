"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { stagger, fadeUp } from "@/lib/motion";

/**
 * CSR event gallery — placeholder images are intentional.
 * TODO: Replace each `src` with the real client photo once assets are received.
 * See TODO comments on each item below.
 */

type GalleryItem = {
  /** TODO: replace with real photo path once client supplies assets */
  src: string;
  alt: string;
  caption: string;
  /** Optional: year or event sub-label */
  sub?: string;
};

const GALLERY_ITEMS: GalleryItem[] = [
  {
    // TODO: replace with real Sigma 2026 event photo
    src: "/images/product-placeholder.png",
    alt: "MEC team at the Sigma Corporate Run 2026",
    caption: "Sigma 2026",
    sub: "Corporate Run",
  },
  {
    // TODO: replace with real Read Across Jamaica event photo
    src: "/images/product-placeholder.png",
    alt: "MEC volunteers reading with students for Read Across Jamaica Day",
    caption: "Read Across Jamaica",
    sub: "Literacy Initiative",
  },
  {
    // TODO: replace with real community clean-up event photo
    src: "/images/product-placeholder.png",
    alt: "MEC staff participating in a community clean-up drive",
    caption: "Community Clean-Up",
    sub: "Kingston",
  },
  {
    // TODO: replace with real Homes for the Aged donation drive photo
    src: "/images/product-placeholder.png",
    alt: "MEC donation drive for Homes for the Aged",
    caption: "Homes for the Aged",
    sub: "Donation Drive",
  },
  {
    // TODO: replace with real school supply donation event photo
    src: "/images/product-placeholder.png",
    alt: "MEC Back-to-School supply donation to local school",
    caption: "Back-to-School Drive",
    sub: "Supply Donation",
  },
  {
    // TODO: replace with real environmental initiative photo
    src: "/images/product-placeholder.png",
    alt: "MEC Environmental Awareness Day",
    caption: "Environmental Awareness",
    sub: "Earth Day",
  },
];

export function CsrGallery() {
  return (
    <Section tone="mist" id="csr-gallery">
      <Container>
        <RevealOnScroll className="text-center">
          <p>
            <Eyebrow tone="red">In the Community</Eyebrow>
          </p>
          <h2 className="mt-6 font-display-tight text-h2 text-mec-ink">
            Where we show up.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lede text-mec-ink/75">
            From charity runs to literacy days, MEC puts its values to work
            beyond the warehouse floor.
          </p>
        </RevealOnScroll>

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={stagger(0.05, 0.1)}
          className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="CSR event photos"
        >
          {GALLERY_ITEMS.map((item) => (
            <motion.li
              key={item.caption + (item.sub ?? "")}
              variants={fadeUp}
              className="group relative overflow-hidden rounded-md bg-mec-ink"
            >
              {/* Photo */}
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover opacity-70 transition-transform duration-500 group-hover:scale-105"
                />
                {/* Gradient overlay for caption legibility */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-mec-ink/80 via-transparent to-transparent"
                />
              </div>

              {/* Caption */}
              <div className="absolute bottom-0 left-0 right-0 px-5 py-4">
                <p className="font-display text-xl leading-tight tracking-wide text-mec-pure">
                  {item.caption}
                </p>
                {item.sub && (
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-mec-pure/60">
                    {item.sub}
                  </p>
                )}
              </div>

              {/* Red accent bar on hover */}
              <span
                aria-hidden
                className="absolute bottom-0 left-0 h-[3px] w-0 bg-mec-red transition-all duration-300 group-hover:w-full"
              />
            </motion.li>
          ))}
        </motion.ul>
      </Container>
    </Section>
  );
}
