"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Container } from "@/components/primitives/Container";

export function QuoteCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", need: "" });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };
  const reset = () => {
    setForm({ name: "", company: "", need: "" });
    setSubmitted(false);
  };

  return (
    <section
      ref={sectionRef}
      id="contact"
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
          transition={{ delay: 0.7, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mec-pure/80">
            ★ Request a Quote
          </p>

          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key="form"
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="mt-6 max-w-4xl font-display-tight text-[clamp(3rem,7vw,7rem)] leading-[0.95] text-mec-pure">
                  Your space. Our standard.
                </h2>
                <p className="mt-6 max-w-2xl text-lg text-mec-pure/90">
                  Tell us what you need clean. We&apos;ll quote it within one
                  business day.
                </p>

                <form
                  onSubmit={onSubmit}
                  className="mt-12 grid max-w-3xl grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2"
                >
                  <Field
                    label="Name"
                    value={form.name}
                    onChange={(v) => setForm({ ...form, name: v })}
                    required
                  />
                  <Field
                    label="Company"
                    value={form.company}
                    onChange={(v) => setForm({ ...form, company: v })}
                    required
                  />
                  <Field
                    label="What do you need?"
                    value={form.need}
                    onChange={(v) => setForm({ ...form, need: v })}
                    textarea
                    required
                    className="md:col-span-2"
                  />
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="group inline-flex items-center gap-3 bg-mec-pure px-8 py-4 font-semibold uppercase tracking-[0.14em] text-mec-red transition-all duration-200 hover:bg-mec-ink hover:text-mec-pure active:scale-[0.97]"
                      data-cursor="Send"
                    >
                      Send My Quote Request
                      <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">
                        →
                      </span>
                    </button>
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
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <h2 className="mt-6 max-w-4xl font-display-tight text-[clamp(2.5rem,6vw,6rem)] leading-[0.95] text-mec-pure">
                  Got it. A sales consultant will call you within one business
                  day.
                </h2>
                <button
                  type="button"
                  onClick={reset}
                  className="mt-10 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-mec-pure/80 underline-offset-4 hover:text-mec-pure hover:underline"
                >
                  ← Send another
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Container>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  textarea,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  textarea?: boolean;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;
  const floating = focused || hasValue;
  const id = `qcf-${label.replace(/\s+/g, "-").toLowerCase()}`;

  const baseInput =
    "peer w-full border-b-2 bg-transparent pb-2 pt-5 text-mec-pure outline-none transition-colors placeholder-transparent";
  const borderCls = focused
    ? "border-mec-pure"
    : "border-mec-pure/40";

  return (
    <div className={`relative ${className ?? ""}`}>
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-0 top-5 origin-left text-sm font-semibold uppercase tracking-[0.14em] text-mec-pure/80 transition-all duration-200"
        style={{
          transform: floating
            ? "translateY(-22px) scale(0.85)"
            : "translateY(0) scale(1)",
        }}
      >
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      {textarea ? (
        <textarea
          id={id}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={3}
          className={`${baseInput} ${borderCls} resize-none`}
          placeholder=" "
        />
      ) : (
        <input
          id={id}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`${baseInput} ${borderCls}`}
          placeholder=" "
        />
      )}
    </div>
  );
}
