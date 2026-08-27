import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/primitives/Section";
import { Container } from "@/components/primitives/Container";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { ApplicationForm } from "@/components/register/ApplicationForm";
import { getInquiryByRef } from "@/lib/applications";
import { APPLICATION_STATUS, MATCH_STATUS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "New Customer Form — Minott Equipment & Chemicals",
  description: "Apply to open a Minott Equipment & Chemicals customer account.",
};

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Section tone="light" className="pt-40">
      <Container>
        <Eyebrow tone="red">New Customer Form</Eyebrow>
        <h1 className="mt-6 max-w-4xl font-display-tight text-h1 leading-[0.95]">{title}</h1>
        <div className="mt-12">{children}</div>
      </Container>
    </Section>
  );
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const { ref } = await searchParams;
  const inquiry = await getInquiryByRef(typeof ref === "string" ? ref : undefined);
  // Resolve the application first: an approved application flips the inquiry's
  // matchStatus to VERIFIED, so the link must stay valid once an application
  // exists — the status branch below then shows the right copy.
  const app = inquiry?.application ?? null;

  if (
    !inquiry ||
    inquiry.type !== "QUOTE" ||
    (inquiry.matchStatus !== MATCH_STATUS.NO_MATCH && !app)
  ) {
    return (
      <Shell title="This link isn't valid.">
        <p className="max-w-2xl text-lede text-mec-ink/80">
          Start a quote request and we&apos;ll direct you to the New Customer Form from there.
        </p>
        <Link href="/quote" className="mt-6 inline-block bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover">Go to my quote</Link>
      </Shell>
    );
  }

  if (app && app.status !== APPLICATION_STATUS.INFO_REQUESTED) {
    const copy =
      app.status === APPLICATION_STATUS.APPROVED
        ? "Your application has been approved — check your email for the link to set your password."
        : app.status === APPLICATION_STATUS.REJECTED
          ? "Your application was not approved. Please check your email for details."
          : "Your application is under review. Our Accounts Receivable team will respond within one business day.";
    return (
      <Shell title="Application status">
        <p className="max-w-2xl text-lede text-mec-ink/80">{copy}</p>
      </Shell>
    );
  }

  const prefill = app
    ? { companyName: app.companyName, industry: app.industry, location: app.location, contactName: app.contactName, email: app.email, phone: app.phone, notes: app.notes ?? "" }
    : { companyName: inquiry.company ?? "", industry: inquiry.industry ?? "", location: inquiry.location ?? "", contactName: inquiry.name, email: inquiry.email, phone: inquiry.phone ?? "", notes: "" };

  return (
    <Shell title="Open an MEC account.">
      <p className="max-w-2xl text-lede text-mec-ink/80">
        We&apos;ve prefilled this from your quote request. Check the details, add anything
        missing, and our Accounts Receivable team will review your application.
      </p>
      {app?.decisionNote && (
        <div className="mt-8 max-w-2xl rounded-md border border-mec-red/30 bg-mec-red/5 p-5 text-sm text-mec-ink/80">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-mec-red">We need a little more information</p>
          <p className="mt-2 whitespace-pre-line">{app.decisionNote}</p>
        </div>
      )}
      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr]">
        <ApplicationForm refToken={inquiry.ref!} prefill={prefill} resubmit={Boolean(app)} />
        <aside className="h-fit rounded-md border border-black/10 bg-mec-pure p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/60">
            Quote request #{inquiry.id} · {inquiry.items.length} item{inquiry.items.length === 1 ? "" : "s"}
          </p>
          <p className="mt-2 text-sm text-mec-ink/70">Stays attached to this application.</p>
          <ul className="mt-4 space-y-1 text-sm text-mec-ink/80">
            {inquiry.items.map((it) => (<li key={it.id}>{it.quantity} × {it.productName}</li>))}
          </ul>
        </aside>
      </div>
    </Shell>
  );
}
