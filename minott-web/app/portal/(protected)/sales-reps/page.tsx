import Link from "next/link";
import { db } from "@/lib/db";
import { DeleteSalesRepButton } from "@/components/admin/DeleteSalesRepButton";
import { requireAdminSession } from "@/lib/portal";

export default async function AdminSalesRepsPage() {
  await requireAdminSession();
  const reps = await db.salesRep.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { clients: true } },
      user: { select: { activatedAt: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display-tight text-3xl">Sales reps</h1>
        <Link
          href="/portal/sales-reps/new"
          className="bg-mec-red px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover"
        >
          + New Sales Rep
        </Link>
      </div>

      <p className="mt-3 max-w-2xl text-sm text-mec-ink/60">
        Reps can be assigned to portal customers from the customer&apos;s edit
        page. Inactive reps keep their existing clients but are hidden from
        the assignment dropdown.
      </p>

      <div className="mt-6 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Clients</th>
              <th className="px-4 py-3">Portal</th>
              <th className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {reps.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-mec-ink/60">
                  No sales reps yet.
                </td>
              </tr>
            )}
            {reps.map((r) => (
              <tr key={r.id} className="border-b border-black/5">
                <td className="px-4 py-3 font-semibold">
                  {r.name}
                  {!r.active && (
                    <span className="ml-2 rounded-pill bg-mec-ink/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/60">
                      inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-mec-ink/70">
                  {r.email ? (
                    <a href={`mailto:${r.email}`} className="hover:text-mec-red">
                      {r.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-mec-ink/70">{r.phone ?? "—"}</td>
                <td className="px-4 py-3 text-mec-ink/70">
                  {r._count.clients}
                </td>
                <td className="px-4 py-3">
                  {!r.user ? (
                    <span className="text-xs text-mec-ink/40">—</span>
                  ) : r.user.activatedAt ? (
                    <span className="rounded-pill bg-mec-ink/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/60">active</span>
                  ) : (
                    <span className="rounded-pill bg-mec-red/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-red">pending</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/portal/sales-reps/${r.id}/edit`}
                    className="font-semibold text-mec-red hover:underline"
                  >
                    Edit
                  </Link>
                  <DeleteSalesRepButton
                    id={r.id}
                    clientCount={r._count.clients}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
