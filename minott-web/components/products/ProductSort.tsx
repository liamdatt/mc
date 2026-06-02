"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ProductSort() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") === "za" ? "za" : "az";

  return (
    <label className="flex items-center gap-2 text-sm text-mec-ink/70">
      <span className="hidden sm:inline">Sort by:</span>
      <select
        value={current}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("sort", e.target.value);
          router.push(`/products/all?${params.toString()}`);
        }}
        className="rounded-sm border border-black/15 bg-mec-pure px-3 py-1.5 text-sm font-semibold text-mec-ink outline-none focus:border-mec-red"
      >
        <option value="az">A – Z</option>
        <option value="za">Z – A</option>
      </select>
    </label>
  );
}
