import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { SalesSignInForm } from "@/components/sales/SalesSignInForm";
import { getSalesSession } from "@/lib/sales";

export const metadata: Metadata = {
  title: "Sales Portal Sign In | Minott Equipment & Chemicals",
};

export default async function SalesSignInPage() {
  const sales = await getSalesSession();
  if (sales) redirect("/sales");

  return (
    <section className="grid min-h-[80vh] place-items-center bg-mec-mist px-6 py-[var(--spacing-section-y)] text-mec-ink">
      <div className="w-full max-w-md">
        <div className="rounded-md border border-mec-ink/10 bg-mec-pure p-8 shadow-[0_24px_48px_-12px_rgba(13,13,13,0.08)] md:p-10">
          <Eyebrow>Sales Portal</Eyebrow>
          <h1 className="mt-4 font-display-tight text-4xl leading-none tracking-tight md:text-5xl">
            Rep sign in
          </h1>
          <p className="mt-3 text-sm text-mec-ink/65">
            Sign in to manage your customers and their quote requests.
          </p>
          <SalesSignInForm />
        </div>
        <p className="mt-6 text-center text-xs text-mec-ink/50">
          <Link href="/" className="hover:text-mec-red">← Back to minottequipment.com</Link>
        </p>
      </div>
    </section>
  );
}
