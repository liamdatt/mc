import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepCompanyById } from "@/lib/sales";
import { RepCompanyForm } from "@/components/sales/RepCompanyForm";

/**
 * Rep detail/edit view for one of their own companies. Ownership is enforced
 * inside getRepCompanyById (returns null if not theirs → notFound()).
 */
export async function RepCompanyDetailView({
  repId,
  companyId,
}: {
  repId: number;
  companyId: number;
}) {
  const company = await getRepCompanyById(repId, companyId);
  if (!company) notFound();

  return (
    <div>
      <Link href="/portal/customers" className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red">← Back to my companies</Link>
      <h1 className="mt-4 font-display-tight text-3xl">{company.name}</h1>
      <div className="mt-8">
        <RepCompanyForm
          company={{
            id: company.id,
            name: company.name,
            industry: company.industry,
            location: company.location,
          }}
        />
      </div>

      <h2 className="mt-12 font-display-tight text-2xl">Contacts</h2>
      <div className="mt-4 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {company.users.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-mec-ink/60">No portal users yet — contact an administrator to invite one.</td></tr>
            )}
            {company.users.map((u) => (
              <tr key={u.id} className="border-b border-black/5">
                <td className="px-4 py-3 font-semibold">{u.name}</td>
                <td className="px-4 py-3 text-mec-ink/70"><a href={`mailto:${u.email}`} className="hover:text-mec-red">{u.email}</a></td>
                <td className="px-4 py-3 text-mec-ink/70">{u.phone ?? "—"}</td>
                <td className="px-4 py-3 text-mec-ink/60">{u.activatedAt ? "Active" : "Invite pending"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
