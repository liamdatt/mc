"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { stagger, fadeUp } from "@/lib/motion";

/**
 * CSR event galleries — the two community events MEC is featuring, each with
 * its own set of client-supplied photos.
 */

type CsrEvent = {
  tag: string;
  title: string;
  blurb: string;
  photos: { src: string; alt: string }[];
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
                    <div
                      className={
                        "relative w-full overflow-hidden " +
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
                    </div>
                    {/* Red accent bar on hover */}
                    <span
                      aria-hidden
                      className="absolute bottom-0 left-0 h-[3px] w-0 bg-mec-red transition-all duration-300 group-hover:w-full"
                    />
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
