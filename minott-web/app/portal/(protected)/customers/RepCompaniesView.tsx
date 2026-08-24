import Link from "next/link";
import { getRepCompanies } from "@/lib/sales";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

/** A rep's book of business. Caller (the page) supplies the rep id from the session. */
export async function RepCompaniesView({ repId }: { repId: number }) {
  const companies = await getRepCompanies(repId);

  return (
    <div>
      <h1 className="font-display-tight text-3xl">My companies</h1>
      <div className="mt-6 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contacts</th>
              <th className="px-4 py-3">Quotes</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-mec-ink/60">No companies assigned to you yet.</td></tr>
            )}
            {companies.map((c) => (
              <tr key={c.id} className="border-b border-black/5">
                <td className="px-4 py-3 font-semibold">{c.name}</td>
                <td className="px-4 py-3 text-mec-ink/70">
                  {c.users.length === 0
                    ? "—"
                    : c.users.length === 1
                      ? c.users[0].name
                      : `${c.users[0].name} +${c.users.length - 1}`}
                </td>
                <td className="px-4 py-3 text-mec-ink/70">{c._count.inquiries}</td>
                <td className="px-4 py-3 text-mec-ink/60">{formatDate(c.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/portal/customers/${c.id}`} className="font-semibold text-mec-red hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
