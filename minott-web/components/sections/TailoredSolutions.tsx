"use client";
import { motion } from "framer-motion";
import {
  FlaskConical,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { Card } from "@/components/primitives/Card";
import { Button } from "@/components/primitives/Button";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

// ---------------------------------------------------------------------------
// Card data
// ---------------------------------------------------------------------------

const CARDS = [
  {
    key: "custom-products",
    icon: FlaskConical,
    title: "Custom Products",
    // TODO: matting content to be added later
    body: "Have a product request you can't find on our website? Contact us to see how we can facilitate product sourcing.",
    cta: "Get in Touch",
    href: "/contact",
  },
  {
    key: "janitorial-services",
    icon: Sparkles,
    title: "Janitorial Services",
    // TODO: copy pending from client — replace placeholder below
    body: "Professional-grade janitorial services tailored to your facility's needs.",
    cta: "Contact Us",
    href: "/contact",
  },
  {
    key: "facility-evaluation",
    icon: ClipboardList,
    title: "Facility Evaluation",
    body: "Looking to refurbish your facilities? Let a MEC sales representative tour your facility for free to evaluate how we can best serve you.",
    cta: "Book a Visit",
    href: "/contact",
  },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TailoredSolutions() {
  return (
    <Section tone="mist" id="tailored-solutions">
      <Container>
        {/* Section header */}
        <RevealOnScroll className="text-center">
          <p>
            <Eyebrow tone="red">Tailored Solutions</Eyebrow>
          </p>
          <h2 className="mt-6 font-display-tight text-h2">
            Built for your{" "}
            <span className="text-mec-red">exact situation.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lede text-mec-ink/70">
            From sourcing hard-to-find products to walking your facility
            in-person — we go beyond the shelf to solve real problems.
          </p>
        </RevealOnScroll>

        {/* Cards grid */}
        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3"
        >
          {CARDS.map(({ key, icon: Icon, title, body, cta, href }) => (
            <motion.li
              key={key}
              variants={{
                hidden: { opacity: 0, y: 32 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
                },
              }}
            >
              <Card
                border="ink"
                className="flex h-full flex-col bg-mec-pure"
              >
                {/* Icon accent */}
                <div className="mb-8 inline-flex h-12 w-12 items-center justify-center rounded-sm bg-mec-red/10 text-mec-red transition-colors duration-300 group-hover:bg-mec-red group-hover:text-mec-pure">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>

                {/* Text */}
                <h3 className="font-display text-3xl text-mec-ink">{title}</h3>
                <p className="mt-4 flex-1 text-base leading-relaxed text-mec-ink/70">
                  {body}
                </p>

                {/* CTA */}
                <div className="mt-8">
                  <Button href={href} variant="ghost" arrow>
                    {cta}
                  </Button>
                </div>
              </Card>
            </motion.li>
          ))}
        </motion.ul>
      </Container>
    </Section>
  );
}
