"use client";

import { useMemo, useState } from "react";
import { AddToQuoteButton } from "@/components/quote/AddToQuoteButton";

export type SelectableVariant = {
  id: number;
  sku: string;
  size: string | null;
  packType: string;
  label: string | null;
  imagePath: string | null;
};

type Props = {
  listing: {
    id: number;
    slug: string;
    name: string;
    imagePath: string;
    categorySlug: string;
  };
  variants: SelectableVariant[];
};

const pill =
  "rounded-full border px-4 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40";
const pillOn = "border-mec-red bg-mec-red text-mec-pure";
const pillOff = "border-mec-mist text-mec-ink hover:border-mec-ink";
const groupLabel =
  "mb-2 font-mono text-xs uppercase tracking-[0.12em] text-mec-graphite";

export function VariantSelector({ listing, variants }: Props) {
  const sizes = useMemo(
    () => [...new Set(variants.map((v) => v.size).filter((s): s is string => !!s))],
    [variants],
  );
  const packTypes = useMemo(
    () => [...new Set(variants.map((v) => v.packType))],
    [variants],
  );

  const [size, setSize] = useState<string | null>(variants[0]?.size ?? null);
  const [packType, setPackType] = useState<string>(variants[0]?.packType ?? "Each");

  const selected =
    variants.find((v) => (v.size ?? null) === size && v.packType === packType) ??
    variants.find((v) => (v.size ?? null) === size) ??
    variants[0];

  const comboExists = (s: string | null, p: string) =>
    variants.some((v) => (v.size ?? null) === s && v.packType === p);

  function pickSize(s: string) {
    setSize(s);
    if (!comboExists(s, packType)) {
      const next = packTypes.find((p) => comboExists(s, p));
      if (next) setPackType(next);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {sizes.length > 1 && (
        <div role="group" aria-label="Size">
          <p className={groupLabel}>Size</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => pickSize(s)}
                aria-pressed={size === s}
                className={`${pill} ${size === s ? pillOn : pillOff}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {packTypes.length > 1 && (
        <div role="group" aria-label="Pack">
          <p className={groupLabel}>Pack</p>
          <div className="flex flex-wrap gap-2">
            {packTypes.map((p) => {
              const disabled = !comboExists(size, p);
              return (
                <button
                  key={p}
                  type="button"
                  disabled={disabled}
                  onClick={() => setPackType(p)}
                  aria-pressed={packType === p}
                  className={`${pill} ${packType === p ? pillOn : pillOff}`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <p className="font-mono text-sm text-mec-ink/50">
          SKU: {selected.sku}
          {selected.label ? ` · ${selected.label}` : ""}
        </p>
      )}

      {selected && (
        <AddToQuoteButton
          product={{
            productId: listing.id,
            variantId: selected.id,
            slug: listing.slug,
            name: listing.name,
            sku: selected.sku,
            variantLabel: selected.label ?? "",
            imagePath: selected.imagePath ?? listing.imagePath,
            categorySlug: listing.categorySlug,
          }}
        />
      )}
    </div>
  );
}
