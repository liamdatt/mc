import Link from "next/link";
import { redirect } from "next/navigation";
import { getSalesSession, getRepCustomers } from "@/lib/sales";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function SalesCustomersPage() {
  const sales = await getSalesSession();
  if (!sales) redirect("/sales/sign-in");
  const customers = await getRepCustomers(sales.rep.id);

  return (
    <div>
      <h1 className="font-display-tight text-3xl">My customers</h1>
      <div className="mt-6 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Quotes</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-mec-ink/60">No customers assigned to you yet.</td></tr>
            )}
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-black/5">
                <td className="px-4 py-3 font-semibold">{c.name}</td>
                <td className="px-4 py-3 text-mec-ink/70">{c.companyName ?? "—"}</td>
                <td className="px-4 py-3 text-mec-ink/70"><a href={`mailto:${c.email}`} className="hover:text-mec-red">{c.email}</a></td>
                <td className="px-4 py-3 text-mec-ink/70">{c._count.inquiries}</td>
                <td className="px-4 py-3 text-mec-ink/60">{formatDate(c.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/sales/customers/${c.id}`} className="font-semibold text-mec-red hover:underline">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
