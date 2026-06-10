import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CustomerForm } from "@/components/admin/CustomerForm";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      companyName: true,
      phone: true,
      whatsapp: true,
    },
  });
  if (!customer) notFound();

  return (
    <div>
      <Link
        href="/admin/customers"
        className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red"
      >
        ← Back to customers
      </Link>
      <h1 className="mt-4 font-display-tight text-3xl">Edit portal customer</h1>
      <p className="mt-2 max-w-xl text-sm text-mec-ink/60">
        Update {customer.name}&apos;s account details. Leave the password blank
        to keep their current one.
      </p>
      <div className="mt-8">
        <CustomerForm customer={customer} />
      </div>
    </div>
  );
}
