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
  { name: "Hospitality", icon: Hotel, img: "industry-hospitality.jpg" },
  { name: "Medical", icon: Stethoscope, img: "industry-medical.jpg" },
  { name: "Manufacturing", icon: Factory, img: "industry-manufacturing.jpg" },
  { name: "Financial", icon: Landmark, img: "industry-financial.jpg" },
  { name: "Telecoms", icon: Antenna, img: "industry-telecoms.jpg" },
  { name: "Entertainment", icon: Music, img: "industry-entertainment.jpg" },
  { name: "Retail", icon: ShoppingBag, img: "industry-retail.jpg" },
  { name: "Janitorial", icon: Brush, img: "industry-janitorial.jpg" },
  { name: "Sanitation", icon: SprayCan, img: "industry-sanitation.jpg" },
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
          className="mt-16 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4"
        >
          {TILES.map(({ name, icon: Icon, img }) => {
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
                className="relative aspect-square overflow-hidden rounded-md transition-opacity duration-300"
                style={{ opacity: isOther ? 0.35 : 1 }}
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
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover transition-all duration-500"
                    style={{
                      filter: isActive ? "grayscale(1) brightness(0.6)" : "grayscale(0.3)",
                      opacity: isActive ? 0.35 : 0.55,
                    }}
                  />
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: isActive ? "#E10600" : "#FFFFFF",
                      color: isActive ? "#FFFFFF" : "#0D0D0D",
                    }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 mix-blend-multiply"
                    style={{ opacity: isActive ? 0.92 : 0 }}
                  />
                  <div className="relative flex h-full flex-col justify-between p-5 md:p-7">
                    <div className="flex items-start justify-between">
                      <Icon
                        className={`h-6 w-6 transition-colors ${isActive ? "text-mec-pure" : "text-mec-ink"}`}
                        aria-hidden
                      />
                      <motion.div
                        initial={false}
                        animate={{ x: isActive ? 0 : 8, opacity: isActive ? 1 : 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <ArrowRight className="h-5 w-5 text-mec-pure" aria-hidden />
                      </motion.div>
                    </div>
                    <h3
                      className={`font-display text-3xl md:text-4xl ${isActive ? "text-mec-pure" : "text-mec-ink"}`}
                    >
                      {name}
                    </h3>
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
