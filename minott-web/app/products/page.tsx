import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  FlaskConical,
  SprayCan,
  HardHat,
  Package,
  ShoppingCart,
  ShieldCheck,
  Truck,
  Headphones,
  Users,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { getCatalog } from "@/lib/products";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { ProductSearchBar } from "@/components/products/ProductSearchBar";
import { ShowroomBanner } from "@/components/products/ShowroomBanner";
import { WhatsAppCta } from "@/components/products/WhatsAppCta";

export const metadata: Metadata = {
  title: "Our Products — Minott Equipment & Chemicals",
  description:
    "Browse Minott's product categories: industrial & household chemicals, janitorial & sanitation, PPE, and paper products. High-quality supplies to keep your business running.",
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "industrial-and-household-chemicals": FlaskConical,
  "janitorial-equipment-and-supplies": SprayCan,
  "personal-protection-equipment-ppe": HardHat,
  "paper-products": Package,
};

const FEATURES = [
  { icon: ShieldCheck, title: "Quality Products", body: "We source only the best products from trusted suppliers worldwide." },
  { icon: Truck, title: "Islandwide Delivery", body: "Fast, reliable delivery across Jamaica." },
  { icon: Headphones, title: "Expert Support", body: "Our knowledgeable team is here to help you find the right solution." },
  { icon: Users, title: "Customer Focused", body: "We build lasting relationships through service, trust and dependability." },
];

export default async function ProductsLandingPage() {
  const categories = await getCatalog();

  return (
    <>
      <ShowroomBanner />

      {/* Header band */}
      <Section tone="light" className="pt-16 pb-14" pad={false}>
        <Container>
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <Eyebrow tone="red">Catalog</Eyebrow>
              <h1 className="mt-4 font-display-tight text-h1 leading-[0.95]">
                Our <span className="text-mec-red">Products</span>
              </h1>
              <p className="mt-6 max-w-xl text-lede text-mec-ink/80">
                High-quality chemicals, equipment, and supplies designed to keep
                your business running safely, efficiently and profitably.
              </p>
              <div className="mt-8 max-w-md">
                <ProductSearchBar targetPath="/products/all" />
              </div>
              <p className="mt-4 text-sm text-mec-ink/60">
                Add items to your quote as you browse, then submit it from the
                top-right — we respond within{" "}
                <span className="font-semibold text-mec-ink/80">48 hours</span>.
              </p>
            </div>
            <div className="relative h-[260px] w-full overflow-hidden rounded-md md:h-[320px]">
              <Image
                src="/images/hero-main.jpg"
                alt="Minott Chemicals warehouse aisle stocked with cleaning supplies"
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </Container>
      </Section>

      {/* Categories */}
      <Section tone="light" className="pb-24" pad={false}>
        <Container>
          <div className="mx-auto mb-10 flex max-w-2xl items-center gap-5">
            <span aria-hidden className="h-px flex-1 bg-black/10" />
            <h2 className="text-center font-display-tight text-[clamp(1.75rem,3vw,2.5rem)] leading-tight">
              Browse Our Product Categories
            </h2>
            <span aria-hidden className="h-px flex-1 bg-black/10" />
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.slug] ?? Package;
              return (
                <article
                  key={cat.id}
                  className="group flex flex-col overflow-hidden rounded-md border border-black/10 bg-mec-pure shadow-[var(--shadow-card)]"
                >
                  <div className="relative aspect-[4/3] w-full">
                    <div className="absolute inset-0 overflow-hidden bg-mec-mist">
                      <Image
                        src={cat.imagePath ?? "/images/product-placeholder.png"}
                        alt={cat.name}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-contain p-4 transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                    <span className="absolute -bottom-5 left-6 z-[2] grid h-12 w-12 place-items-center rounded-full bg-mec-red text-mec-pure shadow-lg">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6 pt-8">
                    <h3 className="font-display-tight text-xl uppercase leading-tight text-mec-ink">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-mec-ink/70">
                        {cat.description}
                      </p>
                    )}
                    <Link
                      href={`/products/all?category=${cat.slug}`}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-mec-red transition-colors hover:text-mec-red-hover"
                      data-cursor="View"
                    >
                      View Products
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {/* CTA banner */}
          <div className="mt-16 flex flex-col items-center justify-between gap-6 overflow-hidden rounded-md bg-mec-ink px-8 py-8 text-mec-pure md:flex-row md:px-12">
            <div className="flex items-center gap-5">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-mec-red">
                <ShoppingCart className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="font-display-tight text-2xl">
                  Can&apos;t find what you need?
                </p>
                <p className="mt-1 text-sm text-mec-pure/70">
                  Explore our complete range or talk to a sales rep directly.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <WhatsAppCta />
              <Link
                href="/products/all"
                className="inline-flex items-center gap-2 whitespace-nowrap bg-mec-red px-8 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure transition-colors hover:bg-mec-red-hover"
                data-cursor="View"
              >
                View All Products
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>

          {/* Feature strip */}
          <div className="mt-12 grid grid-cols-1 gap-8 border-t border-black/10 pt-12 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-mec-red/10 text-mec-red">
                  <f.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.1em] text-mec-ink">
                    {f.title}
                  </p>
                  <p className="mt-1 text-sm text-mec-ink/70">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
