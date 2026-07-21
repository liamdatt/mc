import Image from "next/image";
import Link from "next/link";
import { FileText, FlaskConical } from "lucide-react";
import { AddToQuoteButton } from "@/components/quote/AddToQuoteButton";

// Same shape ProductRowData had (and toRow() in app/products/all/page.tsx
// produces) so the page's mapper is reused unchanged. specLabel/specValue and
// packSize are only non-null for single-variant listings.
export type ProductCardData = {
  id: number;
  slug: string;
  name: string;
  shortDescription: string | null;
  imagePath: string;
  sku: string | null;
  packSize: string | null;
  specLabel: string | null;
  specValue: string | null;
  isChemical: boolean;
  sampleAvailable: boolean;
  sdsUrl: string | null;
  categorySlug: string;
  categoryName: string;
  variantCount: number;
  onlyVariant: { id: number; sku: string; label: string } | null;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const href = `/products/${product.categorySlug}/${product.slug}`;
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-black/10 bg-mec-pure">
      <Link
        href={href}
        className="relative block aspect-square bg-mec-mist"
        data-cursor="View"
      >
        <Image
          src={product.imagePath}
          alt={product.name}
          fill
          sizes="(min-width:1280px) 20vw, (min-width:768px) 30vw, 50vw"
          className="object-contain p-3"
        />
        {product.isChemical && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-pill bg-mec-ink/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-pure">
            <FileText className="h-3 w-3" aria-hidden /> SDS
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link
          href={href}
          className="line-clamp-2 font-display-tight text-lg uppercase leading-tight text-mec-ink hover:text-mec-red"
        >
          {product.name}
        </Link>
        {product.shortDescription && (
          <p className="mt-1 line-clamp-2 text-sm text-mec-ink/70">
            {product.shortDescription}
          </p>
        )}
        <div className="mt-2 space-y-0.5 text-xs">
          {product.sku && (
            <p>
              <span className="text-mec-ink/50">SKU: </span>
              <span className="font-mono text-mec-ink/90">{product.sku}</span>
            </p>
          )}
          {product.packSize && (
            <p>
              <span className="text-mec-ink/50">Pack Size: </span>
              <span className="text-mec-ink/80">{product.packSize}</span>
            </p>
          )}
          {product.specLabel && product.specValue && (
            <p>
              <span className="text-mec-ink/50">{product.specLabel}: </span>
              <span className="text-mec-ink/90">{product.specValue}</span>
            </p>
          )}
        </div>
        {product.isChemical && product.sampleAvailable && (
          <Link
            href={href}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-mec-ink/70 hover:text-mec-red"
            data-cursor="View"
          >
            <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Request Sample
          </Link>
        )}
        <div className="mt-auto pt-4">
          {product.variantCount > 1 || !product.onlyVariant ? (
            <Link
              href={href}
              data-cursor="View"
              className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-mec-red px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-mec-pure transition-all duration-200 hover:bg-mec-red-hover active:scale-[0.97]"
            >
              Select Options
            </Link>
          ) : (
            <AddToQuoteButton
              size="sm"
              className="w-full rounded-sm"
              product={{
                productId: product.id,
                variantId: product.onlyVariant.id,
                slug: product.slug,
                name: product.name,
                sku: product.onlyVariant.sku,
                variantLabel: product.onlyVariant.label,
                imagePath: product.imagePath,
                categorySlug: product.categorySlug,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
