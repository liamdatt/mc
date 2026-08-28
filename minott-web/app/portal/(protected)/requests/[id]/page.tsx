import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  INQUIRY_TYPE,
  INQUIRY_TYPE_LABELS,
  MATCH_STATUS_LABELS,
  APPLICATION_STATUS_LABELS,
} from "@/lib/constants";
import { requireAdminSession } from "@/lib/portal";
import { InquiryStatusSelect } from "@/components/admin/InquiryStatusSelect";
import { AttachInquiryForm } from "@/components/admin/AttachInquiryForm";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const dl = "text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/50";

export default async function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const inquiryId = Number(id);

  const inquiry = await db.inquiry.findUnique({
    where: { id: inquiryId },
    include: {
      items: { include: { variant: true } },
      product: true,
      variant: true,
      notes: { orderBy: { createdAt: "desc" } },
      companyRef: {
        select: {
          id: true,
          name: true,
          mecAccountNumber: true,
          salesRep: { select: { name: true } },
        },
      },
      matchedCompany: { select: { id: true, name: true } },
      application: { select: { id: true, status: true } },
      user: { select: { name: true, email: true } },
    },
  });
  if (!inquiry) notFound();

  const companies =
    inquiry.type === INQUIRY_TYPE.QUOTE
      ? await db.company.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, mecAccountNumber: true },
        })
      : [];

  return (
    <div>
      <p className="mb-4">
        <Link href="/portal/requests" className="text-sm font-semibold text-mec-red hover:underline">
          ← Back to requests
        </Link>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-pill bg-mec-mist px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
          {INQUIRY_TYPE_LABELS[inquiry.type] ?? inquiry.type}
        </span>
        {inquiry.type === INQUIRY_TYPE.QUOTE && inquiry.matchStatus && (
          <span
            className={`rounded-pill px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
              inquiry.matchStatus === "VERIFIED"
                ? "bg-mec-ink/10 text-mec-ink/70"
                : "bg-mec-red/10 text-mec-red"
            }`}
          >
            {MATCH_STATUS_LABELS[inquiry.matchStatus] ?? inquiry.matchStatus}
          </span>
        )}
        <h1 className="font-display-tight text-3xl">{inquiry.name}</h1>
        <InquiryStatusSelect id={inquiry.id} status={inquiry.status} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-black/10 bg-mec-pure p-5 text-sm">
          <p className={dl}>Contact</p>
          <p className="mt-1 font-semibold">{inquiry.name}</p>
          <p className="text-mec-ink/70">
            {inquiry.email ? (
              <a href={`mailto:${inquiry.email}`} className="hover:text-mec-red">
                {inquiry.email}
              </a>
            ) : null}
            {inquiry.phone ? `${inquiry.email ? " · " : ""}${inquiry.phone}` : ""}
          </p>
          {inquiry.company && (
            <p className="mt-1 text-mec-ink/70">{inquiry.company}</p>
          )}
          {(inquiry.industry || inquiry.location) && (
            <p className="mt-1 text-mec-ink/60">
              {[inquiry.industry, inquiry.location].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className={`${dl} mt-4`}>Submitted</p>
          <p className="mt-1 text-mec-ink/70">{formatDate(inquiry.createdAt)}</p>
          {inquiry.user && (
            <>
              <p className={`${dl} mt-4`}>Portal user</p>
              <p className="mt-1 text-mec-ink/70">
                {inquiry.user.name} · {inquiry.user.email}
              </p>
            </>
          )}
        </div>

        <div className="rounded-md border border-black/10 bg-mec-pure p-5 text-sm">
          <p className={dl}>Account</p>
          {inquiry.companyRef ? (
            <>
              <p className="mt-1 font-semibold">{inquiry.companyRef.name}</p>
              <p className="text-mec-ink/70">
                {inquiry.companyRef.mecAccountNumber
                  ? `#${inquiry.companyRef.mecAccountNumber}`
                  : "No account number on file"}
                {inquiry.companyRef.salesRep
                  ? ` · Rep: ${inquiry.companyRef.salesRep.name}`
                  : ""}
              </p>
            </>
          ) : (
            <p className="mt-1 text-mec-ink/60">Not attached</p>
          )}
          {inquiry.matchedCompany && (
            <p className="mt-2 text-xs text-mec-ink/60">
              Possible match: <strong>{inquiry.matchedCompany.name}</strong> (unverified)
            </p>
          )}
          {inquiry.application && (
            <p className="mt-2 text-xs text-mec-ink/60">
              Application: {APPLICATION_STATUS_LABELS[inquiry.application.status] ?? inquiry.application.status}{" "}
              <Link
                href={`/portal/applications/${inquiry.application.id}`}
                className="font-semibold text-mec-red hover:underline"
              >
                →
              </Link>
            </p>
          )}
        </div>
      </div>

      {inquiry.product && (
        <p className="mt-6 text-sm">
          <span className="text-mec-ink/60">Sample for:</span>{" "}
          <strong>{inquiry.product.name}</strong>
          {inquiry.variant && (
            <span className="text-mec-ink/60">
              {" "}
              ({inquiry.variant.label ?? inquiry.variant.size})
            </span>
          )}
        </p>
      )}

      {inquiry.items.length > 0 && (
        <div className="mt-6 rounded-md border border-black/10 bg-mec-pure p-5 text-sm">
          <p className={dl}>Items</p>
          <ul className="mt-2 space-y-1.5 text-mec-ink/80">
            {inquiry.items.map((it) => (
              <li key={it.id}>
                {it.quantity} × {it.productName}
                {it.variant && (
                  <span className="text-mec-ink/60">
                    {" "}
                    ({it.variant.label ?? it.variant.size})
                  </span>
                )}
                {it.dealLabel && (
                  <span className="ml-2 inline-flex rounded-pill bg-mec-red px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-pure">
                    {it.dealLabel}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {inquiry.message && (
        <div className="mt-6 rounded-md border border-black/10 bg-mec-pure p-5 text-sm">
          <p className={dl}>Message</p>
          <p className="mt-2 whitespace-pre-line text-mec-ink/80">{inquiry.message}</p>
        </div>
      )}

      {inquiry.notes.length > 0 && (
        <div className="mt-6 rounded-md border border-black/10 bg-mec-pure p-5 text-sm">
          <p className={dl}>Rep notes</p>
          <div className="mt-2 space-y-1.5">
            {inquiry.notes.map((n) => (
              <p key={n.id} className="text-mec-ink/70">
                <span className="text-mec-ink">{n.body}</span>{" "}
                <span className="text-xs text-mec-ink/45">— {n.authorLabel}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {inquiry.type === INQUIRY_TYPE.QUOTE && (
        <div className="mt-6">
          <AttachInquiryForm
            inquiryId={inquiry.id}
            currentCompanyId={inquiry.companyId}
            suggestedCompanyId={inquiry.matchedCompanyId}
            companies={companies}
          />
        </div>
      )}
    </div>
  );
}
