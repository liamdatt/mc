import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Download, FileText } from "lucide-react";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import {
  getCustomerScope,
  getPortalSession,
  getUserHistory,
  getUserHistoryCategories,
  type HistoryFilters,
} from "@/lib/portal";
import {
  INQUIRY_STATUS,
  INQUIRY_STATUS_LABELS,
  INQUIRY_TYPE,
  INQUIRY_TYPE_LABELS,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Order & Quote History | Minott Equipment & Chemicals",
  description:
    "Every quote request, sample request and message you've submitted to Minott Equipment & Chemicals.",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

const field =
  "mt-1 w-full rounded-sm border border-mec-ink/15 bg-mec-pure px-3 py-2 text-sm text-mec-ink outline-none focus:border-mec-red";
const fieldLabel =
  "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/60";

function summarise(inq: Awaited<ReturnType<typeof getUserHistory>>[number]) {
  if (inq.type === INQUIRY_TYPE.QUOTE) {
    const n = inq.items.length;
    return `${n} item${n === 1 ? "" : "s"}`;
  }
  if (inq.type === INQUIRY_TYPE.SAMPLE && inq.product) {
    return inq.product.name;
  }
  return "—";
}

export default async function PortalHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/sign-in");
  if (session.user.role !== "customer") redirect("/portal");
  const scope = await getCustomerScope(session.user.id);

  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

  const filters: HistoryFilters = {
    from: one(sp.from),
    to: one(sp.to),
    type: one(sp.type),
    status: one(sp.status),
    categorySlug: one(sp.category),
  };

  const [inquiries, categories] = await Promise.all([
    getUserHistory(scope, filters),
    getUserHistoryCategories(scope),
  ]);

  const exportHref = `/portal/history/export?${new URLSearchParams(
    Object.fromEntries(
      Object.entries(filters).filter(([, v]) => !!v) as [string, string][],
    ),
  ).toString()}`;

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div>
      <RevealOnScroll>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Customer Portal</Eyebrow>
            <h1 className="mt-4 font-display-tight text-4xl leading-none tracking-tight md:text-5xl">
              Your history
            </h1>
            <p className="mt-3 text-mec-ink/65">
              Every quote, sample request and message from you and your company.
            </p>
          </div>
          <a
            href={exportHref}
            className="inline-flex items-center gap-2 rounded-pill border border-mec-ink/15 px-4 py-2 text-sm font-semibold text-mec-ink/75 transition-colors hover:border-mec-red hover:text-mec-red"
          >
            <Download aria-hidden className="h-4 w-4" />
            Export CSV
          </a>
        </div>
      </RevealOnScroll>

      {/* Filters */}
      <RevealOnScroll delay={0.05} className="mt-8">
        <form
          method="get"
          className="grid gap-4 rounded-md border border-mec-ink/10 bg-mec-pure p-5 sm:grid-cols-2 lg:grid-cols-5"
        >
          <label className={fieldLabel}>
            From
            <input
              type="date"
              name="from"
              defaultValue={filters.from ?? ""}
              className={field}
            />
          </label>
          <label className={fieldLabel}>
            To
            <input
              type="date"
              name="to"
              defaultValue={filters.to ?? ""}
              className={field}
            />
          </label>
          <label className={fieldLabel}>
            Type
            <select name="type" defaultValue={filters.type ?? ""} className={field}>
              <option value="">All types</option>
              {Object.values(INQUIRY_TYPE).map((t) => (
                <option key={t} value={t}>
                  {INQUIRY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldLabel}>
            Status
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className={field}
            >
              <option value="">All statuses</option>
              {Object.values(INQUIRY_STATUS).map((s) => (
                <option key={s} value={s}>
                  {INQUIRY_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldLabel}>
            Category
            <select
              name="category"
              defaultValue={filters.categorySlug ?? ""}
              className={field}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-5">
            <button
              type="submit"
              className="bg-mec-red px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover"
            >
              Apply filters
            </button>
            {hasFilters && (
              <Link
                href="/portal/history"
                className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red"
              >
                Clear
              </Link>
            )}
          </div>
        </form>
      </RevealOnScroll>

      {/* Results */}
      <RevealOnScroll delay={0.1} className="mt-8">
        {inquiries.length === 0 ? (
          <div className="rounded-md border border-dashed border-mec-ink/20 bg-mec-pure p-10 text-center">
            <FileText aria-hidden className="mx-auto h-7 w-7 text-mec-ink/40" />
            <p className="mt-3 text-mec-ink/65">
              {hasFilters
                ? "No requests match those filters."
                : "You haven't submitted any requests yet."}
            </p>
            {!hasFilters && (
              <Link
                href="/quote"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-mec-red hover:underline"
              >
                Start your first quote
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-mec-ink/10 bg-mec-pure">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-mec-ink/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Summary</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inq) => (
                  <tr key={inq.id} className="border-b border-mec-ink/5">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">
                      #{String(inq.id).padStart(5, "0")}
                    </td>
                    <td className="px-4 py-3 text-mec-ink/70">
                      {formatDate(inq.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-pill bg-mec-mist px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
                        {INQUIRY_TYPE_LABELS[inq.type] ?? inq.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-mec-ink/80">{summarise(inq)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-pill border border-mec-ink/15 px-3 py-1 text-xs font-semibold text-mec-ink/70">
                        {INQUIRY_STATUS_LABELS[inq.status] ?? inq.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/portal/history/${inq.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-mec-red hover:underline"
                      >
                        View
                        <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </RevealOnScroll>
    </div>
  );
}
