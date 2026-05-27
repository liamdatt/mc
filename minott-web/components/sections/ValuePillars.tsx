"use client";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { motion } from "framer-motion";
import { Award, Truck, Headphones } from "lucide-react";

const PILLARS = [
  {
    icon: Award,
    title: "Quality Products",
    body: "Manufactured on-island. Distributed from the best in the world.",
  },
  {
    icon: Truck,
    title: "Reliable Supply",
    body: "Twice-weekly delivery to every major Jamaican city. 15+ overseas suppliers backing every order.",
  },
  {
    icon: Headphones,
    title: "Expert Support",
    body: "35 years of category knowledge. Our sales consultants walk every order through with you.",
  },
];

export function ValuePillars() {
  return (
    <Section tone="dark" id="why">
      <Container>
        <RevealOnScroll className="text-center">
          <p>
            <Eyebrow tone="red">Why MEC</Eyebrow>
          </p>
          <h2 className="mt-6 font-display-tight text-h2 text-mec-pure">
            Three things we promise.
          </h2>
        </RevealOnScroll>

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-3"
        >
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <motion.li
              key={title}
              variants={{
                hidden: { opacity: 0, y: 32 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.6,
                    ease: [0.16, 1, 0.3, 1],
                  },
                },
              }}
              className="group relative overflow-hidden rounded-md border border-white/10 p-10 transition-all duration-300 hover:-translate-y-2 hover:border-white/30 hover:shadow-[0_24px_48px_-12px_rgba(225,6,0,0.25)]"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-1 -z-[1] origin-top-left rotate-[24deg] bg-mec-red opacity-0 transition-opacity duration-500 group-hover:opacity-[0.06]"
              />
              <Icon
                className="h-10 w-10 text-mec-red transition-transform duration-300 group-hover:rotate-[5deg] group-hover:scale-110"
                aria-hidden
              />
              <h3 className="mt-8 font-display text-3xl text-mec-pure">
                {title}
              </h3>
              <p className="mt-4 text-mec-pure/70">{body}</p>
            </motion.li>
          ))}
        </motion.ul>
      </Container>
    </Section>
  );
}
