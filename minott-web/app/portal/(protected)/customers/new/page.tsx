import Link from "next/link";
import { CompanyForm } from "@/components/admin/CompanyForm";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/portal";

export default async function NewCompanyPage() {
  await requireAdminSession();
  const salesReps = await db.salesRep.findMany({
    where: { active: true },
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
      <h1 className="mt-4 font-display-tight text-3xl">New customer company</h1>
      <p className="mt-2 max-w-xl text-sm text-mec-ink/60">
        Create the company account, assign a sales rep, and optionally invite
        the first portal user — they&apos;ll set their own password by email.
      </p>
      <div className="mt-8">
        <CompanyForm salesReps={salesReps} />
      </div>
    </div>
  );
}
