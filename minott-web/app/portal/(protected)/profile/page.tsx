import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MapPin, MessageCircle } from "lucide-react";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { ProfileForm } from "@/components/portal/ProfileForm";
import { getPortalSession, getUserCompany } from "@/lib/portal";
import { SHOWROOM_ADDRESS, WHATSAPP_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Your Profile | Minott Equipment & Chemicals",
  description:
    "View and update your company and contact details for the Minott Equipment & Chemicals customer portal.",
};

export default async function PortalProfilePage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/sign-in");
  if (session.user.role !== "customer") redirect("/portal");

  const { user } = session;
  const company = await getUserCompany(user.id);

  return (
    <div>
      <RevealOnScroll>
        <Eyebrow>Customer Portal</Eyebrow>
        <h1 className="mt-4 font-display-tight text-4xl leading-none tracking-tight md:text-5xl">
          Your profile
        </h1>
        <p className="mt-3 text-mec-ink/65">
          Keep your company and contact details current so our team can reach
          the right person on every quote.
        </p>
      </RevealOnScroll>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <RevealOnScroll delay={0.05}>
          {company && (
            <div className="mb-8 rounded-md border border-mec-ink/10 bg-mec-pure p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mec-ink/50">
                Company · managed by MEC
              </p>
              <p className="mt-2 font-display-tight text-2xl tracking-tight">
                {company.name}
              </p>
              <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm text-mec-ink/70 sm:grid-cols-2">
                {company.mecAccountNumber && (
                  <div className="flex gap-2">
                    <dt className="text-mec-ink/50">MEC account #</dt>
                    <dd className="font-mono">{company.mecAccountNumber}</dd>
                  </div>
                )}
                {company.industry && (
                  <div className="flex gap-2">
                    <dt className="text-mec-ink/50">Industry</dt>
                    <dd>{company.industry}</dd>
                  </div>
                )}
                {company.location && (
                  <div className="flex gap-2">
                    <dt className="text-mec-ink/50">Location</dt>
                    <dd>{company.location}</dd>
                  </div>
                )}
              </dl>
              <p className="mt-3 text-xs text-mec-ink/55">
                Need a company detail changed? Contact your MEC sales
                representative.
              </p>
            </div>
          )}
          <ProfileForm
            user={{
              name: user.name,
              email: user.email,
              phone: user.phone,
              whatsapp: user.whatsapp,
            }}
          />
        </RevealOnScroll>

        <RevealOnScroll delay={0.1}>
          <div className="rounded-md border border-mec-ink/10 bg-mec-pure p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mec-ink/50">
              Need a hand?
            </p>
            <p className="mt-3 text-sm text-mec-ink/70">
              Your MEC sales representative can update your account, reset your
              password, or talk through pricing.
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-pill bg-mec-red px-4 py-2 text-sm font-semibold text-mec-pure transition hover:bg-mec-red-hover"
            >
              <MessageCircle aria-hidden className="h-4 w-4" />
              Message us on WhatsApp
            </a>
            <p className="mt-6 flex items-start gap-2 border-t border-mec-ink/10 pt-5 text-sm text-mec-ink/65">
              <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-mec-red" />
              <span>
                Visit our showroom
                <br />
                {SHOWROOM_ADDRESS}
              </span>
            </p>
          </div>
        </RevealOnScroll>
      </div>
    </div>
  );
}
