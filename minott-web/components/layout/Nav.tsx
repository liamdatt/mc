"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, FileText } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { Logo } from "@/components/layout/Logo";
import { NavSearch } from "@/components/layout/NavSearch";
import { useQuoteCart } from "@/components/quote/QuoteCartProvider";
import { cn } from "@/lib/cn";

type CategoryLink = { slug: string; name: string };

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products", hasDropdown: true },
  { href: "/deals", label: "Special Offer" },
  { href: "/about", label: "About Us" },
  { href: "/social-responsibility", label: "Social Responsibility" },
];

export function Nav({ categories }: { categories: CategoryLink[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { count } = useQuoteCart();

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

  const linkBase =
    "relative flex items-center gap-1 whitespace-nowrap text-[12px] font-semibold uppercase tracking-[0.06em] text-mec-ink transition-colors hover:text-mec-red min-[1280px]:text-[13px] min-[1280px]:tracking-[0.1em] min-[1440px]:text-sm min-[1440px]:tracking-[0.12em]";

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-[120] h-20 border-b border-black/10 bg-mec-pure">
        <div className="mx-auto flex h-full w-full max-w-[1440px] items-center justify-between gap-4 px-6 md:px-10 min-[1280px]:gap-6">
          <Link
            href="/"
            data-cursor="Home"
            aria-label="Minott Equipment & Chemicals — Home"
            className="shrink-0"
          >
            <Logo className="h-11 md:h-12" />
          </Link>

          <nav className="hidden items-center justify-center gap-4 lg:flex min-[1280px]:gap-6 min-[1440px]:gap-7">
            {LINKS.map((l) => (
              <div key={l.href} className="group relative">
                <Link
                  href={l.href}
                  className={cn(linkBase, isActive(l.href) && "text-mec-red")}
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
                        className="block px-5 py-2 text-sm font-semibold normal-case tracking-normal text-mec-ink hover:bg-mec-mist hover:text-mec-red"
                      >
                        All Products
                      </Link>
                      <div className="my-1 h-px bg-black/5" />
                      {categories.map((c) => (
                        <Link
                          key={c.slug}
                          href={`/products/all?category=${c.slug}`}
                          className="block px-5 py-2 text-sm normal-case tracking-normal text-mec-ink/80 hover:bg-mec-mist hover:text-mec-red"
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

          <div className="hidden shrink-0 items-center justify-end gap-3 lg:flex min-[1280px]:gap-4">
            <NavSearch />
            <Link
              href="/quote"
              className={cn(linkBase, "gap-2", isActive("/quote") && "text-mec-red")}
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
            <Button
              href="/portal/sign-in"
              variant="primary"
              className="!px-4 !py-2.5 min-[1280px]:!px-5 min-[1280px]:!py-3"
            >
              Login
            </Button>
          </div>

          <button
            type="button"
            className="text-mec-ink transition-colors lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={28} className="text-mec-pure" /> : <Menu size={28} />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-mec-ink lg:hidden"
          >
            <nav className="flex flex-col items-center gap-6 py-24 text-center">
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <NavSearch
                  alwaysOpen
                  onSubmitted={() => setOpen(false)}
                  className="w-72 max-w-[80vw]"
                  inputClassName="w-full"
                />
              </motion.div>
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
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.08 + LINKS.length * 0.05, duration: 0.5 }}
              >
                <Link
                  href="/quote"
                  onClick={() => setOpen(false)}
                  className="font-display text-2xl tracking-wider text-mec-pure/80"
                >
                  My Quote {count > 0 ? `(${count})` : ""}
                </Link>
              </motion.div>
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.12 + LINKS.length * 0.05, duration: 0.5 }}
              >
                <Button href="/portal/sign-in" variant="primary" onClick={() => setOpen(false)}>
                  Login
                </Button>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
