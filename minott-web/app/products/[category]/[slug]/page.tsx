import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlugInCategory } from "@/lib/products";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { ProductDetailActions } from "@/components/products/ProductDetailActions";

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
    <Section tone="light" className="pt-40">
      <Container>
        <nav className="text-sm text-mec-ink/60">
          <Link href="/products" className="hover:text-mec-red">
            Products
          </Link>{" "}
          /{" "}
          <Link
            href={`/products/${product.category.slug}`}
            className="hover:text-mec-red"
          >
            {product.category.name}
          </Link>{" "}
          / <span className="text-mec-ink">{product.name}</span>
        </nav>

        <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-md bg-mec-mist">
            <Image
              src={product.imagePath}
              alt={product.name}
              fill
              sizes="(min-width:1024px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          </div>

          <div className="flex flex-col justify-center">
            <Eyebrow tone="red">{product.category.name}</Eyebrow>
            <h1 className="mt-4 font-display-tight text-h2 leading-[1]">
              {product.name}
            </h1>
            {product.sku && (
              <p className="mt-3 font-mono text-sm text-mec-ink/50">
                SKU: {product.sku}
              </p>
            )}
            {product.shortDescription && (
              <p className="mt-6 text-lede text-mec-ink/80">
                {product.shortDescription}
              </p>
            )}
            {product.description && (
              <p className="mt-4 text-mec-ink/75">{product.description}</p>
            )}

            <ProductDetailActions
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                imagePath: product.imagePath,
                categorySlug: product.category.slug,
                isChemical: product.isChemical,
                sampleAvailable: product.sampleAvailable,
                sdsUrl: product.sdsUrl,
              }}
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
