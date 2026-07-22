import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSalesSession, getRepCustomerById } from "@/lib/sales";
import { RepCustomerForm } from "@/components/sales/RepCustomerForm";

export default async function SalesEditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sales = await getSalesSession();
  if (!sales) redirect("/sales/sign-in");
  const { id } = await params;
  const customer = await getRepCustomerById(sales.rep.id, id);
  if (!customer) notFound();

  return (
    <div>
      <Link href="/sales/customers" className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red">← Back to my customers</Link>
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
