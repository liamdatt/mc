import Link from "next/link";
import { cn } from "@/lib/cn";

type ChipCategory = { slug: string; name: string; count: number };

/**
 * Horizontal, wrapping row of category links shown under the search bar.
 * Picking a chip drops `q` (and any other param), so it clears the search.
 */
export function CategoryChips({
  categories,
  activeSlug,
  q,
}: {
  categories: ChipCategory[];
  activeSlug?: string;
  q?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors";
  const on = "border-mec-red bg-mec-red text-mec-pure";
  const off = "border-black/15 text-mec-ink hover:border-mec-red hover:text-mec-red";
  const allActive = !activeSlug && !q;

  return (
    <nav aria-label="Product categories" className="flex flex-wrap gap-2">
      <Link
        href="/products/all"
        aria-current={allActive ? "page" : undefined}
        className={cn(base, allActive ? on : off)}
      >
        All
      </Link>
      {categories.map((c) => {
        const active = c.slug === activeSlug;
        return (
          <Link
            key={c.slug}
            href={`/products/all?category=${encodeURIComponent(c.slug)}`}
            aria-current={active ? "page" : undefined}
            className={cn(base, active ? on : off)}
          >
            {c.name}
            <span className={cn("text-xs", active ? "text-mec-pure/80" : "text-mec-ink/50")}>
              {c.count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
