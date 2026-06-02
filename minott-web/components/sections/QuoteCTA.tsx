"use client";
import { useRef } from "react";
import { motion } from "framer-motion";
import { Container } from "@/components/primitives/Container";
import { Button } from "@/components/primitives/Button";

export function QuoteCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-mec-ink py-[var(--spacing-section-y)] text-mec-pure"
    >
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        className="absolute inset-0 origin-left bg-mec-red"
      />
      <Container className="relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mec-pure/80">
            ★ Request a Quote
          </p>
          <h2 className="mt-6 max-w-4xl font-display-tight text-[clamp(3rem,7vw,7rem)] leading-[0.95] text-mec-pure">
            Your space. Our standard.
          </h2>
          <p className="mt-6 max-w-2xl text-lg text-mec-pure/90">
            Tell us what you need clean. We&apos;ll quote it within one business
            day.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button href="/products" variant="primary" arrow>
              Browse Products
            </Button>
            <Button href="/contact" variant="ghost-dark">
              Talk to a Consultant
            </Button>
          </div>
          <p className="mt-6 text-sm text-mec-pure/80">
            Or call us directly:{" "}
            <a
              href="tel:+18769295284"
              className="font-semibold underline-offset-4 hover:underline"
              data-cursor="Call"
            >
              (876) 929-5284
            </a>
          </p>
        </motion.div>
      </Container>
    </section>
  );
}
