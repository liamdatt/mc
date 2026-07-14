"use client";

import { useMemo } from "react";
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
  /** Heading for the option pills — e.g. "Size", "Scent". Defaults to "Size". */
  optionLabel?: string | null;
  /** Controlled: the currently-selected variant (owned by the parent so the
   *  hero image and other UI can react to the same selection). */
  selected: SelectableVariant;
  onSelect: (variant: SelectableVariant) => void;
};

const pill =
  "rounded-full border px-4 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40";
const pillOn = "border-mec-red bg-mec-red text-mec-pure";
const pillOff = "border-mec-mist text-mec-ink hover:border-mec-ink";
const groupLabel =
  "mb-2 font-mono text-xs uppercase tracking-[0.12em] text-mec-graphite";

export function VariantSelector({ listing, variants, optionLabel, selected, onSelect }: Props) {
  const sizeHeading = optionLabel?.trim() || "Size";
  const sizes = useMemo(
    () => [...new Set(variants.map((v) => v.size).filter((s): s is string => !!s))],
    [variants],
  );
  const packTypes = useMemo(
    () => [...new Set(variants.map((v) => v.packType))],
    [variants],
  );

  const size = selected.size;
  const packType = selected.packType;

  const variantFor = (s: string | null, p: string) =>
    variants.find((v) => (v.size ?? null) === s && v.packType === p);
  const comboExists = (s: string | null, p: string) => !!variantFor(s, p);

  function pickSize(s: string) {
    // Keep the current pack type if this size offers it, else snap to the first
    // available pack for that size — so the selection never lands on a missing combo.
    const next =
      variantFor(s, packType) ??
      packTypes.map((p) => variantFor(s, p)).find(Boolean) ??
      variants.find((v) => (v.size ?? null) === s);
    if (next) onSelect(next);
  }

  function pickPack(p: string) {
    const next = variantFor(size, p);
    if (next) onSelect(next);
  }

  return (
    <div className="flex flex-col gap-5">
      {sizes.length > 1 && (
        <div role="group" aria-label={sizeHeading}>
          <p className={groupLabel}>{sizeHeading}</p>
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
                  onClick={() => pickPack(p)}
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

      <p className="font-mono text-sm text-mec-ink/50">
        SKU: {selected.sku}
        {selected.label ? ` · ${selected.label}` : ""}
      </p>

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
    </div>
  );
}
