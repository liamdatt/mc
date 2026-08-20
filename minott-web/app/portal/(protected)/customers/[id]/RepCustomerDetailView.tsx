import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepCustomerById } from "@/lib/sales";
import { RepCustomerForm } from "@/components/sales/RepCustomerForm";

/**
 * Rep detail/edit view for one of their own customers. Caller (the page)
 * supplies the rep id from the session; ownership is enforced inside
 * getRepCustomerById (returns null if not theirs → notFound()).
 */
export async function RepCustomerDetailView({
  repId,
  id,
}: {
  repId: number;
  id: string;
}) {
  const customer = await getRepCustomerById(repId, id);
  if (!customer) notFound();

  return (
    <div>
      <Link href="/portal/customers" className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red">← Back to my customers</Link>
      <h1 className="mt-4 font-display-tight text-3xl">{customer.name}</h1>
      <div className="mt-8">
        <RepCustomerForm
          customer={{
            id: customer.id,
            name: customer.name,
            email: customer.email,
            companyName: customer.companyName,
            phone: customer.phone,
            whatsapp: customer.whatsapp,
          }}
        />
      </div>
    </div>
  );
}
