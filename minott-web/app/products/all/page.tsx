import type { Metadata } from "next";
import Link from "next/link";
import {
  getCategoriesWithCounts,
  getCategoryWithChildren,
  getColorOptions,
  getFormOptions,
  getIndustryOptions,
  getProductsForListing,
  getVolumeOptions,
  type ListingSort,
} from "@/lib/products";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { ProductRow, type ProductRowData } from "@/components/products/ProductRow";
import { ProductSubsection } from "@/components/products/ProductSubsection";
import { ProductFilterSidebar } from "@/components/products/ProductFilterSidebar";
import { ProductSort } from "@/components/products/ProductSort";
import { ProductSearchBar } from "@/components/products/ProductSearchBar";
import { ShowroomBanner } from "@/components/products/ShowroomBanner";
import { WhatsAppCta } from "@/components/products/WhatsAppCta";

export const metadata: Metadata = {
  title: "All Products — Chemicals, Janitorial, PPE & Paper | Minott Chemicals",
  description:
    "Browse Minott's full catalog: manufactured industrial & household chemicals, janitorial equipment, PPE, and paper products. Add items to your quote.",
};

type ProductWithCategory = Awaited<
  ReturnType<typeof getProductsForListing>
>[number];

/** Map a Prisma product (with category) to the shape ProductRow expects. */
function toRow(p: ProductWithCategory): ProductRowData {
  const variantCount = p.variants.length;
  const first = p.variants[0] ?? null;
  const onlyVariant =
    variantCount === 1 && first
      ? { id: first.id, sku: first.sku, label: first.label ?? "" }
      : null;

  // Listings no longer carry their own SKU / pack / spec — those live on the
  // variants. Surface the first variant's SKU + pack as a representative value,
  // and only show the spec pair when a single variant makes it unambiguous.
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    imagePath: p.imagePath,
    sku: first?.sku ?? null,
    packSize: variantCount === 1 ? first?.packSize ?? null : null,
    specLabel: variantCount === 1 ? first?.specLabel ?? null : null,
    specValue: variantCount === 1 ? first?.specValue ?? null : null,
    isChemical: p.isChemical,
    sampleAvailable: p.sampleAvailable,
    sdsUrl: p.sdsUrl,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
    variantCount,
    onlyVariant,
  };
}

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    form?: string;
    industry?: string;
    volume?: string;
    color?: string;
    q?: string;
    sort?: string;
  }>;
}) {
  const sp = await searchParams;
  const sort: ListingSort = sp.sort === "za" ? "za" : "az";
  const q = sp.q?.trim() || undefined;

  // Filter-option pools are scoped to the active category when one is set, so
  // e.g. Volume/Colour only surface values that actually exist for Chemicals.
  const [categories, forms, industries, volumes, colors] = await Promise.all([
    getCategoriesWithCounts(),
    getFormOptions(),
    getIndustryOptions(sp.category),
    getVolumeOptions(sp.category),
    getColorOptions(sp.category),
  ]);

  const activeCategory = categories.find((c) => c.slug === sp.category);

  // When a category is active, check whether it has child subsections; if so we
  // render products grouped under subsection headings. getCategoryWithChildren
  // honors the same search/filter opts.
  const grouped = sp.category
    ? await getCategoryWithChildren(sp.category, {
        q,
        industry: sp.industry,
        volume: sp.volume,
        color: sp.color,
        sort,
      })
    : null;
  const useSubsections = !!grouped && grouped.children.length > 0;

  // Flat product list (no category w/ children, or the "all" view).
  const products = useSubsections
    ? grouped!.products
    : await getProductsForListing({
        categorySlug: sp.category,
        form: sp.form,
        q,
        industry: sp.industry,
        volume: sp.volume,
        color: sp.color,
        sort,
      });

  const totalCount = products.length;

  // Bucket products into their subsections (child categories), with an
  // "all"-style ungrouped bucket for products filed directly on the parent.
  let subsectionBuckets: {
    slug: string;
    name: string;
    description?: string | null;
    rows: ProductRowData[];
  }[] = [];
  let ungrouped: ProductRowData[] = [];
  if (useSubsections && grouped) {
    const childSlugs = new Set(grouped.children.map((c) => c.slug));
    subsectionBuckets = grouped.children.map((c) => ({
      slug: c.slug,
      name: c.name,
      description: c.description,
      rows: products.filter((p) => p.category.slug === c.slug).map(toRow),
    }));
    ungrouped = products
      .filter((p) => !childSlugs.has(p.category.slug))
      .map(toRow);
  }

  return (
    <>
      <ShowroomBanner />
      <Section tone="light" className="pt-16">
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

        <div className="mt-8 max-w-xl">
          <ProductSearchBar />
        </div>
        <p className="mt-4 text-sm text-mec-ink/60">
          Add items to your quote as you browse, then submit it from the
          top-right — we respond within{" "}
          <span className="font-semibold text-mec-ink/80">48 hours</span>.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <ProductFilterSidebar
            categories={categories}
            forms={forms}
            industries={industries}
            volumes={volumes}
            colors={colors}
            active={{
              category: sp.category,
              form: sp.form,
              industry: sp.industry,
              volume: sp.volume,
              color: sp.color,
              sort: sp.sort,
              q,
            }}
          />

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-4">
              <p className="text-sm text-mec-ink/70">
                Showing{" "}
                <span className="font-semibold text-mec-ink">{totalCount}</span>{" "}
                {totalCount === 1 ? "product" : "products"}
                {q && (
                  <>
                    {" "}
                    for{" "}
                    <span className="font-semibold text-mec-ink">
                      &ldquo;{q}&rdquo;
                    </span>
                  </>
                )}
              </p>
              <ProductSort />
            </div>

            {totalCount === 0 ? (
              <p className="py-16 text-center text-mec-ink/60">
                No products match these filters.
              </p>
            ) : useSubsections ? (
              <div data-lenis-prevent className="h-[46rem] overflow-y-auto pr-2">
                {subsectionBuckets.map((b) => (
                  <ProductSubsection
                    key={b.slug}
                    title={b.name}
                    description={b.description}
                    products={b.rows}
                  />
                ))}
                {ungrouped.length > 0 && (
                  <ProductSubsection title="Other" products={ungrouped} />
                )}
              </div>
            ) : (
              <div data-lenis-prevent className="h-[46rem] overflow-y-auto pr-2">
                {products.map((p) => (
                  <ProductRow key={p.id} product={toRow(p)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    </Section>

      {/* Can't find what you need — WhatsApp CTA */}
      <div className="border-t border-black/10 bg-mec-mist/60 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-display-tight text-xl text-mec-ink">
              Can&apos;t find what you need?
            </p>
            <p className="mt-1 text-sm text-mec-ink/70">
              Our sales team is happy to help you find the right product.
            </p>
          </div>
          <WhatsAppCta />
        </div>
      </div>
    </>
  );
}
