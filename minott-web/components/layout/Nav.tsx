"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "#products", label: "Products" },
  { href: "#industries", label: "Industries" },
  { href: "#founder", label: "About" },
  { href: "#contact", label: "Contact" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 80);
      if (y > lastY && y > 200) setHidden(true);
      else setHidden(false);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <motion.header
        initial={false}
        animate={{ y: hidden ? "-100%" : "0%" }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed left-0 right-0 top-0 z-[120] transition-[background,backdrop-filter] duration-300",
          scrolled
            ? "bg-mec-ink/90 backdrop-blur-md"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-4 md:px-10">
          <Link
            href="#top"
            className={cn(
              "font-display text-2xl tracking-wider transition-colors",
              scrolled || open ? "text-mec-pure" : "text-mec-pure",
            )}
            data-cursor="Top"
          >
            <span className="text-mec-red">MEC</span>{" "}
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70 font-[var(--font-body)]">
              Minott Chemicals
            </span>
          </Link>

          <nav className="hidden items-center gap-10 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="relative text-sm font-semibold uppercase tracking-[0.14em] text-mec-pure transition-colors hover:text-mec-red"
                data-cursor="View"
              >
                <span className="relative">
                  {l.label}
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-mec-red transition-[width] duration-200 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:w-full" />
                </span>
              </Link>
            ))}
          </nav>

          <div className="hidden md:block">
            <Button href="#contact" variant="primary" arrow>
              Request a Quote
            </Button>
          </div>

          <button
            type="button"
            className="md:hidden text-mec-pure"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[110] grid place-items-center bg-mec-ink md:hidden"
          >
            <nav className="flex flex-col items-center gap-8 text-center">
              {LINKS.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    delay: 0.1 + i * 0.05,
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="font-display text-5xl tracking-wider text-mec-pure"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="mt-8"
              >
                <Button
                  href="#contact"
                  variant="primary"
                  arrow
                  onClick={() => setOpen(false)}
                >
                  Request a Quote
                </Button>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
