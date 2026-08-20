"use client";
import Link from "next/link";
import { Container } from "@/components/primitives/Container";

const QUICK = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/solutions", label: "Tailored Solutions" },
  { href: "/social-responsibility", label: "Social Responsibility" },
  { href: "/about", label: "About Us" },
  { href: "/portal", label: "Accounts Portal" },
  { href: "/contact", label: "Contact" },
];

const PRODUCTS = [
  { href: "/products/all?category=industrial-and-household-chemicals", label: "Industrial & Household Chemicals" },
  { href: "/products/all?category=janitorial-equipment-and-supplies", label: "Janitorial Equipment & Supplies" },
  { href: "/products/all?category=personal-protection-equipment-ppe", label: "Personal Protection Equipment" },
  { href: "/products/all?category=paper-products", label: "Paper Products" },
];

export function Footer() {
  return (
    <footer className="bg-mec-ink text-mec-pure/80">
      <Container className="grid grid-cols-1 gap-12 py-24 md:grid-cols-12">
        <div className="md:col-span-4">
          <Link
            href="/"
            className="group inline-flex items-baseline gap-2"
            data-cursor="Top"
          >
            <span className="font-display text-4xl tracking-wider text-mec-pure">
              <span className="text-mec-red">MEC</span> Minott
            </span>
            <span
              aria-hidden
              className="ml-2 h-2 w-2 rounded-full bg-mec-red opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-hover:animate-pulse"
            />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Cleaner Spaces. Stronger Business. Jamaica&apos;s most trusted partner in
            clean — since 1990.
          </p>
          <a
            href="https://facebook.com/minottchemicalsja"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Minott Chemicals on Facebook"
            className="mt-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-mec-pure/20 transition hover:border-mec-red hover:text-mec-red"
            data-cursor="Open"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z"/>
            </svg>
          </a>
        </div>

        <div className="md:col-span-2">
          <h3 className="eyebrow text-mec-pure">Quick Links</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {QUICK.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-mec-red">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-3">
          <h3 className="eyebrow text-mec-pure">Our Products</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {PRODUCTS.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className="hover:text-mec-red">
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-3">
          <h3 className="eyebrow text-mec-pure">Contact</h3>
          <div className="mt-4 space-y-3 text-sm">
            <a
              href="tel:+18769295284"
              className="block hover:text-mec-red"
              data-cursor="Call"
            >
              (876) 929-5284
            </a>
            <a
              href="mailto:sales@minottchem.com"
              className="block hover:text-mec-red"
              data-cursor="Email"
            >
              sales@minottchem.com
            </a>
            <p>Mon–Fri, 8:00 AM – 4:30 PM</p>
            <p>14½ Retirement Road, Kingston 5, Jamaica</p>
          </div>
        </div>
      </Container>

      <div className="border-t border-mec-pure/10">
        <Container className="flex flex-col items-start justify-between gap-3 py-6 text-xs text-mec-pure/50 md:flex-row md:items-center">
          <p>
            © {new Date().getFullYear()} Minott Equipment & Chemicals Limited.
            Designed by FloPro Limited.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-mec-red">
              Privacy
            </Link>
            <Link href="#" className="hover:text-mec-red">
              Terms
            </Link>
          </div>
        </Container>
      </div>
    </footer>
  );
}
