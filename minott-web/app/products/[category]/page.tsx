import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/products";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { ProductCard } from "@/components/products/ProductCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);
  if (!cat) return { title: "Category not found — Minott Chemicals" };
  return {
    title: `${cat.name} — Minott Chemicals`,
    description: cat.description ?? undefined,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);
  if (!cat) notFound();

  return (
    <Section tone="light" className="pt-40">
      <Container>
        <nav className="text-sm text-mec-ink/60">
          <Link href="/products" className="hover:text-mec-red">
            Products
          </Link>{" "}
          / <span className="text-mec-ink">{cat.name}</span>
        </nav>
        <Eyebrow tone="red" className="mt-6">
          Catalog
        </Eyebrow>
        <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95]">
          {cat.name}
        </h1>
        {cat.description && (
          <p className="mt-8 max-w-2xl text-lede text-mec-ink/80">
            {cat.description}
          </p>
        )}

        {cat.products.length === 0 ? (
          <p className="mt-12 text-mec-ink/60">
            No products in this category yet.
          </p>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {cat.products.map((p) => (
              <ProductCard
                key={p.id}
                product={{
                  id: p.id,
                  slug: p.slug,
                  name: p.name,
                  shortDescription: p.shortDescription,
                  imagePath: p.imagePath,
                  isChemical: p.isChemical,
                  categorySlug: cat.slug,
                }}
              />
            ))}
          </div>
        )}
      </Container>
    </Section>
  );
}
