import Link from "next/link";
import { CustomerForm } from "@/components/admin/CustomerForm";

export default function NewCustomerPage() {
  return (
    <div>
      <Link
        href="/admin/customers"
        className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red"
      >
        ← Back to customers
      </Link>
      <h1 className="mt-4 font-display-tight text-3xl">New portal customer</h1>
      <p className="mt-2 max-w-xl text-sm text-mec-ink/60">
        Create a B2B portal account. The customer signs in with the temporary
        password you set below.
      </p>
      <div className="mt-8">
        <CustomerForm />
      </div>
    </div>
  );
}
