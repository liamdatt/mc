import Link from "next/link";
import { requireRoleSession } from "@/lib/portal";
import { getApplications } from "@/lib/applications";
import { APPLICATION_STATUS, APPLICATION_STATUS_LABELS } from "@/lib/constants";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

type Row = Awaited<ReturnType<typeof getApplications>>[number];

function Group({
  title,
  rows,
  empty,
  createAccount,
}: {
  title: string;
  rows: Row[];
  empty: string;
  /** Admins only: render a "Create account" link per row (awaiting-setup group). */
  createAccount?: boolean;
}) {
  const cols = createAccount ? 7 : 6;
  return (
    <section className="mt-8">
      <h2 className="font-display-tight text-xl">{title}</h2>
      <div className="mt-3 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Industry</th>
              <th className="px-4 py-3">Quote</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Status</th>
              {createAccount && <th className="px-4 py-3"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (<tr><td colSpan={cols} className="px-4 py-6 text-mec-ink/60">{empty}</td></tr>)}
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-black/5">
                <td className="px-4 py-3 font-semibold"><Link href={`/portal/applications/${a.id}`} className="hover:text-mec-red">{a.companyName}</Link></td>
                <td className="px-4 py-3 text-mec-ink/70">{a.contactName} · {a.email}</td>
                <td className="px-4 py-3 text-mec-ink/70">{a.industry}</td>
                <td className="px-4 py-3 text-mec-ink/70">#{a.inquiry.id} · {a.inquiry._count.items} items</td>
                <td className="px-4 py-3 text-mec-ink/60">{formatDate(a.createdAt)}</td>
                <td className="px-4 py-3"><span className="rounded-pill bg-mec-mist px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/70">{APPLICATION_STATUS_LABELS[a.status] ?? a.status}</span></td>
                {createAccount && (
                  <td className="px-4 py-3 text-right">
                    <Link href={`/portal/customers/new?application=${a.id}`} className="font-semibold text-mec-red hover:underline">Create account</Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function ApplicationsPage() {
  const session = await requireRoleSession(["admin", "ar"]);
  const isAdmin = session.user.role === "admin";
  const all = await getApplications();
  const submitted = all.filter((a) => a.status === APPLICATION_STATUS.SUBMITTED);
  const info = all.filter((a) => a.status === APPLICATION_STATUS.INFO_REQUESTED);
  const awaitingSetup = all.filter((a) => a.status === APPLICATION_STATUS.APPROVED);
  const ts = (r: Row) => (r.accountCreatedAt ?? r.decidedAt)?.getTime() ?? 0;
  const decided = all
    .filter((a) => a.status === APPLICATION_STATUS.ACCOUNT_CREATED || a.status === APPLICATION_STATUS.REJECTED)
    .sort((a, b) => ts(b) - ts(a))
    .slice(0, 50);

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Customer applications</h1>
      <p className="mt-3 max-w-2xl text-sm text-mec-ink/60">New Customer Forms submitted from the website. Accounts Receivable approves; an admin then creates the company account, assigns the account number and rep, and sends the invite. The original quote stays attached throughout.</p>
      <Group title="Awaiting review" rows={submitted} empty="Nothing waiting." />
      <Group title="Info requested" rows={info} empty="No open information requests." />
      <Group title="Approved — awaiting account setup" rows={awaitingSetup} empty="No approved applications waiting for an account." createAccount={isAdmin} />
      <Group title="Decided" rows={decided} empty="No decisions yet." />
    </div>
  );
}
