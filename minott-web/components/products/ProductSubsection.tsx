import { ProductCard, type ProductCardData } from "@/components/products/ProductCard";

/**
 * A subsection heading (a child category) with its products beneath it.
 * Rendered when a parent category like Chemicals has child categories so the
 * listing groups products under subsection headings instead of a flat list.
 */
export function ProductSubsection({
  title,
  description,
  products,
}: {
  title: string;
  description?: string | null;
  products: ProductCardData[];
}) {
  if (products.length === 0) return null;
  return (
    <section className="mb-10 last:mb-0">
      <div className="flex items-baseline gap-4 border-b-2 border-mec-red/30 pb-2">
        <h2 className="font-display-tight text-2xl uppercase leading-tight text-mec-ink">
          {title}
        </h2>
        <span className="text-xs text-mec-ink/50">
          {products.length} {products.length === 1 ? "item" : "items"}
        </span>
      </div>
      {description && (
        <p className="mt-2 text-sm text-mec-ink/70">{description}</p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
