import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SalesRepForm } from "@/components/admin/SalesRepForm";
import { ResendInviteButton } from "@/components/admin/ResendInviteButton";

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
    select: {
      id: true, name: true, email: true, phone: true, active: true,
      user: { select: { id: true, activatedAt: true } },
    },
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
      {rep.user && (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {rep.user.activatedAt ? (
            <span className="rounded-pill bg-mec-ink/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/60">Portal active</span>
          ) : (
            <span className="rounded-pill bg-mec-red/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-mec-red">Invite pending</span>
          )}
          <ResendInviteButton userId={rep.user.id} />
        </div>
      )}
      <div className="mt-8">
        <SalesRepForm
          rep={{
            id: rep.id,
            name: rep.name,
            email: rep.email,
            phone: rep.phone,
            active: rep.active,
          }}
        />
      </div>
    </div>
  );
}
