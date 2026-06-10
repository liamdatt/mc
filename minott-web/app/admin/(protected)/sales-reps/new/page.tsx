import Link from "next/link";
import { SalesRepForm } from "@/components/admin/SalesRepForm";

export default function NewSalesRepPage() {
  return (
    <div>
      <Link
        href="/admin/sales-reps"
        className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red"
      >
        ← Back to sales reps
      </Link>
      <h1 className="mt-4 font-display-tight text-3xl">New sales rep</h1>
      <div className="mt-8">
        <SalesRepForm />
      </div>
    </div>
  );
}
