"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, FileText } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { Logo } from "@/components/layout/Logo";
import { useQuoteCart } from "@/components/quote/QuoteCartProvider";
import { cn } from "@/lib/cn";

type CategoryLink = { slug: string; name: string };

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/products", label: "Products", hasDropdown: true },
  { href: "/solutions", label: "Tailored Solutions" },
  { href: "/social-responsibility", label: "Social Responsibility" },
  { href: "/contact", label: "Contact" },
];

const CTA_LINKS = [
  { href: "/portal", label: "Customer Portal" },
];

export function Nav({ categories }: { categories: CategoryLink[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { count } = useQuoteCart();

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

  // Close the mobile overlay on route change (covers browser back/forward,
  // not just link clicks); setting state in response to navigation is intended.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // The landing page opens on a full-screen dark cinematic hero, so the
  // transparent (un-scrolled) nav needs light text there.
  const onDarkHero = pathname === "/";
  const linkColor =
    scrolled || onDarkHero ? "text-mec-pure" : "text-mec-ink";

  return (
    <>
      <motion.header
        initial={false}
        animate={{ y: hidden ? "-100%" : "0%" }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed left-0 right-0 top-0 z-[120] transition-[background,backdrop-filter] duration-300",
          scrolled ? "bg-mec-ink/90 backdrop-blur-md" : "bg-transparent",
        )}
      >
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-6 px-6 py-4 md:px-10">
          <Link
            href="/"
            data-cursor="Home"
            aria-label="Minott Equipment & Chemicals — Home"
            className="xl:flex-1"
          >
            <Logo className="h-12 md:h-14" />
          </Link>

          {/* The full row only fits from xl up; below that the hamburger
              takes over. "Home" is omitted on desktop (the logo covers it)
              and "Contact" is omitted because the red CTA button on the
              right already links there. Three equal-weight sections keep the
              nav visually centered in the header: the logo and the CTA
              cluster each take `flex-1` (left / right), so the middle nav sits
              centered in the viewport regardless of their differing widths. */}
          <nav className="hidden items-center justify-center gap-3 xl:flex min-[1440px]:gap-7">
            {LINKS.filter((l) => l.href !== "/" && l.href !== "/contact").map((l) => (
              <div key={l.href} className="group relative">
                <Link
                  href={l.href}
                  className={cn(
                    "relative flex items-center gap-1 whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.1em] transition-colors hover:text-mec-red min-[1440px]:text-sm min-[1440px]:tracking-[0.12em]",
                    linkColor,
                    isActive(l.href) && "text-mec-red",
                  )}
                  data-cursor="View"
                >
                  {l.label}
                  {l.hasDropdown && (
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
                  )}
                </Link>
                {l.hasDropdown && categories.length > 0 && (
                  <div className="invisible absolute left-1/2 top-full z-[130] w-64 -translate-x-1/2 pt-4 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
                    <div className="overflow-hidden rounded-md border border-black/10 bg-mec-pure py-2 shadow-[var(--shadow-card)]">
                      <Link
                        href="/products/all"
                        className="block px-5 py-2 text-sm font-semibold text-mec-ink hover:bg-mec-mist hover:text-mec-red"
                      >
                        All Products
                      </Link>
                      <div className="my-1 h-px bg-black/5" />
                      {categories.map((c) => (
                        <Link
                          key={c.slug}
                          href={`/products/all?category=${c.slug}`}
                          className="block px-5 py-2 text-sm text-mec-ink/80 hover:bg-mec-mist hover:text-mec-red"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="hidden items-center justify-end gap-2.5 xl:flex xl:flex-1 min-[1440px]:gap-5">
            {CTA_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "relative whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.1em] transition-colors hover:text-mec-red min-[1440px]:text-sm min-[1440px]:tracking-[0.12em]",
                  linkColor,
                  isActive(l.href) && "text-mec-red",
                )}
                data-cursor="View"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/quote"
              className={cn(
                "relative inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.1em] transition-colors hover:text-mec-red min-[1440px]:text-sm min-[1440px]:tracking-[0.12em]",
                linkColor,
              )}
              data-cursor="View"
            >
              <FileText className="hidden h-4 w-4 min-[1440px]:block" aria-hidden />
              Quote
              {count > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-mec-red px-1 text-[11px] font-bold text-mec-pure">
                  {count}
                </span>
              )}
            </Link>
            <Button href="/contact" variant="primary" arrow>
              Contact
            </Button>
          </div>

          <button
            type="button"
            className={cn(
              "xl:hidden transition-colors",
              scrolled || open || onDarkHero ? "text-mec-pure" : "text-mec-ink",
            )}
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
            className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-mec-ink xl:hidden"
          >
            <nav className="flex flex-col items-center gap-6 py-24 text-center">
              {LINKS.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    delay: 0.08 + i * 0.05,
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "font-display text-4xl tracking-wider text-mec-pure",
                      isActive(l.href) && "text-mec-red",
                    )}
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              {CTA_LINKS.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    delay: 0.08 + (LINKS.length + i) * 0.05,
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "font-display text-3xl tracking-wider text-mec-pure/80",
                      isActive(l.href) && "text-mec-red",
                    )}
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.08 + (LINKS.length + CTA_LINKS.length) * 0.05, duration: 0.5 }}
              >
                <Link
                  href="/quote"
                  onClick={() => setOpen(false)}
                  className="font-display text-2xl tracking-wider text-mec-pure/80"
                >
                  My Quote {count > 0 ? `(${count})` : ""}
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
