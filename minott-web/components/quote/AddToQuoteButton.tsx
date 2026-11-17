"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { useQuoteCart, type QuoteItem, type QuoteLogo } from "./QuoteCartProvider";
import { cn } from "@/lib/cn";

export function AddToQuoteButton({
  product,
  quantity = 1,
  logo,
  disabled = false,
  variant = "primary",
  size = "md",
  className,
}: {
  product: Omit<QuoteItem, "quantity" | "logo">;
  quantity?: number;
  /** Optional custom logo to set on the cart line (mats only). */
  logo?: QuoteLogo;
  disabled?: boolean;
  variant?: "primary" | "ghost-dark";
  size?: "md" | "sm";
  className?: string;
}) {
  const { items, addItem } = useQuoteCart();
  const [added, setAdded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The cart hydrates from localStorage after mount; render the plain label
  // until then so server and first client render agree.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const inCart = mounted
    ? (items.find((i) => i.variantId === product.variantId)?.quantity ?? 0)
    : 0;

  const base =
    "group inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.97]";
  const sizeCls =
    size === "sm" ? "px-3 py-2 text-[11px]" : "px-6 py-3 text-[13px]";
  const styles =
    variant === "ghost-dark"
      ? "border border-white/30 text-mec-pure hover:border-mec-red hover:text-mec-red"
      : "bg-mec-red text-mec-pure hover:bg-mec-red-hover";
  const disabledCls =
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <button
      type="button"
      data-cursor="Add"
      disabled={disabled}
      className={cn(base, sizeCls, styles, disabledCls, className)}
      onClick={() => {
        if (disabled) return;
        addItem(product, quantity, logo);
        setAdded(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setAdded(false), 1600);
      }}
    >
      {added ? (
        <>
          <Check className={icon} aria-hidden /> Added · {inCart}
        </>
      ) : (
        <>
          <Plus className={icon} aria-hidden />{}
          {inCart > 0 ? `In Quote · ${inCart}` : "Add to Quote"}
        </>
      )}
    </button>
  );
}
