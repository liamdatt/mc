import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRoleSession } from "@/lib/portal";
import { getApplicationById } from "@/lib/applications";
import { matchGuest } from "@/lib/customer-match";
import { APPLICATION_STATUS, APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { ApplicationDecisionForms } from "@/components/admin/ApplicationDecisionForms";
import { RevertApprovalForm } from "@/components/admin/RevertApprovalForm";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

const dl = "text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/50";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (<><p className={`${dl} mt-3`}>{label}</p><p className="mt-0.5 text-mec-ink/80">{value}</p></>);
}

function address(street?: string | null, city?: string | null, parish?: string | null, zip?: string | null) {
  return [street, city, parish, zip].filter(Boolean).join(", ") || null;
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRoleSession(["admin", "ar"]);
  const isAdmin = session.user.role === "admin";
  const { id } = await params;
  const appId = Number(id);
  if (!Number.isInteger(appId)) notFound();
  const app = await getApplicationById(appId);
  if (!app) notFound();

  const open = app.status === APPLICATION_STATUS.SUBMITTED || app.status === APPLICATION_STATUS.INFO_REQUESTED;
  const awaitingSetup = app.status === APPLICATION_STATUS.APPROVED && app.companyId === null;
  const hint = open || awaitingSetup ? await matchGuest({ email: app.email, phone: app.phone, company: app.companyName }) : null;
  const shipping = address(app.shippingStreet, app.shippingCity, app.shippingParish, app.shippingZip);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display-tight text-3xl">{app.companyName}</h1>
        <span className="rounded-pill bg-mec-mist px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-ink/70">{APPLICATION_STATUS_LABELS[app.status] ?? app.status}</span>
      </div>

      {awaitingSetup && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-md border border-mec-red/30 bg-mec-red/5 p-5 text-sm">
          <p className="flex-1">
            <span className="font-semibold">Approved{app.decidedBy ? ` by ${app.decidedBy.name}` : ""}{app.decidedAt ? ` · ${formatDate(app.decidedAt)}` : ""}.</span>{" "}
            {isAdmin ? "Create the company account to assign the account number, terms and rep, and send the invite." : "An admin will create the account and send the invite."}
          </p>
          {isAdmin && (
            <Link href={`/portal/customers/new?application=${app.id}`} className="bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover">Create account</Link>
          )}
          <RevertApprovalForm id={app.id} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-black/10 bg-mec-pure p-5 text-sm">
          <p className={dl}>Business</p>
          <p className="mt-1 font-semibold">{app.companyName}</p>
          <p className="text-mec-ink/70">{app.industry}{app.businessType ? ` · ${app.businessType}` : ""}</p>
          <Field label="In business since" value={app.inBusinessSince} />
          <Field label="TRN" value={app.trn} />
          <Field label="Tax exemption number" value={app.taxExemptionNumber} />
          <Field label="Billing address" value={address(app.billingStreet, app.billingCity, app.billingParish, app.billingZip) ?? app.location} />
          <Field label="Shipping address" value={shipping ?? "Same as billing"} />

          <p className={`${dl} mt-5`}>Principal contact</p>
          <p className="mt-1 font-semibold">{app.contactName}{app.principalTitle ? <span className="font-normal text-mec-ink/60"> · {app.principalTitle}</span> : null}</p>
          <p className="text-mec-ink/70"><a href={`mailto:${app.email}`} className="hover:text-mec-red">{app.email}</a> · {app.phone}</p>
          {app.accountingName && (
            <>
              <p className={`${dl} mt-4`}>Accounting contact</p>
              <p className="mt-1 font-semibold">{app.accountingName}</p>
              <p className="text-mec-ink/70">{[app.accountingEmail, app.accountingPhone].filter(Boolean).join(" · ")}</p>
            </>
          )}
          {app.notes && (<><p className={`${dl} mt-4`}>Notes</p><p className="mt-1 whitespace-pre-line text-mec-ink/80">{app.notes}</p></>)}
          {app.status === APPLICATION_STATUS.SUBMITTED && app.decisionNote && (
            <><p className={`${dl} mt-4`}>Internal note</p><p className="mt-1 whitespace-pre-line text-mec-ink/80">{app.decisionNote}</p></>
          )}
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
                ? "Heads up: these details now match an existing portal record. Check Customers before creating an account to avoid a duplicate."
                : "No existing portal record matches these details."}
            </p>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-8"><ApplicationDecisionForms id={app.id} /></div>
      )}

      {!open && !awaitingSetup && (
        <div className="mt-8 rounded-md border border-black/10 bg-mec-pure p-5 text-sm">
          <p className={dl}>Decision</p>
          <p className="mt-1 font-semibold">
            {app.status === APPLICATION_STATUS.REJECTED ? "Rejected" : "Approved"}
            {app.decidedAt ? ` · ${formatDate(app.decidedAt)}` : ""}{app.decidedBy ? ` · by ${app.decidedBy.name}` : ""}
          </p>
          {app.status === APPLICATION_STATUS.ACCOUNT_CREATED && (
            <p className="mt-1 font-semibold">
              Account created{app.accountCreatedAt ? ` · ${formatDate(app.accountCreatedAt)}` : ""}{app.accountCreatedBy ? ` · by ${app.accountCreatedBy.name}` : ""}
            </p>
          )}
          {app.decisionNote && app.status === APPLICATION_STATUS.REJECTED && <p className="mt-2 whitespace-pre-line text-mec-ink/80">{app.decisionNote}</p>}
          {app.company && (
            <p className="mt-2 text-mec-ink/70">
              Company: <Link href={`/portal/customers/${app.company.id}`} className="font-semibold text-mec-red hover:underline">{app.company.name}</Link>
              {app.company.mecAccountNumber ? ` · Account ${app.company.mecAccountNumber}` : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
