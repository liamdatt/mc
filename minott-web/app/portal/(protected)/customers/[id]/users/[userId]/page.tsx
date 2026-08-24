import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CompanyUserForm } from "@/components/admin/CompanyUserForm";
import { ResendInviteButton } from "@/components/admin/ResendInviteButton";
import { requireAdminSession } from "@/lib/portal";

export default async function CompanyUserEditPage({
  params,
}: {
  params: Promise<{ id: string; userId: string }>;
}) {
  await requireAdminSession();
  const { id, userId } = await params;
  const companyId = Number(id);
  if (!Number.isInteger(companyId)) notFound();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      whatsapp: true,
      activatedAt: true,
      role: true,
      companyId: true,
    },
  });
  if (!user || user.role !== "customer" || user.companyId !== companyId)
    notFound();

  return (
    <div>
      <Link
        href={`/portal/customers/${companyId}`}
        className="text-sm font-semibold text-mec-ink/60 hover:text-mec-red"
      >
        ← Back to company
      </Link>
      <h1 className="mt-4 font-display-tight text-3xl">Edit portal user</h1>
      <p className="mt-2 max-w-xl text-sm text-mec-ink/60">
        Update {user.name}&apos;s contact details. They set their own password
        via the emailed invite — use “Resend invite” to send a fresh link.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {user.activatedAt ? (
          <span className="rounded-pill bg-mec-ink/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/60">
            Active
          </span>
        ) : (
          <span className="rounded-pill bg-mec-red/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-mec-red">
            Invite pending
          </span>
        )}
        <ResendInviteButton userId={user.id} />
      </div>
      <div className="mt-8">
        <CompanyUserForm
          companyId={companyId}
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            whatsapp: user.whatsapp,
          }}
        />
      </div>
    </div>
  );
}
