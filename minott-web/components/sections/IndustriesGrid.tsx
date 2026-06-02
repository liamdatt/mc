"use client";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Hotel,
  Stethoscope,
  Factory,
  Landmark,
  Antenna,
  Music,
  ShoppingBag,
  Brush,
  SprayCan,
  ArrowRight,
} from "lucide-react";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

const TILES = [
  {
    name: "Hospitality",
    icon: Hotel,
    img: "industry-hospitality.jpg",
    blurb:
      "Hotels and resorts: housekeeping carts, amenities, paper, and floor care that protect guest experience.",
  },
  {
    name: "Medical",
    icon: Stethoscope,
    img: "industry-medical.jpg",
    blurb:
      "Clinics and hospitals: hospital-grade disinfectants, PPE, and biohazard handling that meet sanitation specs.",
  },
  {
    name: "Manufacturing",
    icon: Factory,
    img: "industry-manufacturing.jpg",
    blurb:
      "Plants and factories: industrial degreasers, floor machines, and safety gear for demanding environments.",
  },
  {
    name: "Financial",
    icon: Landmark,
    img: "industry-financial.jpg",
    blurb:
      "Banks and offices: discreet, dependable janitorial supply that keeps institutional spaces immaculate.",
  },
  {
    name: "Telecoms",
    icon: Antenna,
    img: "industry-telecoms.jpg",
    blurb:
      "Data and network facilities: precise, low-residue cleaning for sensitive equipment areas.",
  },
  {
    name: "Entertainment",
    icon: Music,
    img: "industry-entertainment.jpg",
    blurb:
      "Venues and theatres: fast-turnaround cleaning supplies for high-traffic public spaces.",
  },
  {
    name: "Retail",
    icon: ShoppingBag,
    img: "industry-retail.jpg",
    blurb:
      "Stores and malls: nightly maintenance programs that keep sales floors spotless.",
  },
  {
    name: "Janitorial",
    icon: Brush,
    img: "industry-janitorial.jpg",
    blurb:
      "Contract cleaners: bulk chemicals, equipment, and consumables with island-wide twice-weekly delivery.",
  },
  {
    name: "Sanitation",
    icon: SprayCan,
    img: "industry-sanitation.jpg",
    blurb:
      "Facility hygiene programs: high-volume disinfectants and dispensers that keep public spaces safe.",
  },
];

export function IndustriesGrid() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <Section tone="mist" id="industries">
      <Container>
        <RevealOnScroll className="text-center">
          <p>
            <Eyebrow tone="red">Who We Serve</Eyebrow>
          </p>
          <h2 className="mt-6 font-display-tight text-h2">
            Nine industries. <span className="text-mec-red">One standard.</span>
          </h2>
        </RevealOnScroll>

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          className="mt-16 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4"
        >
          {TILES.map(({ name, icon: Icon, img, blurb }) => {
            const isActive = active === name;
            const isOther = active && !isActive;
            return (
              <motion.li
                key={name}
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                  },
                }}
                onMouseEnter={() => setActive(name)}
                onMouseLeave={() => setActive(null)}
                className="relative aspect-[4/5] overflow-hidden rounded-md transition-opacity duration-300"
                style={{ opacity: isOther ? 0.5 : 1 }}
                data-cursor={name}
              >
                <motion.div
                  initial={false}
                  animate={{ scale: isActive ? 1.04 : 1 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="relative h-full w-full"
                >
                  <Image
                    src={`/images/${img}`}
                    alt={name}
                    fill
                    sizes="(min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500"
                  />
                  {/* Base scrim — keeps the always-visible copy legible over any photo */}
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-mec-ink via-mec-ink/55 to-mec-ink/15"
                  />
                  {/* Red accent overlay on hover */}
                  <motion.div
                    aria-hidden
                    initial={false}
                    animate={{ opacity: isActive ? 0.55 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 bg-mec-red mix-blend-multiply"
                  />
                  <div className="relative flex h-full flex-col justify-between p-5 text-mec-pure md:p-6">
                    <div className="flex items-start justify-between">
                      <Icon className="h-6 w-6 text-mec-pure" aria-hidden />
                      <motion.div
                        initial={false}
                        animate={{ x: isActive ? 0 : 8, opacity: isActive ? 1 : 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <ArrowRight className="h-5 w-5 text-mec-pure" aria-hidden />
                      </motion.div>
                    </div>
                    <div>
                      <h3 className="font-display text-3xl md:text-4xl">{name}</h3>
                      <p className="mt-2 max-w-[34ch] text-sm leading-snug text-mec-pure/85">
                        {blurb}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.li>
            );
          })}
        </motion.ul>
      </Container>
    </Section>
  );
}
