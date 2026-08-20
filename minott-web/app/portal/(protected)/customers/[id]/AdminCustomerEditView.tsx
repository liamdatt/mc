import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CustomerForm } from "@/components/admin/CustomerForm";
import { ResendInviteButton } from "@/components/admin/ResendInviteButton";

/** Admin edit view for a single portal customer. Caller (the page) gates on role. */
export async function AdminCustomerEditView({ id }: { id: string }) {
  const customer = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      companyName: true,
      phone: true,
      whatsapp: true,
      salesRepId: true,
      activatedAt: true,
      role: true,
    },
  });
  if (!customer || customer.role !== "customer") notFound();

  const salesReps = await db.salesRep.findMany({
    where: {
      OR: [{ active: true }, { id: customer.salesRepId ?? -1 }],
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <Link
        href="/portal/customers"
        className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red"
      >
        ← Back to customers
      </Link>
      <h1 className="mt-4 font-display-tight text-3xl">Edit portal customer</h1>
      <p className="mt-2 max-w-xl text-sm text-mec-ink/60">
        Update {customer.name}&apos;s account details. They set their own password
        via the emailed invite — use “Resend invite” to send a fresh link.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {customer.activatedAt ? (
          <span className="rounded-pill bg-mec-ink/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/60">
            Active
          </span>
        ) : (
          <span className="rounded-pill bg-mec-red/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-mec-red">
            Invite pending
          </span>
        )}
        <ResendInviteButton userId={customer.id} />
      </div>
      <div className="mt-8">
        <CustomerForm customer={customer} salesReps={salesReps} />
      </div>
    </div>
  );
}
