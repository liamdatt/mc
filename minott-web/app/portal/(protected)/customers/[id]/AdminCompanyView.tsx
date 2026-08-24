import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CompanyForm } from "@/components/admin/CompanyForm";
import { CompanyUserForm } from "@/components/admin/CompanyUserForm";

/** Admin management view for one customer company. Caller gates on role. */
export async function AdminCompanyView({ id }: { id: number }) {
  const company = await db.company.findUnique({
    where: { id },
    include: {
      users: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          activatedAt: true,
          banned: true,
        },
      },
    },
  });
  if (!company) notFound();

  const salesReps = await db.salesRep.findMany({
    where: { OR: [{ active: true }, { id: company.salesRepId ?? -1 }] },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <Link
        href="/portal/customers"
        className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red"
      >
        ← Back to companies
      </Link>
      <h1 className="mt-4 font-display-tight text-3xl">{company.name}</h1>
      <p className="mt-2 max-w-xl text-sm text-mec-ink/60">
        Account-level details for this company. Portal users below share this
        account&apos;s quote history and sales rep.
      </p>
      <div className="mt-8">
        <CompanyForm
          company={{
            id: company.id,
            name: company.name,
            mecAccountNumber: company.mecAccountNumber,
            industry: company.industry,
            location: company.location,
            salesRepId: company.salesRepId,
          }}
          salesReps={salesReps}
        />
      </div>

      <h2 className="mt-12 font-display-tight text-2xl">Portal users</h2>
      <div className="mt-4 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {company.users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-mec-ink/60">
                  No portal users yet — add the first one below.
                </td>
              </tr>
            )}
            {company.users.map((u) => (
              <tr key={u.id} className="border-b border-black/5">
                <td className="px-4 py-3 font-semibold">
                  {u.name}
                  {u.banned ? (
                    <span className="ml-2 rounded-pill bg-mec-red/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-red">
                      banned
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-mec-ink/70">
                  <a href={`mailto:${u.email}`} className="hover:text-mec-red">
                    {u.email}
                  </a>
                </td>
                <td className="px-4 py-3 text-mec-ink/70">{u.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  {u.activatedAt ? (
                    <span className="rounded-pill bg-mec-ink/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/60">
                      active
                    </span>
                  ) : (
                    <span className="rounded-pill bg-mec-red/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-red">
                      pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/portal/customers/${company.id}/users/${u.id}`}
                    className="font-semibold text-mec-red hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-8 font-display-tight text-xl">Add a portal user</h3>
      <div className="mt-4">
        <CompanyUserForm companyId={company.id} />
      </div>
    </div>
  );
}
