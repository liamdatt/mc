import Link from "next/link";
import { getPortalCompanies } from "@/lib/portal";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Admin's customer-company management list. Caller (the page) gates on role. */
export async function AdminCompaniesView() {
  const companies = await getPortalCompanies();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display-tight text-3xl">Customer companies</h1>
        <Link
          href="/portal/customers/new"
          className="bg-mec-red px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover"
        >
          + New Company
        </Link>
      </div>

      <p className="mt-3 max-w-2xl text-sm text-mec-ink/60">
        The company is the customer account: rep assignment and quote history
        live at the company level, and each company can have multiple portal
        users. Users are invited by email to set their own password — public
        sign-up is disabled.
      </p>

      <div className="mt-6 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">MEC account #</th>
              <th className="px-4 py-3">Sales rep</th>
              <th className="px-4 py-3">Users</th>
              <th className="px-4 py-3">Requests</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-mec-ink/60">
                  No customer companies yet.
                </td>
              </tr>
            )}
            {companies.map((c) => {
              const pending = c.users.filter((u) => !u.activatedAt).length;
              return (
                <tr key={c.id} className="border-b border-black/5">
                  <td className="px-4 py-3 font-semibold">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-mec-ink/70">
                    {c.mecAccountNumber ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-mec-ink/70">
                    {c.salesRep?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-mec-ink/70">
                    {c._count.users}
                    {pending > 0 && (
                      <span className="ml-2 rounded-pill bg-mec-red/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-red">
                        {pending} pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-mec-ink/70">
                    {c._count.inquiries}
                  </td>
                  <td className="px-4 py-3 text-mec-ink/60">
                    {formatDate(c.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/portal/customers/${c.id}`}
                      className="font-semibold text-mec-red hover:underline"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
