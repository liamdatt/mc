import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlugInCategory } from "@/lib/products";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { ProductDetailView } from "@/components/products/ProductDetailView";
import { ShowroomBanner } from "@/components/products/ShowroomBanner";
import { WhatsAppCta } from "@/components/products/WhatsAppCta";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const product = await getProductBySlugInCategory(category, slug);
  if (!product) return { title: "Product not found — Minott Chemicals" };
  return {
    title: `${product.name} — Minott Chemicals`,
    description: product.shortDescription ?? undefined,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const product = await getProductBySlugInCategory(category, slug);
  if (!product) notFound();

  return (
    <>
      <ShowroomBanner />
      <Section tone="light" className="pt-16">
      <Container>
        <nav className="text-sm text-mec-ink/60">
          <Link href="/products" className="hover:text-mec-red">
            Products
          </Link>{" "}
          /{" "}
          <Link
            href={`/products/all?category=${product.category.slug}`}
            className="hover:text-mec-red"
          >
            {product.category.name}
          </Link>{" "}
          / <span className="text-mec-ink">{product.name}</span>
        </nav>

        <ProductDetailView
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            shortDescription: product.shortDescription,
            description: product.description,
            imagePath: product.imagePath,
            categorySlug: product.category.slug,
            categoryName: product.category.name,
            isChemical: product.isChemical,
            sampleAvailable: product.sampleAvailable,
            sdsUrl: product.sdsUrl,
            optionLabel: product.optionLabel,
          }}
          variants={product.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            size: v.size,
            packType: v.packType,
            label: v.label,
            imagePath: v.imagePath,
          }))}
        />
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
