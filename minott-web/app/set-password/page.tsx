import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";

export const metadata: Metadata = {
  title: "Set Your Password | Minott Equipment & Chemicals",
};

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; portal?: string; error?: string }>;
}) {
  const { token, portal, error } = await searchParams;
  const portalKind = portal === "sales" ? "sales" : portal === "admin" ? "admin" : "customer";
  // BetterAuth redirects here with ?error=INVALID_TOKEN when the link is bad.
  const validToken = error ? null : token ?? null;

  return (
    <section className="grid min-h-[80vh] place-items-center bg-mec-mist px-6 py-[var(--spacing-section-y)] text-mec-ink">
      <div className="w-full max-w-md">
        <div className="rounded-md border border-mec-ink/10 bg-mec-pure p-8 shadow-[0_24px_48px_-12px_rgba(13,13,13,0.08)] md:p-10">
          <Eyebrow>
            {portalKind === "sales" ? "Sales Portal" : portalKind === "admin" ? "Admin" : "Customer Portal"}
          </Eyebrow>
          <h1 className="mt-4 font-display-tight text-4xl leading-none tracking-tight md:text-5xl">
            Set your password
          </h1>
          <p className="mt-3 text-sm text-mec-ink/65">
            Choose a password to activate your Minott Equipment &amp; Chemicals
            account.
          </p>
          <SetPasswordForm token={validToken} portal={portalKind} />
        </div>
        <p className="mt-6 text-center text-xs text-mec-ink/50">
          <Link href="/" className="hover:text-mec-red">← Back to minottequipment.com</Link>
        </p>
      </div>
    </section>
  );
}
