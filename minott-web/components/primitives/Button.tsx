"use client";
import { forwardRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "ghost-dark";

interface BaseProps {
  variant?: Variant;
  arrow?: boolean;
  className?: string;
  children: React.ReactNode;
}

type ButtonAsButton = BaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type ButtonAsLink = BaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
    external?: boolean;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

const base =
  "group inline-flex items-center justify-center gap-3 font-semibold uppercase tracking-[0.12em] text-[13px] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] relative overflow-hidden disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-mec-red text-mec-pure px-7 py-4 hover:shadow-[0_24px_48px_-12px_rgba(225,6,0,0.35)] active:scale-[0.97]",
  ghost:
    "border border-mec-ink text-mec-ink px-7 py-[15px] hover:border-mec-red hover:text-mec-red",
  "ghost-dark":
    "border border-white/30 text-mec-pure px-7 py-[15px] hover:border-mec-red hover:text-mec-red",
};

export const Button = forwardRef<HTMLElement, ButtonProps>(function Button(
  { variant = "primary", arrow = false, className, children, ...rest },
  ref,
) {
  const content = (
    <>
      {variant === "primary" && (
        <span
          aria-hidden
          className="absolute inset-0 bg-[#c10500] origin-left scale-x-0 transition-transform duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:scale-x-100"
        />
      )}
      <span className="relative z-[1]">{children}</span>
      {arrow && (
        <ArrowRight
          aria-hidden
          className="relative z-[1] h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
        />
      )}
    </>
  );

  if ("href" in rest && rest.href) {
    const { href, external, ...linkProps } = rest;
    const secureProps = external
      ? { target: "_blank" as const, rel: "noopener noreferrer" as const }
      : {};
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={cn(base, variants[variant], className)}
        data-cursor="View"
        {...linkProps}
        {...secureProps}
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      ref={ref as React.Ref<HTMLButtonElement>}
      className={cn(base, variants[variant], className)}
      data-cursor="Click"
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
});
