import Image from "next/image";
import Link from "next/link";
import { FileText, FlaskConical } from "lucide-react";
import { AddToQuoteButton } from "@/components/quote/AddToQuoteButton";

export type ProductRowData = {
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
};

const pill =
  "inline-flex items-center justify-center gap-1.5 rounded-sm border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors";

export function ProductRow({ product }: { product: ProductRowData }) {
  const href = `/products/${product.categorySlug}/${product.slug}`;
  return (
    <div className="grid grid-cols-[80px_1fr] items-start gap-4 border-b border-black/10 py-6 lg:grid-cols-[100px_minmax(0,1fr)_170px_220px] lg:items-center lg:gap-6">
      {/* Image */}
      <Link
        href={href}
        className="relative h-20 w-20 overflow-hidden rounded-sm border border-black/5 bg-mec-mist lg:h-24 lg:w-24"
        data-cursor="View"
      >
        <Image
          src={product.imagePath}
          alt={product.name}
          fill
          sizes="100px"
          className="object-contain p-1.5"
        />
      </Link>

      {/* Main info */}
      <div className="min-w-0">
        <Link
          href={href}
          className="font-display-tight text-lg uppercase leading-tight text-mec-ink hover:text-mec-red lg:text-xl"
        >
          {product.name}
        </Link>
        {product.shortDescription && (
          <p className="mt-1 line-clamp-2 text-sm text-mec-ink/70">
            {product.shortDescription}
          </p>
        )}
        <p className="mt-2 text-xs">
          <span className="text-mec-ink/50">Category: </span>
          <Link
            href={`/products/all?category=${product.categorySlug}`}
            className="font-semibold text-mec-red hover:underline"
          >
            {product.categoryName}
          </Link>
        </p>
        {product.packSize && (
          <p className="text-xs">
            <span className="text-mec-ink/50">Pack Size: </span>
            <span className="text-mec-ink/80">{product.packSize}</span>
          </p>
        )}
      </div>

      {/* Spec column */}
      <div className="col-start-2 text-xs text-mec-ink/70 lg:col-start-auto lg:border-l lg:border-black/10 lg:pl-6">
        {product.sku && (
          <p>
            <span className="text-mec-ink/50">SKU: </span>
            <span className="font-mono text-mec-ink/90">{product.sku}</span>
          </p>
        )}
        {product.specLabel && product.specValue && (
          <p className="mt-1">
            <span className="text-mec-ink/50">{product.specLabel}: </span>
            <span className="text-mec-ink/90">{product.specValue}</span>
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="col-start-2 flex flex-col gap-2 lg:col-start-auto">
        {product.isChemical &&
          (product.sdsUrl ? (
            <a
              href={product.sdsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${pill} border-black/15 text-mec-ink/80 hover:border-mec-red hover:text-mec-red`}
              data-cursor="Open"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden /> View SDS
            </a>
          ) : (
            <span
              className={`${pill} border-black/15 text-mec-ink/80 hover:border-mec-red hover:text-mec-red`}
              title="SDS available on request"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden /> View SDS
            </span>
          ))}

        {product.isChemical && product.sampleAvailable && (
          <Link
            href={href}
            className={`${pill} border-black/15 text-mec-ink/80 hover:border-mec-red hover:text-mec-red`}
            data-cursor="View"
          >
            <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Request Sample
          </Link>
        )}

        <AddToQuoteButton
          size="sm"
          className="w-full rounded-sm"
          product={{
            productId: product.id,
            slug: product.slug,
            name: product.name,
            imagePath: product.imagePath,
            categorySlug: product.categorySlug,
          }}
        />
      </div>
    </div>
  );
}
