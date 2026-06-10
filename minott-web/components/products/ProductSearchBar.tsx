"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

/**
 * Server-driven product search. Keeps a local input value, then debounces a
 * `router.replace` that writes `?q=` into the URL (preserving other filters).
 * The page reads `searchParams.q` server-side to query Prisma, so results are
 * always rendered in a Server Component.
 */
export function ProductSearchBar({
  placeholder = "Search products…",
  targetPath,
}: {
  placeholder?: string;
  /**
   * Where to write the query. Defaults to the current path (in-place,
   * debounced). Set this on pages that don't render a listing (e.g. the
   * /products landing) so the search navigates to the results page instead.
   */
  targetPath?: string;
}) {
  const router = useRouter();
  const currentPath = usePathname();
  const pathname = targetPath ?? currentPath;
  const navigates = !!targetPath && targetPath !== currentPath;
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [value, setValue] = useState(urlQuery);
  // Track the last value we pushed so external URL changes (back/forward,
  // clearing filters) resync the input without fighting the user's typing.
  const lastPushed = useRef(urlQuery);

  useEffect(() => {
    if (urlQuery !== lastPushed.current) {
      lastPushed.current = urlQuery;
      setValue(urlQuery);
    }
  }, [urlQuery]);

  function pushQuery(next: string) {
    // When navigating to a different page, start from a clean query string so
    // we don't drag the landing page's params along; otherwise preserve the
    // current filters and just swap `q`.
    const params = navigates
      ? new URLSearchParams()
      : new URLSearchParams(searchParams.toString());
    const trimmed = next.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    lastPushed.current = trimmed;
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    if (navigates) router.push(url);
    else router.replace(url, { scroll: false });
  }

  useEffect(() => {
    // On pages that navigate away, only move on explicit submit (Enter / icon),
    // not on every keystroke.
    if (navigates) return;
    if (value === lastPushed.current) return;
    const id = setTimeout(() => pushQuery(value), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        pushQuery(value);
      }}
      className="relative w-full"
    >
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mec-ink/40"
        aria-hidden
      />
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Search products"
        className="w-full rounded-sm border border-black/15 bg-mec-pure py-3 pl-11 pr-10 text-sm text-mec-ink outline-none transition-colors placeholder:text-mec-ink/40 focus:border-mec-red"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            pushQuery("");
          }}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-mec-ink/40 transition-colors hover:text-mec-red"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </form>
  );
}
