import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSalesSession, getRepQuoteById } from "@/lib/sales";
import { QuoteStatusForm } from "@/components/sales/QuoteStatusForm";
import { AddNoteForm } from "@/components/sales/AddNoteForm";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-JM", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export default async function SalesQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sales = await getSalesSession();
  if (!sales) redirect("/portal");
  const { id } = await params;
  const quoteId = Number(id);
  if (!Number.isInteger(quoteId)) notFound();
  const quote = await getRepQuoteById(sales.rep.id, quoteId);
  if (!quote) notFound();

  return (
    <div>
      <Link href="/portal/quotes" className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red">← Back to quotes</Link>
      <h1 className="mt-4 font-display-tight text-3xl">Quote #{quote.id}</h1>
      <p className="mt-1 text-sm text-mec-ink/60">{formatDateTime(quote.createdAt)}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <section className="rounded-md border border-black/10 bg-mec-pure p-5">
            <h2 className="font-display-tight text-xl">Requested items</h2>
            <ul className="mt-3 divide-y divide-black/5">
              {quote.items.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{i.productName}{i.variant?.label ? ` — ${i.variant.label}` : i.variant?.size ? ` — ${i.variant.size}` : ""}</span>
                  <span className="font-semibold text-mec-ink/70">× {i.quantity}</span>
                </li>
              ))}
              {quote.items.length === 0 && <li className="py-2 text-sm text-mec-ink/60">No line items.</li>}
            </ul>
            {quote.message && (
              <p className="mt-4 rounded-sm bg-mec-mist p-3 text-sm text-mec-ink/70">“{quote.message}”</p>
            )}
          </section>

          <section className="rounded-md border border-black/10 bg-mec-pure p-5">
            <h2 className="font-display-tight text-xl">Notes</h2>
            <div className="mt-4"><AddNoteForm inquiryId={quote.id} /></div>
            <ul className="mt-5 space-y-3">
              {quote.notes.length === 0 && <li className="text-sm text-mec-ink/60">No notes yet.</li>}
              {quote.notes.map((n) => (
                <li key={n.id} className="rounded-sm border border-black/5 bg-mec-mist/50 p-3">
                  <p className="text-sm text-mec-ink">{n.body}</p>
                  <p className="mt-1 text-xs text-mec-ink/50">{n.authorLabel} · {formatDateTime(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-md border border-black/10 bg-mec-pure p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/60">Status</h2>
            <div className="mt-3"><QuoteStatusForm inquiryId={quote.id} status={quote.status} /></div>
          </section>
          <section className="rounded-md border border-black/10 bg-mec-pure p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/60">Customer</h2>
            <p className="mt-3 font-semibold">{quote.user?.name ?? quote.name}</p>
            {quote.user?.companyName ? <p className="text-sm text-mec-ink/60">{quote.user.companyName}</p> : null}
            <p className="mt-2 text-sm"><a href={`mailto:${quote.user?.email ?? quote.email}`} className="text-mec-red hover:underline">{quote.user?.email ?? quote.email}</a></p>
            {quote.user?.phone ? <p className="text-sm text-mec-ink/70">{quote.user.phone}</p> : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
