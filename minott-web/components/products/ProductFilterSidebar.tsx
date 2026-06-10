import Link from "next/link";
import { cn } from "@/lib/cn";

type CategoryCount = { slug: string; name: string; count: number };

export type ActiveFilters = {
  category?: string;
  form?: string;
  industry?: string;
  volume?: string;
  color?: string;
  sort?: string;
  q?: string;
};

function buildQuery(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `/products/all?${s}` : "/products/all";
}

/** A toggleable list of single-select filter options under a heading. */
function FilterGroup({
  label,
  options,
  activeValue,
  paramKey,
  active,
  itemBase,
}: {
  label: string;
  options: string[];
  activeValue?: string;
  paramKey: keyof ActiveFilters;
  active: ActiveFilters;
  itemBase: string;
}) {
  if (options.length === 0) return null;
  return (
    <>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-mec-ink/60">
        {label}
      </p>
      <ul className="mt-3 space-y-1">
        {options.map((opt) => {
          const isActive = activeValue === opt;
          return (
            <li key={opt}>
              <Link
                href={buildQuery({
                  ...active,
                  [paramKey]: isActive ? undefined : opt,
                })}
                className={cn(
                  itemBase,
                  isActive
                    ? "bg-mec-red/10 font-semibold text-mec-red"
                    : "text-mec-ink/80 hover:bg-mec-mist",
                )}
              >
                <span>{opt}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function ProductFilterSidebar({
  categories,
  forms,
  industries = [],
  volumes = [],
  colors = [],
  active,
}: {
  categories: CategoryCount[];
  forms: string[];
  industries?: string[];
  volumes?: string[];
  colors?: string[];
  active: ActiveFilters;
}) {
  const itemBase =
    "flex items-center justify-between rounded-sm px-3 py-2 text-sm transition-colors";
  const total = categories.reduce((n, c) => n + c.count, 0);
  // Params that should persist when toggling a category.
  const rest = {
    form: active.form,
    industry: active.industry,
    volume: active.volume,
    color: active.color,
    sort: active.sort,
    q: active.q,
  };
  const hasActiveFilter =
    active.category ||
    active.form ||
    active.industry ||
    active.volume ||
    active.color;

  return (
    <aside className="rounded-md border border-black/10 bg-mec-pure">
      <div className="border-b border-black/10 px-5 py-4">
        <h2 className="font-display-tight text-xl tracking-wide text-mec-ink">
          Filters
        </h2>
      </div>

      <div className="px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mec-ink/60">
          Product Categories
        </p>
        <ul className="mt-3 space-y-1">
          <li>
            <Link
              href={buildQuery(rest)}
              className={cn(
                itemBase,
                !active.category
                  ? "bg-mec-red/10 font-semibold text-mec-red"
                  : "text-mec-ink/80 hover:bg-mec-mist",
              )}
            >
              <span>All Products</span>
              <span className="text-xs text-mec-ink/50">{total}</span>
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={buildQuery({ ...rest, category: c.slug })}
                className={cn(
                  itemBase,
                  active.category === c.slug
                    ? "bg-mec-red/10 font-semibold text-mec-red"
                    : "text-mec-ink/80 hover:bg-mec-mist",
                )}
              >
                <span>{c.name}</span>
                <span className="text-xs text-mec-ink/50">{c.count}</span>
              </Link>
            </li>
          ))}
        </ul>

        <FilterGroup
          label="Form"
          options={forms}
          activeValue={active.form}
          paramKey="form"
          active={active}
          itemBase={itemBase}
        />
        <FilterGroup
          label="Industry"
          options={industries}
          activeValue={active.industry}
          paramKey="industry"
          active={active}
          itemBase={itemBase}
        />
        <FilterGroup
          label="Volume"
          options={volumes}
          activeValue={active.volume}
          paramKey="volume"
          active={active}
          itemBase={itemBase}
        />
        <FilterGroup
          label="Colour"
          options={colors}
          activeValue={active.color}
          paramKey="color"
          active={active}
          itemBase={itemBase}
        />

        {hasActiveFilter && (
          <Link
            href={buildQuery({ sort: active.sort, q: active.q })}
            className="mt-6 block rounded-sm border border-black/15 px-4 py-2 text-center text-sm font-semibold uppercase tracking-[0.1em] text-mec-ink/70 transition-colors hover:border-mec-red hover:text-mec-red"
          >
            Clear All
          </Link>
        )}
      </div>
    </aside>
  );
}
