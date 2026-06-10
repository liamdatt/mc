import type { Metadata } from "next";
import { MapPin, MessageCircle } from "lucide-react";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { ProfileForm } from "@/components/portal/ProfileForm";
import { getPortalSession } from "@/lib/portal";
import { SHOWROOM_ADDRESS, WHATSAPP_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Your Profile | Minott Equipment & Chemicals",
  description:
    "View and update your company and contact details for the Minott Equipment & Chemicals customer portal.",
};

export default async function PortalProfilePage() {
  const session = await getPortalSession();
  if (!session) return null;

  const { user } = session;

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
          <ProfileForm
            user={{
              name: user.name,
              email: user.email,
              companyName: user.companyName,
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
