"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw } from "lucide-react";
import { useQuoteCart, type QuoteItem } from "@/components/quote/QuoteCartProvider";

/**
 * Reorder control for a past quote. Pushes the still-available line items back
 * into the existing quote cart (QuoteCartProvider) and sends the customer to
 * /quote. Items whose product no longer exists are skipped (the parent passes
 * only resolvable lines); when nothing is left to add the button is disabled.
 *
 * This is the portal-side consumer of the shared cart hook — the quote
 * components themselves are not modified.
 */
export function ReorderButton({
  items,
  label = "Reorder all",
}: {
  items: QuoteItem[];
  label?: string;
}) {
  const router = useRouter();
  const { addItem } = useQuoteCart();
  const [done, setDone] = useState(false);

  const disabled = items.length === 0;

  function handleClick() {
    if (disabled) return;
    for (const { quantity, ...rest } of items) {
      addItem(rest, quantity);
    }
    setDone(true);
    router.push("/quote");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 bg-mec-red px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-mec-pure transition-all duration-200 hover:bg-mec-red-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {done ? (
        <>
          <Check className="h-4 w-4" aria-hidden /> Added to quote
        </>
      ) : (
        <>
          <RotateCcw className="h-4 w-4" aria-hidden /> {label}
        </>
      )}
    </button>
  );
}

/**
 * Single-line "Add to quote" for one historical item. Adds just that product
 * back to the cart without navigating away.
 */
export function ReorderItemButton({ item }: { item: QuoteItem }) {
  const { addItem } = useQuoteCart();
  const [added, setAdded] = useState(false);

  function handleClick() {
    const { quantity, ...rest } = item;
    addItem(rest, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-pill border border-mec-ink/15 px-3 py-1.5 text-xs font-semibold text-mec-ink/70 transition-colors hover:border-mec-red hover:text-mec-red"
    >
      {added ? (
        <>
          <Check className="h-3.5 w-3.5" aria-hidden /> Added
        </>
      ) : (
        "Add to quote"
      )}
    </button>
  );
}
