import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RecoverForm } from "@/components/portal/RecoverForm";

export const metadata: Metadata = {
  title: "Recover Your Account | Minott Equipment & Chemicals",
};

export default async function RecoverPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const { ref } = await searchParams;
  const refToken = typeof ref === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(ref) ? ref : null;

  return (
    <section className="grid min-h-[80vh] place-items-center bg-mec-mist px-6 py-[var(--spacing-section-y)] text-mec-ink">
      <div className="w-full max-w-md">
        <div className="rounded-md border border-mec-ink/10 bg-mec-pure p-8 shadow-[0_24px_48px_-12px_rgba(13,13,13,0.08)] md:p-10">
          <Eyebrow>Accounts Portal</Eyebrow>
          <h1 className="mt-4 font-display-tight text-4xl leading-none tracking-tight md:text-5xl">
            Recover your account
          </h1>
          <p className="mt-3 text-sm text-mec-ink/65">
            Verify your company with the MEC account number from your invoices and
            we&apos;ll send password instructions to the email on file.
            {refToken && " Your quote request will be attached to your account."}
          </p>
          <RecoverForm refToken={refToken} />
        </div>
        <p className="mt-6 text-center text-xs text-mec-ink/50">
          <Link href="/portal/sign-in" className="hover:text-mec-red">← Back to sign in</Link>
        </p>
      </div>
    </section>
  );
}
