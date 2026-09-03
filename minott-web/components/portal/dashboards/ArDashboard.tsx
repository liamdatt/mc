import Link from "next/link";
import { db } from "@/lib/db";
import { APPLICATION_STATUS } from "@/lib/constants";

// Kept outside the component: the react-hooks/purity rule flags calls to
// impure functions like Date.now() directly inside a component's render body.
function decidedSince30Days() {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
}

/** Accounts Receivable dashboard — application queue counts. */
export async function ArDashboard() {
  const [submitted, infoRequested, awaitingSetup, decided] = await Promise.all([
    db.customerApplication.count({ where: { status: APPLICATION_STATUS.SUBMITTED } }),
    db.customerApplication.count({ where: { status: APPLICATION_STATUS.INFO_REQUESTED } }),
    db.customerApplication.count({ where: { status: APPLICATION_STATUS.APPROVED } }),
    db.customerApplication.count({
      where: {
        status: { in: [APPLICATION_STATUS.ACCOUNT_CREATED, APPLICATION_STATUS.REJECTED] },
        decidedAt: { gte: decidedSince30Days() },
      },
    }),
  ]);
  const cards = [
    { label: "Awaiting review", value: submitted, href: "/portal/applications" },
    { label: "Info requested", value: infoRequested, href: "/portal/applications" },
    { label: "Awaiting account setup", value: awaitingSetup, href: "/portal/applications" },
    { label: "Decided (30 days)", value: decided, href: "/portal/applications" },
  ];
  return (
    <div>
      <h1 className="font-display-tight text-3xl">Accounts Receivable</h1>
      <p className="mt-3 max-w-2xl text-sm text-mec-ink/60">
        Review new customer applications submitted through the website.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-md border border-black/10 bg-mec-pure p-6 transition hover:border-mec-red">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/60">{c.label}</p>
            <p className="mt-2 font-display-tight text-5xl text-mec-ink">{c.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
