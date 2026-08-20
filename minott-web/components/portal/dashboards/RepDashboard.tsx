import Link from "next/link";
import { getRepStats, getLatestRepQuotes } from "@/lib/sales";
import { INQUIRY_STATUS_LABELS } from "@/lib/constants";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Rep dashboard for the unified Accounts Portal.
 * `rep`: the caller's already-verified sales rep record (id + name) — the
 * caller (`app/portal/(protected)/page.tsx`) calls `getSalesSession()` itself
 * so this component stays presentational and doesn't re-gate.
 */
export async function RepDashboard({
  rep,
}: {
  rep: { id: number; name: string };
}) {
  const [stats, latest] = await Promise.all([
    getRepStats(rep.id),
    getLatestRepQuotes(rep.id, 8),
  ]);

  const tiles = [
    { label: "My customers", value: stats.customers, href: "/portal/customers" },
    { label: "Open quotes", value: stats.openQuotes, href: "/portal/quotes" },
    { label: "Total quotes", value: stats.totalQuotes, href: "/portal/quotes" },
  ];

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Welcome, {rep.name}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="rounded-md border border-black/10 bg-mec-pure p-5 transition-colors hover:border-mec-red/40"
          >
            <div className="font-display-tight text-4xl">{t.value}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/60">
              {t.label}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display-tight text-2xl">Latest quotes</h2>
        <Link
          href="/portal/quotes"
          className="text-sm font-semibold text-mec-red hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="mt-4 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {latest.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-mec-ink/60">
                  No quotes from your customers yet.
                </td>
              </tr>
            )}
            {latest.map((q) => (
              <tr key={q.id} className="border-b border-black/5 hover:bg-mec-mist/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/portal/quotes/${q.id}`}
                    className="font-semibold hover:text-mec-red"
                  >
                    {q.user?.name ?? q.name}
                  </Link>
                  {q.user?.companyName ? (
                    <span className="block text-xs text-mec-ink/50">
                      {q.user.companyName}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-mec-ink/70">{q._count.items}</td>
                <td className="px-4 py-3 text-mec-ink/70">
                  {INQUIRY_STATUS_LABELS[q.status] ?? q.status}
                </td>
                <td className="px-4 py-3 text-mec-ink/60">
                  {formatDate(q.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
