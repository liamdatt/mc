import type { Metadata } from "next";
import Link from "next/link";
import {
  getCategoriesWithCounts,
  getFormOptions,
  getProductsForListing,
  type ListingSort,
} from "@/lib/products";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { ProductRow } from "@/components/products/ProductRow";
import { ProductFilterSidebar } from "@/components/products/ProductFilterSidebar";
import { ProductSort } from "@/components/products/ProductSort";

export const metadata: Metadata = {
  title: "All Products — Chemicals, Janitorial, PPE & Paper | Minott Chemicals",
  description:
    "Browse Minott's full catalog: manufactured industrial & household chemicals, janitorial equipment, PPE, and paper products. Add items to your quote.",
};

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; form?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const sort: ListingSort = sp.sort === "za" ? "za" : "az";

  const [categories, forms, products] = await Promise.all([
    getCategoriesWithCounts(),
    getFormOptions(),
    getProductsForListing({ categorySlug: sp.category, form: sp.form, sort }),
  ]);

  const activeCategory = categories.find((c) => c.slug === sp.category);

  return (
    <Section tone="light" className="pt-40">
      <Container>
        <nav className="text-sm text-mec-ink/60">
          <Link href="/" className="hover:text-mec-red">
            Home
          </Link>{" "}
          /{" "}
          <Link href="/products" className="hover:text-mec-red">
            Products
          </Link>
          {activeCategory && (
            <>
              {" "}
              / <span className="text-mec-ink">{activeCategory.name}</span>
            </>
          )}
        </nav>

        <Eyebrow tone="red" className="mt-6">
          Catalog
        </Eyebrow>
        <h1 className="mt-4 font-display-tight text-h1 leading-[0.95]">
          {activeCategory ? (
            activeCategory.name
          ) : (
            <>
              All <span className="text-mec-red">Products</span>
            </>
          )}
        </h1>
        <p className="mt-6 max-w-2xl text-lede text-mec-ink/80">
          Browse our complete range of high-quality chemicals, equipment, and
          supplies for every industry and business need.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <ProductFilterSidebar
            categories={categories}
            forms={forms}
            active={{ category: sp.category, form: sp.form, sort: sp.sort }}
          />

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-4">
              <p className="text-sm text-mec-ink/70">
                Showing{" "}
                <span className="font-semibold text-mec-ink">
                  {products.length}
                </span>{" "}
                {products.length === 1 ? "product" : "products"}
              </p>
              <ProductSort />
            </div>

            {products.length === 0 ? (
              <p className="py-16 text-center text-mec-ink/60">
                No products match these filters.
              </p>
            ) : (
              <div
                data-lenis-prevent
                className="h-[46rem] overflow-y-auto pr-2"
              >
                {products.map((p) => (
                  <ProductRow
                    key={p.id}
                    product={{
                      id: p.id,
                      slug: p.slug,
                      name: p.name,
                      shortDescription: p.shortDescription,
                      imagePath: p.imagePath,
                      sku: p.sku,
                      packSize: p.packSize,
                      specLabel: p.specLabel,
                      specValue: p.specValue,
                      isChemical: p.isChemical,
                      sampleAvailable: p.sampleAvailable,
                      sdsUrl: p.sdsUrl,
                      categorySlug: p.category.slug,
                      categoryName: p.category.name,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
