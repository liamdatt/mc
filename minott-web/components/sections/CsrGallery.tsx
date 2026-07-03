"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { stagger, fadeUp } from "@/lib/motion";

/**
 * CSR event galleries — the two community events MEC is featuring, each with
 * its own set of client-supplied photos. Clicking any photo opens a lightbox
 * that enlarges it, with keyboard + prev/next navigation across all photos.
 */

type Photo = { src: string; alt: string };

type CsrEvent = {
  tag: string;
  title: string;
  blurb: string;
  photos: Photo[];
};

const EVENTS: CsrEvent[] = [
  {
    tag: "Health & Wellness",
    title: "Sigma Corporate Run",
    blurb:
      "Each year MEC joins thousands of Jamaicans at the Sigma Corporate Run — one of the island's largest health and fitness events — running in support of better public healthcare across the nation.",
    photos: [
      {
        src: "/images/csr/sigma-1.jpg",
        alt: "A dense crowd of participants gathered at the start line of the Sigma Corporate Run in Jamaica",
      },
      {
        src: "/images/csr/sigma-2.jpg",
        alt: "Runners taking part in the Sigma Corporate Run",
      },
      {
        src: "/images/csr/sigma-3.jpg",
        alt: "MEC team members at the Sigma Corporate Run",
      },
      {
        src: "/images/csr/sigma-4.jpg",
        alt: "Participants at the Sigma Corporate Run in Jamaica",
      },
    ],
  },
  {
    tag: "Community Health",
    title: "Breast Cancer Awareness",
    blurb:
      "In support of early detection, MEC backs breast-cancer awareness in our communities — including a donation toward mammography examinations to help those who need screening the most.",
    photos: [
      {
        src: "/images/csr/breast-cancer-1.jpg",
        alt: "MEC's CEO signing a ceremonial pledge toward breast-cancer mammography screening",
      },
      {
        src: "/images/csr/breast-cancer-2.jpg",
        alt: "MEC representatives at a breast cancer awareness event",
      },
      {
        src: "/images/csr/breast-cancer-3.jpg",
        alt: "Supporters gathered for MEC's breast cancer awareness initiative",
      },
      {
        src: "/images/csr/breast-cancer-4.jpg",
        alt: "MEC contributing to breast cancer awareness and screening",
      },
    ],
  },
];

// One flat list so the lightbox can page across every photo, regardless of
// which event it came from.
const ALL_PHOTOS: Photo[] = EVENTS.flatMap((e) => e.photos);

export function CsrGallery() {
  const reduced = useReducedMotion();
  // Index into ALL_PHOTOS of the enlarged photo, or null when the lightbox
  // is closed.
  const [active, setActive] = useState<number | null>(null);

  const close = useCallback(() => setActive(null), []);
  const step = useCallback(
    (dir: number) =>
      setActive((i) =>
        i === null ? i : (i + dir + ALL_PHOTOS.length) % ALL_PHOTOS.length,
      ),
    [],
  );

  // Keyboard controls + scroll lock while the lightbox is open.
  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [active, close, step]);

  const activePhoto = active === null ? null : ALL_PHOTOS[active];

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
            Beyond the warehouse floor, MEC puts its values to work — supporting
            the health and wellbeing of the communities that have supported us.
          </p>
        </RevealOnScroll>

        <div className="mt-16 space-y-20">
          {EVENTS.map((event) => (
            <div key={event.title}>
              <RevealOnScroll>
                <p>
                  <Eyebrow tone="red">{event.tag}</Eyebrow>
                </p>
                <h3 className="mt-4 font-display-tight text-h3 text-mec-ink">
                  {event.title}
                </h3>
                <p className="mt-4 max-w-3xl leading-relaxed text-mec-ink/75">
                  {event.blurb}
                </p>
              </RevealOnScroll>

              <motion.ul
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                variants={stagger(0.05, 0.1)}
                className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4"
                aria-label={`${event.title} photos`}
              >
                {event.photos.map((photo, i) => (
                  <motion.li
                    key={photo.src}
                    variants={fadeUp}
                    className={
                      "group relative overflow-hidden rounded-md bg-mec-ink " +
                      (i === 0 ? "col-span-2 lg:row-span-2" : "")
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setActive(ALL_PHOTOS.findIndex((p) => p.src === photo.src))
                      }
                      aria-label={`Enlarge photo: ${photo.alt}`}
                      data-cursor="View"
                      className={
                        "relative block w-full cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-mec-red focus-visible:ring-offset-2 " +
                        (i === 0 ? "aspect-square lg:h-full" : "aspect-[4/3]")
                      }
                    >
                      <Image
                        src={photo.src}
                        alt={photo.alt}
                        fill
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </button>
                    {/* Red accent bar on hover */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute bottom-0 left-0 h-[3px] w-0 bg-mec-red transition-all duration-300 group-hover:w-full"
                    />
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          ))}
        </div>
      </Container>

      {/* Lightbox */}
      <AnimatePresence>
        {activePhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
            className="fixed inset-0 z-[200] grid place-items-center bg-mec-ink/90 p-4 backdrop-blur-sm sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-label={activePhoto.alt}
            onClick={close}
          >
            {/* Close */}
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-mec-pure/10 text-mec-pure transition-colors hover:bg-mec-red sm:right-6 sm:top-6"
            >
              <X size={24} />
            </button>

            {/* Prev */}
            {ALL_PHOTOS.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label="Previous photo"
                className="absolute left-4 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-mec-pure/10 text-mec-pure transition-colors hover:bg-mec-red sm:left-6"
              >
                <ChevronLeft size={26} />
              </button>
            )}

            {/* Next */}
            {ALL_PHOTOS.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label="Next photo"
                className="absolute right-4 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-mec-pure/10 text-mec-pure transition-colors hover:bg-mec-red sm:right-6"
              >
                <ChevronRight size={26} />
              </button>
            )}

            {/* Enlarged image — stopPropagation so a click on the image itself
                doesn't close the lightbox. */}
            <motion.div
              key={activePhoto.src}
              initial={reduced ? false : { scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: reduced ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-[80vh] w-[90vw] max-w-6xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={activePhoto.src}
                alt={activePhoto.alt}
                fill
                sizes="90vw"
                className="object-contain"
                priority
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
}
