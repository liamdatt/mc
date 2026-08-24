import Link from "next/link";
import { redirect } from "next/navigation";
import { getSalesSession, getRepQuotes } from "@/lib/sales";
import { INQUIRY_STATUS, INQUIRY_STATUS_LABELS } from "@/lib/constants";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function SalesQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
}) {
  const sales = await getSalesSession();
  if (!sales) redirect("/portal");
  const sp = await searchParams;
  const status =
    sp.status && Object.prototype.hasOwnProperty.call(INQUIRY_STATUS, sp.status)
      ? sp.status
      : undefined;
  const quotes = await getRepQuotes(sales.rep.id, { status, from: sp.from, to: sp.to });

  const filterCls = "rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-sm text-mec-ink outline-none focus:border-mec-red";

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Quotes</h1>
      <form className="mt-6 flex flex-wrap items-end gap-3" method="get">
        <label className="text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/60">
          Status
          <select name="status" defaultValue={status ?? ""} className={`mt-1 block ${filterCls}`}>
            <option value="">All</option>
            {Object.keys(INQUIRY_STATUS).map((s) => (
              <option key={s} value={s}>{INQUIRY_STATUS_LABELS[s] ?? s}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/60">
          From
          <input type="date" name="from" defaultValue={sp.from ?? ""} className={`mt-1 block ${filterCls}`} />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/60">
          To
          <input type="date" name="to" defaultValue={sp.to ?? ""} className={`mt-1 block ${filterCls}`} />
        </label>
        <button type="submit" className="rounded-sm bg-mec-ink px-4 py-2 text-sm font-semibold uppercase tracking-[0.1em] text-mec-pure hover:bg-mec-graphite">Filter</button>
        <Link href="/portal/quotes" className="px-2 py-2 text-sm font-semibold text-mec-ink/60 hover:text-mec-red">Reset</Link>
      </form>

      <div className="mt-6 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
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
            {quotes.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-mec-ink/60">No quotes match these filters.</td></tr>
            )}
            {quotes.map((q) => (
              <tr key={q.id} className="border-b border-black/5 hover:bg-mec-mist/50">
                <td className="px-4 py-3">
                  <Link href={`/portal/quotes/${q.id}`} className="font-semibold hover:text-mec-red">{q.user?.name ?? q.name}</Link>
                  {q.companyRef?.name ? <span className="block text-xs text-mec-ink/50">{q.companyRef.name}</span> : null}
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
