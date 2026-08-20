import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { SignInForm } from "@/components/portal/SignInForm";
import { getPortalSession } from "@/lib/portal";
import { WHATSAPP_URL } from "@/lib/constants";
import { safeRelativePath } from "@/lib/safe-path";

export const metadata: Metadata = {
  title: "Accounts Portal Sign In | Minott Equipment & Chemicals",
  description:
    "Sign in to the Minott Equipment & Chemicals accounts portal — customers, sales reps and administrators.",
};

export default async function PortalSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const safeNext = safeRelativePath(next);

  // Already signed in? Skip the form.
  const session = await getPortalSession();
  if (session) redirect(safeNext ?? "/portal");

  return (
    <section className="grid min-h-[80vh] place-items-center bg-mec-mist px-6 py-[var(--spacing-section-y)] text-mec-ink">
      <RevealOnScroll className="w-full max-w-md">
        <div className="rounded-md border border-mec-ink/10 bg-mec-pure p-8 shadow-[0_24px_48px_-12px_rgba(13,13,13,0.08)] md:p-10">
          <Eyebrow>Accounts Portal</Eyebrow>
          <h1 className="mt-4 font-display-tight text-4xl leading-none tracking-tight md:text-5xl">
            Welcome back
          </h1>
          <p className="mt-3 text-sm text-mec-ink/65">
            Sign in to your Minott Equipment &amp; Chemicals account.
          </p>

          <SignInForm next={safeNext} />

          <p className="mt-8 border-t border-mec-ink/10 pt-6 text-sm text-mec-ink/65">
            Need access? Portal accounts are set up by our team.{" "}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-mec-red hover:underline"
            >
              <MessageCircle aria-hidden className="h-4 w-4" />
              Contact your MEC sales representative
            </a>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-mec-ink/50">
          <Link href="/" className="hover:text-mec-red">
            ← Back to minottequipment.com
          </Link>
        </p>
      </RevealOnScroll>
    </section>
  );
}
