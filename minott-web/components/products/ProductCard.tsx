import Image from "next/image";
import Link from "next/link";
import { FileText } from "lucide-react";
import { AddToQuoteButton } from "@/components/quote/AddToQuoteButton";

export type ProductCardData = {
  id: number;
  slug: string;
  name: string;
  shortDescription: string | null;
  imagePath: string;
  isChemical: boolean;
  categorySlug: string;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const href = `/products/${product.categorySlug}/${product.slug}`;
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-black/10 bg-mec-pure">
      <Link href={href} className="relative block aspect-square" data-cursor="View">
        <Image
          src={product.imagePath}
          alt={product.name}
          fill
          sizes="(min-width:1024px) 25vw, 50vw"
          className="object-cover"
        />
        {product.isChemical && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-pill bg-mec-ink/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-pure">
            <FileText className="h-3 w-3" aria-hidden /> SDS
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <Link
          href={href}
          className="font-display-tight text-xl leading-tight hover:text-mec-red"
        >
          {product.name}
        </Link>
        {product.shortDescription && (
          <p className="mt-1 line-clamp-2 text-sm text-mec-ink/70">
            {product.shortDescription}
          </p>
        )}
        <div className="mt-4 pt-2">
          <AddToQuoteButton
            product={{
              productId: product.id,
              slug: product.slug,
              name: product.name,
              imagePath: product.imagePath,
              categorySlug: product.categorySlug,
            }}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
