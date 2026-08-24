"use client";

import { useState } from "react";
import Image from "next/image";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { ProductDetailActions } from "./ProductDetailActions";
import type { ProductDealBadge, SelectableVariant } from "./VariantSelector";

type Props = {
  product: {
    id: number;
    slug: string;
    name: string;
    shortDescription: string | null;
    description: string | null;
    imagePath: string;
    categorySlug: string;
    categoryName: string;
    isChemical: boolean;
    sampleAvailable: boolean;
    sdsUrl: string | null;
    optionLabel: string | null;
  };
  variants: SelectableVariant[];
  /** Live deal badges for this product only (pre-filtered by the server page). */
  dealBadges?: ProductDealBadge[];
};

export function ProductDetailView({
  product,
  variants,
  dealBadges = [],
}: Props) {
  const [selected, setSelected] = useState<SelectableVariant>(variants[0]);

  // The SKU-scoped badge wins when its variant is selected; otherwise the
  // product-level badge shows (mirrors pickBadgeForVariant server-side).
  const badge =
    dealBadges.find((b) => b.variantId === selected?.id) ??
    dealBadges.find((b) => b.variantId == null) ??
    null;

  // The hero image follows the chosen variant, falling back to the listing image.
  const heroImage = selected?.imagePath ?? product.imagePath;

  return (
    <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-2">
      <div className="relative aspect-square overflow-hidden rounded-md bg-mec-mist">
        <Image
          key={heroImage}
          src={heroImage}
          alt={selected?.label ? `${product.name} — ${selected.label}` : product.name}
          fill
          sizes="(min-width:1024px) 50vw, 100vw"
          className="object-contain p-6"
          priority
        />
      </div>

      <div className="flex flex-col justify-center">
        <Eyebrow tone="red">{product.categoryName}</Eyebrow>
        <h1 className="mt-4 font-display-tight text-h2 leading-[1]">
          {product.name}
        </h1>
        {badge && (
          <p className="mt-3">
            <span className="inline-flex items-center rounded-pill bg-mec-red px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-pure">
              {badge.label}
            </span>
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
            categorySlug: product.categorySlug,
            isChemical: product.isChemical,
            sampleAvailable: product.sampleAvailable,
            sdsUrl: product.sdsUrl,
            optionLabel: product.optionLabel,
          }}
          variants={variants}
          selected={selected}
          onSelect={setSelected}
          dealBadges={dealBadges}
        />
      </div>
    </div>
  );
}
