"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import {
  VariantSelector,
  type SelectableVariant,
} from "./VariantSelector";
import { SampleRequestForm } from "./SampleRequestForm";

export function ProductDetailActions({
  product,
  variants,
}: {
  product: {
    id: number;
    slug: string;
    name: string;
    imagePath: string;
    categorySlug: string;
    isChemical: boolean;
    sampleAvailable: boolean;
    sdsUrl: string | null;
  };
  variants: SelectableVariant[];
}) {
  const [showSample, setShowSample] = useState(false);

  return (
    <div className="mt-8">
      <VariantSelector
        listing={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          imagePath: product.imagePath,
          categorySlug: product.categorySlug,
        }}
        variants={variants}
      />

      <div className="mt-5 flex flex-wrap gap-3">
        {product.isChemical &&
          (product.sdsUrl ? (
            <a
              href={product.sdsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-mec-ink px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-mec-ink transition hover:border-mec-red hover:text-mec-red"
              data-cursor="Open"
            >
              <FileText className="h-4 w-4" aria-hidden /> View SDS
            </a>
          ) : (
            <span
              className="inline-flex cursor-not-allowed items-center gap-2 border border-black/20 px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-mec-ink/40"
              title="SDS available on request"
            >
              <FileText className="h-4 w-4" aria-hidden /> SDS on request
            </span>
          ))}

        {product.isChemical && product.sampleAvailable && (
          <button
            type="button"
            onClick={() => setShowSample((v) => !v)}
            className="inline-flex items-center gap-2 border border-mec-ink px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-mec-ink transition hover:border-mec-red hover:text-mec-red"
          >
            {showSample ? "Hide sample form" : "Request Sample"}
          </button>
        )}
      </div>

      {showSample && product.sampleAvailable && (
        <div className="mt-6 rounded-md border border-black/10 bg-mec-mist p-6">
          <h3 className="font-display-tight text-h3 text-mec-ink">
            Request a sample
          </h3>
          <p className="mt-1 mb-4 text-sm text-mec-ink/70">
            Tell us where to send it and we&apos;ll arrange a sample.
          </p>
          <SampleRequestForm
            productId={product.id}
            productName={product.name}
            variants={variants.map((v) => ({
              id: v.id,
              sku: v.sku,
              label: v.label,
              size: v.size,
              packType: v.packType,
            }))}
          />
        </div>
      )}
    </div>
  );
}
