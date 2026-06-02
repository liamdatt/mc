import Link from "next/link";
import { cn } from "@/lib/cn";

type CategoryCount = { slug: string; name: string; count: number };

function buildQuery(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `/products/all?${s}` : "/products/all";
}

export function ProductFilterSidebar({
  categories,
  forms,
  active,
}: {
  categories: CategoryCount[];
  forms: string[];
  active: { category?: string; form?: string; sort?: string };
}) {
  const itemBase =
    "flex items-center justify-between rounded-sm px-3 py-2 text-sm transition-colors";
  const total = categories.reduce((n, c) => n + c.count, 0);

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
              href={buildQuery({ form: active.form, sort: active.sort })}
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
                href={buildQuery({
                  category: c.slug,
                  form: active.form,
                  sort: active.sort,
                })}
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

        {forms.length > 0 && (
          <>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-mec-ink/60">
              Form
            </p>
            <ul className="mt-3 space-y-1">
              {forms.map((f) => {
                const isActive = active.form === f;
                return (
                  <li key={f}>
                    <Link
                      href={buildQuery({
                        category: active.category,
                        form: isActive ? undefined : f,
                        sort: active.sort,
                      })}
                      className={cn(
                        itemBase,
                        isActive
                          ? "bg-mec-red/10 font-semibold text-mec-red"
                          : "text-mec-ink/80 hover:bg-mec-mist",
                      )}
                    >
                      <span>{f}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {(active.category || active.form) && (
          <Link
            href={buildQuery({ sort: active.sort })}
            className="mt-6 block rounded-sm border border-black/15 px-4 py-2 text-center text-sm font-semibold uppercase tracking-[0.1em] text-mec-ink/70 transition-colors hover:border-mec-red hover:text-mec-red"
          >
            Clear All
          </Link>
        )}
      </div>
    </aside>
  );
}
