import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SalesRepForm } from "@/components/admin/SalesRepForm";

export default async function EditSalesRepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repId = Number(id);
  if (!Number.isFinite(repId)) notFound();

  const rep = await db.salesRep.findUnique({
    where: { id: repId },
    select: { id: true, name: true, email: true, phone: true, active: true },
  });
  if (!rep) notFound();

  return (
    <div>
      <Link
        href="/admin/sales-reps"
        className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red"
      >
        ← Back to sales reps
      </Link>
      <h1 className="mt-4 font-display-tight text-3xl">Edit sales rep</h1>
      <div className="mt-8">
        <SalesRepForm rep={rep} />
      </div>
    </div>
  );
}
