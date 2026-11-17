import Image from "next/image";
import Link from "next/link";
import { dealLabel, type DealCard } from "@/lib/deals";
import { cn } from "@/lib/cn";

// Dark is the default (the /deals page); light is used on the homepage.
const TONES = {
  dark: {
    card: "border-white/10 bg-white/[0.03]",
    well: "bg-white/5",
    img: "",
    title: "text-mec-pure",
    variant: "text-mec-pure/60",
    copy: "text-mec-pure/70",
    link: "border-white/25 text-mec-pure hover:border-mec-red",
  },
  light: {
    card: "border-mec-ink/10 bg-mec-pure shadow-card",
    well: "bg-mec-mist",
    // White-backed product shots blend into the grey well.
    img: "mix-blend-multiply",
    title: "text-mec-ink",
    variant: "text-mec-ink/60",
    copy: "text-mec-ink/70",
    link: "border-mec-ink/20 text-mec-ink hover:border-mec-red hover:text-mec-red",
  },
} as const;

// Shared deal card — rendered both in the homepage FeaturedDeals grid and
// the /deals page. Server component; no prices, ever.
export function DealCardView({
  deal,
  tone = "dark",
}: {
  deal: DealCard;
  tone?: "dark" | "light";
}) {
  const t = TONES[tone];
  const href = `/products/${deal.product.category.slug}/${deal.product.slug}`;
  const imagePath = deal.variant?.imagePath ?? deal.product.imagePath;
  const variantLine = deal.variant
    ? (deal.variant.label ?? deal.variant.sku)
    : null;
  const copy = deal.description ?? deal.product.shortDescription;

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-md border", t.card)}>
      <div className={cn("relative aspect-square", t.well)}>
        <Image
          src={imagePath}
          alt={deal.product.name}
          fill
          sizes="(min-width:1280px) 20vw, (min-width:768px) 30vw, 50vw"
          className={cn("object-contain p-4", t.img)}
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
        <h3 className={cn("mt-4 font-display-tight text-xl uppercase", t.title)}>
          {deal.product.name}
        </h3>
        {variantLine && (
          <p className={cn("mt-1 text-sm", t.variant)}>{variantLine}</p>
        )}
        {copy && (
          <p className={cn("mt-3 line-clamp-3 text-sm", t.copy)}>{copy}</p>
        )}
        <div className="mt-auto pt-6">
          <Link
            href={href}
            data-cursor="View"
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200",
              t.link,
            )}
          >
            View Deal →
          </Link>
        </div>
      </div>
    </div>
  );
}
