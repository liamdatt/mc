import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getCatalog, getFeaturedProducts } from "@/lib/products";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { AddToQuoteButton } from "@/components/quote/AddToQuoteButton";

export const metadata: Metadata = {
  title: "Products — Chemicals, Janitorial, PPE & Paper | Minott Chemicals",
  description:
    "Browse Minott's full catalog: manufactured industrial & household chemicals, janitorial equipment, PPE, and paper products. Add items to your quote.",
};

export default async function ProductsPage() {
  const [catalog, featured] = await Promise.all([
    getCatalog(),
    getFeaturedProducts(),
  ]);

  return (
    <Section tone="light" className="pt-40">
      <Container>
        <Eyebrow tone="red">Our Catalog</Eyebrow>
        <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95]">
          Four categories. One supplier.
        </h1>
        <p className="mt-8 max-w-2xl text-lede text-mec-ink/80">
          From hospital-grade disinfectant to bulk bathroom tissue — explore by
          category and build a quote as you go.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {catalog.map((cat) => (
            <Link
              key={cat.id}
              href={`/products/${cat.slug}`}
              className="group relative aspect-[4/5] overflow-hidden rounded-md"
              data-cursor="View"
            >
              <Image
                src={cat.imagePath ?? "/images/product-placeholder.png"}
                alt={cat.name}
                fill
                sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-mec-ink via-mec-ink/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-mec-pure">
                <h2 className="font-display-tight text-2xl leading-tight">
                  {cat.name}
                </h2>
                <p className="mt-1 text-sm text-mec-pure/70">
                  {cat.products.length} products
                </p>
              </div>
            </Link>
          ))}
        </div>

        {featured.length > 0 && (
          <div className="mt-20">
            <h2 className="font-display-tight text-h2">Featured</h2>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col overflow-hidden rounded-md border border-black/10 bg-mec-pure"
                >
                  <Link
                    href={`/products/${p.category.slug}/${p.slug}`}
                    className="relative block aspect-square"
                    data-cursor="View"
                  >
                    <Image
                      src={p.imagePath}
                      alt={p.name}
                      fill
                      sizes="(min-width:1024px) 25vw, 50vw"
                      className="object-cover"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <Link
                      href={`/products/${p.category.slug}/${p.slug}`}
                      className="font-display-tight text-xl leading-tight hover:text-mec-red"
                    >
                      {p.name}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-mec-ink/70">
                      {p.shortDescription}
                    </p>
                    <div className="mt-4 pt-2">
                      <AddToQuoteButton
                        product={{
                          productId: p.id,
                          slug: p.slug,
                          name: p.name,
                          imagePath: p.imagePath,
                          categorySlug: p.category.slug,
                        }}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Container>
    </Section>
  );
}
