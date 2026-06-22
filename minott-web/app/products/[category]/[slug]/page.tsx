import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlugInCategory } from "@/lib/products";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { ProductDetailActions } from "@/components/products/ProductDetailActions";
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
              variants={product.variants.map((v) => ({
                id: v.id,
                sku: v.sku,
                size: v.size,
                packType: v.packType,
                label: v.label,
                imagePath: v.imagePath,
              }))}
            />
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
