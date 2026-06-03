import { cn } from "@/lib/cn";

/**
 * CSS recreation of the official Minott Equipment & Chemicals logo.
 * A dark-framed badge: a red column with the black "M E C" initials, then a
 * wider silver/metallic column with the remainder of each word in black.
 * Rendered with the Bebas Neue display font so it stays crisp at any size.
 * Pass a `text-*` size via `className` to scale the whole mark.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex select-none items-stretch overflow-hidden rounded-[2px] border-2 border-mec-ink font-display uppercase leading-[0.9] tracking-tight shadow-[0_1px_3px_rgba(0,0,0,0.3)]",
        "text-2xl",
        className,
      )}
    >
      <span className="sr-only">Minott Equipment &amp; Chemicals</span>
      <span
        aria-hidden
        className="flex flex-col items-center justify-center bg-mec-red pl-[0.3em] pr-[0.08em] py-[0.18em] font-bold text-mec-ink"
      >
        <span>M</span>
        <span>E</span>
        <span>C</span>
      </span>
      <span
        aria-hidden
        className="flex flex-col justify-center bg-gradient-to-b from-zinc-100 via-zinc-300 to-zinc-400 pl-[0.06em] pr-[0.4em] py-[0.18em] font-bold text-mec-ink"
      >
        <span>INOTT</span>
        <span>QUIPMENT&nbsp;&amp;</span>
        <span>HEMICALS</span>
      </span>
    </span>
  );
}
