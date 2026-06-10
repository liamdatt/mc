import Link from "next/link";
import { getPortalUsers } from "@/lib/portal";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function AdminCustomersPage() {
  const customers = await getPortalUsers();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display-tight text-3xl">Portal customers</h1>
        <Link
          href="/admin/customers/new"
          className="bg-mec-red px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover"
        >
          + New Customer
        </Link>
      </div>

      <p className="mt-3 max-w-2xl text-sm text-mec-ink/60">
        Portal accounts are provisioned here — public sign-up is disabled.
        Customers sign in at <span className="font-mono">/portal/sign-in</span>{" "}
        to track their quotes and history.
      </p>

      <div className="mt-6 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Requests</th>
              <th className="px-4 py-3">Added</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-mec-ink/60">
                  No portal customers yet.
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-black/5">
                <td className="px-4 py-3 font-semibold">
                  {c.name}
                  {c.banned ? (
                    <span className="ml-2 rounded-pill bg-mec-red/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-red">
                      banned
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-mec-ink/70">
                  {c.companyName ?? "—"}
                </td>
                <td className="px-4 py-3 text-mec-ink/70">
                  <a href={`mailto:${c.email}`} className="hover:text-mec-red">
                    {c.email}
                  </a>
                </td>
                <td className="px-4 py-3 text-mec-ink/70">
                  {c._count.inquiries}
                </td>
                <td className="px-4 py-3 text-mec-ink/60">
                  {formatDate(c.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
