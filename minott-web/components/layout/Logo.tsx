import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Official Minott Equipment & Chemicals logo (client-supplied artwork).
 * A dark badge: red "M E C" column beside the full company name.
 * Renders as a raster image — pass a height utility (e.g. `h-9`) via
 * `className` to scale it; width stays proportional.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <>
      <span className="sr-only">Minott Equipment &amp; Chemicals</span>
      <Image
        src="/images/mec-logo.jpg"
        alt=""
        aria-hidden
        width={876}
        height={548}
        priority
        className={cn("w-auto select-none rounded-[2px]", className)}
      />
    </>
  );
}
