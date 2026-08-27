import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { ForgotPasswordForm } from "@/components/portal/ForgotPasswordForm";
import { getPortalSession } from "@/lib/portal";

export const metadata: Metadata = {
  title: "Forgot Password | Minott Equipment & Chemicals",
};

export default async function ForgotPasswordPage() {
  const session = await getPortalSession();
  if (session) redirect("/portal");

  return (
    <section className="grid min-h-[80vh] place-items-center bg-mec-mist px-6 py-[var(--spacing-section-y)] text-mec-ink">
      <div className="w-full max-w-md">
        <div className="rounded-md border border-mec-ink/10 bg-mec-pure p-8 shadow-[0_24px_48px_-12px_rgba(13,13,13,0.08)] md:p-10">
          <Eyebrow>Accounts Portal</Eyebrow>
          <h1 className="mt-4 font-display-tight text-4xl leading-none tracking-tight md:text-5xl">
            Forgot your password?
          </h1>
          <p className="mt-3 text-sm text-mec-ink/65">
            Enter the email on your account and we&apos;ll send a reset link.
          </p>
          <ForgotPasswordForm />
          <p className="mt-8 border-t border-mec-ink/10 pt-6 text-sm text-mec-ink/65">
            Don&apos;t know your login email?{" "}
            <Link href="/portal/recover" className="font-semibold text-mec-red hover:underline">
              Recover with your MEC account number
            </Link>
          </p>
        </div>
        <p className="mt-6 text-center text-xs text-mec-ink/50">
          <Link href="/portal/sign-in" className="hover:text-mec-red">← Back to sign in</Link>
        </p>
      </div>
    </section>
  );
}
