"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useQuoteCart, type QuoteItem } from "./QuoteCartProvider";
import { cn } from "@/lib/cn";

export function AddToQuoteButton({
  product,
  quantity = 1,
  variant = "primary",
  size = "md",
  className,
}: {
  product: Omit<QuoteItem, "quantity">;
  quantity?: number;
  variant?: "primary" | "ghost-dark";
  size?: "md" | "sm";
  className?: string;
}) {
  const { addItem } = useQuoteCart();
  const [added, setAdded] = useState(false);

  const base =
    "group inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.97]";
  const sizeCls =
    size === "sm" ? "px-3 py-2 text-[11px]" : "px-6 py-3 text-[13px]";
  const styles =
    variant === "ghost-dark"
      ? "border border-white/30 text-mec-pure hover:border-mec-red hover:text-mec-red"
      : "bg-mec-red text-mec-pure hover:bg-mec-red-hover";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <button
      type="button"
      data-cursor="Add"
      className={cn(base, sizeCls, styles, className)}
      onClick={() => {
        addItem(product, quantity);
        setAdded(true);
        setTimeout(() => setAdded(false), 1600);
      }}
    >
      {added ? (
        <>
          <Check className={icon} aria-hidden /> Added
        </>
      ) : (
        <>
          <Plus className={icon} aria-hidden /> Add to Quote
        </>
      )}
    </button>
  );
}
