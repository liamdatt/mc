import Link from "next/link";
import { getSalesSession, getRepStats, getLatestRepQuotes } from "@/lib/sales";
import { redirect } from "next/navigation";
import { INQUIRY_STATUS_LABELS } from "@/lib/constants";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function SalesDashboardPage() {
  const sales = await getSalesSession();
  if (!sales) redirect("/sales/sign-in");
  const [stats, latest] = await Promise.all([
    getRepStats(sales.rep.id),
    getLatestRepQuotes(sales.rep.id, 8),
  ]);

  const tiles = [
    { label: "My customers", value: stats.customers, href: "/sales/customers" },
    { label: "Open quotes", value: stats.openQuotes, href: "/sales/quotes" },
    { label: "Total quotes", value: stats.totalQuotes, href: "/sales/quotes" },
  ];

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Welcome, {sales.rep.name}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="rounded-md border border-black/10 bg-mec-pure p-5 transition-colors hover:border-mec-red/40">
            <div className="font-display-tight text-4xl">{t.value}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/60">{t.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display-tight text-2xl">Latest quotes</h2>
        <Link href="/sales/quotes" className="text-sm font-semibold text-mec-red hover:underline">View all</Link>
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
              <tr><td colSpan={4} className="px-4 py-6 text-mec-ink/60">No quotes from your customers yet.</td></tr>
            )}
            {latest.map((q) => (
              <tr key={q.id} className="border-b border-black/5 hover:bg-mec-mist/50">
                <td className="px-4 py-3">
                  <Link href={`/sales/quotes/${q.id}`} className="font-semibold hover:text-mec-red">
                    {q.user?.name ?? q.name}
                  </Link>
                  {q.user?.companyName ? <span className="block text-xs text-mec-ink/50">{q.user.companyName}</span> : null}
                </td>
                <td className="px-4 py-3 text-mec-ink/70">{q._count.items}</td>
                <td className="px-4 py-3 text-mec-ink/70">{INQUIRY_STATUS_LABELS[q.status] ?? q.status}</td>
                <td className="px-4 py-3 text-mec-ink/60">{formatDate(q.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
