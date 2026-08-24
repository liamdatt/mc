import Image from "next/image";
import Link from "next/link";
import { dealLabel, type DealCard } from "@/lib/deals";

// Shared deal card — rendered both in the homepage FeaturedDeals grid and
// the /deals page. Server component; no prices, ever.
export function DealCardView({ deal }: { deal: DealCard }) {
  const href = `/products/${deal.product.category.slug}/${deal.product.slug}`;
  const imagePath = deal.variant?.imagePath ?? deal.product.imagePath;
  const variantLine = deal.variant
    ? (deal.variant.label ?? deal.variant.sku)
    : null;
  const copy = deal.description ?? deal.product.shortDescription;

  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-white/10 bg-white/[0.03]">
      <div className="relative aspect-square bg-white/5">
        <Image
          src={imagePath}
          alt={deal.product.name}
          fill
          sizes="(min-width:1280px) 20vw, (min-width:768px) 30vw, 50vw"
          className="object-contain p-4"
        />
        <span className="absolute left-3 top-3 z-10 rounded-pill bg-mec-red px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-pure">
          {dealLabel(deal)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow inline-flex items-center text-mec-red">
          <span aria-hidden className="mr-3 h-px w-8 bg-mec-red" />
          {deal.product.category.name}
        </p>
        <h3 className="mt-4 font-display-tight text-xl uppercase text-mec-pure">
          {deal.product.name}
        </h3>
        {variantLine && (
          <p className="mt-1 text-sm text-mec-pure/60">{variantLine}</p>
        )}
        {copy && (
          <p className="mt-3 line-clamp-3 text-sm text-mec-pure/70">{copy}</p>
        )}
        <div className="mt-auto pt-6">
          <Link
            href={href}
            data-cursor="View"
            className="inline-flex w-full items-center justify-center gap-2 border border-white/25 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-mec-pure transition-colors duration-200 hover:border-mec-red"
          >
            View Deal →
          </Link>
        </div>
      </div>
    </div>
  );
}
