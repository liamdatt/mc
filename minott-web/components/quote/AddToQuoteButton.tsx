"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useQuoteCart, type QuoteItem } from "./QuoteCartProvider";
import { cn } from "@/lib/cn";

export function AddToQuoteButton({
  product,
  quantity = 1,
  variant = "primary",
  className,
}: {
  product: Omit<QuoteItem, "quantity">;
  quantity?: number;
  variant?: "primary" | "ghost-dark";
  className?: string;
}) {
  const { addItem } = useQuoteCart();
  const [added, setAdded] = useState(false);

  const base =
    "group inline-flex items-center justify-center gap-2 px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.97]";
  const styles =
    variant === "ghost-dark"
      ? "border border-white/30 text-mec-pure hover:border-mec-red hover:text-mec-red"
      : "bg-mec-red text-mec-pure hover:bg-mec-red-hover";

  return (
    <button
      type="button"
      data-cursor="Add"
      className={cn(base, styles, className)}
      onClick={() => {
        addItem(product, quantity);
        setAdded(true);
        setTimeout(() => setAdded(false), 1600);
      }}
    >
      {added ? (
        <>
          <Check className="h-4 w-4" aria-hidden /> Added
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" aria-hidden /> Add to Quote
        </>
      )}
    </button>
  );
}
