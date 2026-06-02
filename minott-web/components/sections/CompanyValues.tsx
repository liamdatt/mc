"use client";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { motion } from "framer-motion";
import { Users, ShieldCheck, BadgeCheck, TrendingUp, HeartHandshake } from "lucide-react";

const VALUES = [
  { icon: Users, title: "Family", body: "We treat our customers and team like family." },
  { icon: ShieldCheck, title: "Integrity", body: "We do the right thing, always." },
  { icon: BadgeCheck, title: "Quality", body: "We deliver trusted products and solutions." },
  { icon: TrendingUp, title: "Resilience", body: "We overcome challenges and keep moving forward." },
  { icon: HeartHandshake, title: "Commitment", body: "We are committed to our customers' success." },
];

export function CompanyValues() {
  return (
    <Section tone="light" pad={false} className="pb-[var(--spacing-section-y)]">
      <Container>
        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-5"
        >
          {VALUES.map(({ icon: Icon, title, body }) => (
            <motion.li
              key={title}
              variants={{
                hidden: { opacity: 0, y: 28 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              className="flex flex-col items-center text-center"
            >
              <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-mec-red text-mec-red">
                <Icon className="h-7 w-7" aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-2xl tracking-wide text-mec-red">
                {title}
              </h3>
              <p className="mt-3 max-w-[22ch] text-sm leading-relaxed text-mec-ink/70">
                {body}
              </p>
            </motion.li>
          ))}
        </motion.ul>
      </Container>
    </Section>
  );
}
