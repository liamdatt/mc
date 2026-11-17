"use client";
import { useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/primitives/Button";
import { PHONES } from "@/lib/constants";

export function QuoteCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-mec-ink py-16 text-mec-pure md:py-24"
    >
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        className="absolute inset-0 origin-left bg-mec-red"
      />
      <div className="relative mx-auto w-full max-w-[1440px] px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="max-w-3xl font-display-tight text-[clamp(2.5rem,5.5vw,5rem)] leading-[0.95] text-mec-pure">
            Your space. Our standard.
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-mec-pure">
            Tell us what you need clean. We&apos;ll quote it within one business
            day.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="/contact" variant="solid-light" arrow>
              Contact Us
            </Button>
            <Button href={`tel:${PHONES[0].tel}`} variant="ghost-on-red">
              Talk to a Consultant
            </Button>
          </div>
          <p className="mt-8 text-sm text-mec-pure">Or call us directly</p>
          <div className="mt-2 flex flex-wrap gap-x-8 gap-y-2">
            {PHONES.map((p) => (
              <a
                key={p.tel}
                href={`tel:${p.tel}`}
                data-cursor="Call"
                className="font-display text-[1.75rem] tracking-[0.02em] text-mec-pure underline-offset-4 hover:underline"
              >
                +1 {p.label}
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
