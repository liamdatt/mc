import { notFound } from "next/navigation";
import { requireRoleSession } from "@/lib/portal";
import { getApplicationById } from "@/lib/applications";
import { matchGuest } from "@/lib/customer-match";
import { APPLICATION_STATUS, APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { ApplicationDecisionForms } from "@/components/admin/ApplicationDecisionForms";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

const dl = "text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/50";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRoleSession(["admin", "ar"]);
  const { id } = await params;
  const appId = Number(id);
  if (!Number.isInteger(appId)) notFound();
  const app = await getApplicationById(appId);
  if (!app) notFound();

  const open = app.status === APPLICATION_STATUS.SUBMITTED || app.status === APPLICATION_STATUS.INFO_REQUESTED;
  const hint = open ? await matchGuest({ email: app.email, phone: app.phone, company: app.companyName }) : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display-tight text-3xl">{app.companyName}</h1>
        <span className="rounded-pill bg-mec-mist px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-ink/70">{APPLICATION_STATUS_LABELS[app.status] ?? app.status}</span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-black/10 bg-mec-pure p-5 text-sm">
          <p className={dl}>Company</p>
          <p className="mt-1 font-semibold">{app.companyName}</p>
          <p className="text-mec-ink/70">{app.industry} · {app.location}</p>
          <p className={`${dl} mt-4`}>Contact</p>
          <p className="mt-1 font-semibold">{app.contactName}</p>
          <p className="text-mec-ink/70"><a href={`mailto:${app.email}`} className="hover:text-mec-red">{app.email}</a> · {app.phone}</p>
          {app.notes && (<><p className={`${dl} mt-4`}>Notes</p><p className="mt-1 whitespace-pre-line text-mec-ink/80">{app.notes}</p></>)}
          <p className={`${dl} mt-4`}>Submitted</p>
          <p className="mt-1 text-mec-ink/70">{formatDate(app.createdAt)}</p>
        </div>

        <div className="rounded-md border border-black/10 bg-mec-pure p-5 text-sm">
          <p className={dl}>Quote request #{app.inquiry.id}</p>
          <ul className="mt-2 space-y-1 text-mec-ink/80">
            {app.inquiry.items.map((it) => (<li key={it.id}>{it.quantity} × {it.productName}</li>))}
          </ul>
          {app.inquiry.message && <p className="mt-3 whitespace-pre-line text-mec-ink/70">{app.inquiry.message}</p>}
          {hint && (
            <p className={`mt-4 rounded-sm px-3 py-2 text-xs ${hint.status === "POTENTIAL_MATCH" ? "bg-mec-red/10 text-mec-red" : "bg-mec-mist text-mec-ink/60"}`}>
              {hint.status === "POTENTIAL_MATCH"
                ? "Heads up: these details now match an existing portal record. Check Customers before approving to avoid a duplicate."
                : "No existing portal record matches these details."}
            </p>
          )}
        </div>
      </div>

      {open ? (
        <div className="mt-8"><ApplicationDecisionForms id={app.id} /></div>
      ) : (
        <div className="mt-8 rounded-md border border-black/10 bg-mec-pure p-5 text-sm">
          <p className={dl}>Decision</p>
          <p className="mt-1 font-semibold">{APPLICATION_STATUS_LABELS[app.status]} {app.decidedAt ? `· ${formatDate(app.decidedAt)}` : ""} {app.decidedBy ? `· by ${app.decidedBy.name}` : ""}</p>
          {app.decisionNote && <p className="mt-2 whitespace-pre-line text-mec-ink/80">{app.decisionNote}</p>}
          {app.company && <p className="mt-2 text-mec-ink/70">Company created: <a href={`/portal/customers/${app.company.id}`} className="font-semibold text-mec-red hover:underline">{app.company.name}</a></p>}
        </div>
      )}
    </div>
  );
}
