import Link from "next/link";
import { db } from "@/lib/db";
import {
  INQUIRY_TYPE,
  INQUIRY_TYPE_LABELS,
} from "@/lib/constants";
import { InquiryStatusSelect } from "@/components/admin/InquiryStatusSelect";
import { requireAdminSession } from "@/lib/portal";

const TABS = [
  { key: "ALL", label: "All" },
  { key: INQUIRY_TYPE.QUOTE, label: "Quotes" },
  { key: INQUIRY_TYPE.SAMPLE, label: "Samples" },
  { key: INQUIRY_TYPE.CONTACT, label: "Contact" },
];

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireAdminSession();
  const { type } = await searchParams;
  const active = type && type !== "ALL" ? type : "ALL";

  const inquiries = await db.inquiry.findMany({
    where: active === "ALL" ? {} : { type: active },
    orderBy: { createdAt: "desc" },
    include: { items: true, product: true, notes: { orderBy: { createdAt: "desc" } } },
  });

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Requests</h1>

      <div className="mt-6 flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "ALL" ? "/portal/requests" : `/portal/requests?type=${t.key}`}
            className={`rounded-pill px-4 py-1.5 text-sm font-semibold ${
              active === t.key
                ? "bg-mec-red text-mec-pure"
                : "border border-black/15 text-mec-ink/70 hover:border-mec-red"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {inquiries.length === 0 && (
          <p className="text-mec-ink/60">No requests yet.</p>
        )}
        {inquiries.map((inq) => (
          <div
            key={inq.id}
            className="rounded-md border border-black/10 bg-mec-pure p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="inline-block rounded-pill bg-mec-mist px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
                  {INQUIRY_TYPE_LABELS[inq.type] ?? inq.type}
                </span>
                <p className="mt-2 font-semibold">
                  {inq.name}
                  {inq.company ? ` · ${inq.company}` : ""}
                </p>
                <p className="text-sm text-mec-ink/70">
                  <a href={`mailto:${inq.email}`} className="hover:text-mec-red">
                    {inq.email}
                  </a>
                  {inq.phone ? ` · ${inq.phone}` : ""}
                </p>
              </div>
              <InquiryStatusSelect id={inq.id} status={inq.status} />
            </div>

            {inq.product && (
              <p className="mt-3 text-sm">
                <span className="text-mec-ink/60">Sample for:</span>{" "}
                <strong>{inq.product.name}</strong>
              </p>
            )}

            {inq.items.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-mec-ink/80">
                {inq.items.map((it) => (
                  <li key={it.id}>
                    {it.quantity} × {it.productName}
                  </li>
                ))}
              </ul>
            )}

            {inq.message && (
              <p className="mt-3 whitespace-pre-line text-sm text-mec-ink/75">
                {inq.message}
              </p>
            )}

            {inq.notes.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-black/5 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/50">
                  Rep notes
                </p>
                {inq.notes.map((n) => (
                  <p key={n.id} className="text-sm text-mec-ink/70">
                    <span className="text-mec-ink">{n.body}</span>{" "}
                    <span className="text-xs text-mec-ink/45">— {n.authorLabel}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
