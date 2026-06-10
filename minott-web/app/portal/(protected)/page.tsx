import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  FileText,
  Package,
  PlusCircle,
} from "lucide-react";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import {
  getPortalSession,
  getUserInquiries,
  getUserInquiryCount,
  getUserInquiryCountByType,
} from "@/lib/portal";
import {
  INQUIRY_STATUS_LABELS,
  INQUIRY_TYPE,
  INQUIRY_TYPE_LABELS,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Your Portal | Minott Equipment & Chemicals",
  description:
    "Your Minott Equipment & Chemicals customer portal dashboard — quote requests and order history.",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

const QUICK_LINKS = [
  {
    href: "/products",
    label: "Browse products",
    description: "Explore the full chemicals & janitorial catalog.",
    icon: Package,
  },
  {
    href: "/quote",
    label: "Start a quote",
    description: "Build a request and get pricing within 48 hours.",
    icon: PlusCircle,
  },
  {
    href: "/portal/history",
    label: "View history",
    description: "See every quote and request you've submitted.",
    icon: FileText,
  },
];

export default async function PortalDashboardPage() {
  // The protected layout guarantees a session, but read it again here for the
  // user fields (companyName etc.) so this page is self-contained.
  const session = await getPortalSession();
  if (!session) return null;

  const { user } = session;
  const [recent, totalInquiries, totalQuotes] = await Promise.all([
    getUserInquiries(user.id, 5),
    getUserInquiryCount(user.id),
    getUserInquiryCountByType(user.id, INQUIRY_TYPE.QUOTE),
  ]);

  const company = user.companyName?.trim();
  const greetName = user.name?.split(" ")[0] || "there";

  return (
    <div>
      <RevealOnScroll>
        <Eyebrow>Customer Portal</Eyebrow>
        <h1 className="mt-4 font-display-tight text-4xl leading-none tracking-tight md:text-5xl">
          Welcome back, {greetName}
        </h1>
        {company && (
          <p className="mt-2 text-mec-ink/65">{company}</p>
        )}
      </RevealOnScroll>

      {/* Summary cards */}
      <RevealOnScroll
        delay={0.05}
        className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="rounded-md border border-mec-ink/10 bg-mec-pure p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mec-ink/50">
            Quote requests
          </p>
          <p className="mt-3 font-display-tight text-5xl leading-none tracking-tight">
            {totalQuotes}
          </p>
          <p className="mt-2 text-sm text-mec-ink/60">
            Submitted to date
          </p>
        </div>

        <div className="rounded-md border border-mec-ink/10 bg-mec-pure p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mec-ink/50">
            Total requests
          </p>
          <p className="mt-3 font-display-tight text-5xl leading-none tracking-tight">
            {totalInquiries}
          </p>
          <p className="mt-2 text-sm text-mec-ink/60">
            Quotes, samples &amp; messages
          </p>
        </div>

        <div className="flex flex-col justify-center rounded-md border border-mec-red/20 bg-mec-red/5 p-6">
          <Clock aria-hidden className="h-6 w-6 text-mec-red" />
          <p className="mt-3 font-display-tight text-2xl leading-tight tracking-tight">
            48-hour quote turnaround
          </p>
          <p className="mt-1.5 text-sm text-mec-ink/65">
            Our team responds to quote requests, usually within forty-eight
            hours.
          </p>
        </div>
      </RevealOnScroll>

      {/* Recent quote requests */}
      <RevealOnScroll delay={0.1} className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display-tight text-2xl tracking-tight">
            Recent requests
          </h2>
          <Link
            href="/portal/history"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-mec-red hover:underline"
          >
            View all
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="mt-5 rounded-md border border-dashed border-mec-ink/20 bg-mec-pure p-8 text-center">
            <p className="text-mec-ink/65">
              You haven&apos;t submitted any requests yet.
            </p>
            <Link
              href="/quote"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-mec-red hover:underline"
            >
              Start your first quote
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {recent.map((inq) => (
              <li
                key={inq.id}
                className="rounded-md border border-mec-ink/10 bg-mec-pure p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="inline-block rounded-pill bg-mec-mist px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
                      {INQUIRY_TYPE_LABELS[inq.type] ?? inq.type}
                    </span>
                    <p className="mt-2 text-sm text-mec-ink/65">
                      {formatDate(inq.createdAt)}
                      {inq.type === INQUIRY_TYPE.QUOTE &&
                        ` · ${inq.items.length} item${
                          inq.items.length === 1 ? "" : "s"
                        }`}
                      {inq.type === INQUIRY_TYPE.SAMPLE &&
                        inq.product &&
                        ` · ${inq.product.name}`}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-pill border border-mec-ink/15 px-3 py-1 text-xs font-semibold text-mec-ink/70">
                    {INQUIRY_STATUS_LABELS[inq.status] ?? inq.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </RevealOnScroll>

      {/* Quick links */}
      <RevealOnScroll delay={0.15} className="mt-12">
        <h2 className="font-display-tight text-2xl tracking-tight">
          Quick links
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex flex-col rounded-md border border-mec-ink/10 bg-mec-pure p-6 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-mec-red/40 hover:shadow-[0_24px_48px_-12px_rgba(225,6,0,0.18)]"
              >
                <Icon aria-hidden className="h-6 w-6 text-mec-red" />
                <p className="mt-4 font-semibold">{link.label}</p>
                <p className="mt-1 text-sm text-mec-ink/60">
                  {link.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-mec-red">
                  Go
                  <ArrowRight
                    aria-hidden
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </RevealOnScroll>
    </div>
  );
}
