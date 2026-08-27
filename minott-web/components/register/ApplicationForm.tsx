"use client";

import { useActionState } from "react";
import Link from "next/link";
import { INDUSTRIES } from "@/lib/industries";
import { submitApplication, type ApplicationFormState } from "@/lib/actions/applications";

const inputCls =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-4 py-3 text-mec-ink outline-none focus:border-mec-red";
const labelCls = "mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70";

export type ApplicationPrefill = {
  companyName: string;
  industry: string;
  location: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
};

export function ApplicationForm({
  refToken,
  prefill,
  resubmit,
}: {
  refToken: string;
  prefill: ApplicationPrefill;
  resubmit: boolean;
}) {
  const [state, formAction, pending] = useActionState<ApplicationFormState, FormData>(
    submitApplication,
    {},
  );

  if (state.done) {
    return (
      <div className="rounded-md border border-mec-red/30 bg-mec-red/5 p-8">
        <h2 className="font-display-tight text-h2 text-mec-ink">Application submitted.</h2>
        <p className="mt-3 max-w-xl text-mec-ink/75">
          Thanks — our Accounts Receivable team will review your application and
          respond within one business day. We&apos;ve emailed you a confirmation.
        </p>
        <Link href="/products" className="mt-6 inline-block bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover">
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-md border border-black/10 bg-mec-pure p-6">
      <input type="hidden" name="ref" value={refToken} />
      <h2 className="font-display-tight text-h3 text-mec-ink">Company details</h2>
      <label className={labelCls}>Company name *<input name="companyName" required defaultValue={prefill.companyName} className={inputCls} /></label>
      <label className={labelCls}>Industry *
        <select name="industry" required defaultValue={prefill.industry} className={inputCls}>
          <option value="" disabled>Select your industry</option>
          {INDUSTRIES.map((i) => (<option key={i} value={i}>{i}</option>))}
        </select>
      </label>
      <label className={labelCls}>Location *<input name="location" required defaultValue={prefill.location} className={inputCls} /></label>
      <h2 className="mt-8 font-display-tight text-h3 text-mec-ink">Contact</h2>
      <label className={labelCls}>Contact name *<input name="contactName" required defaultValue={prefill.contactName} className={inputCls} /></label>
      <label className={labelCls}>Email *<input name="email" type="email" required defaultValue={prefill.email} className={inputCls} /></label>
      <label className={labelCls}>Phone *<input name="phone" type="tel" required defaultValue={prefill.phone} className={inputCls} /></label>
      <label className={labelCls}>Notes<textarea name="notes" rows={3} defaultValue={prefill.notes} className={`${inputCls} resize-none`} /></label>
      {state.error && <p className="mt-3 text-sm text-mec-red">{state.error}</p>}
      <button type="submit" disabled={pending} className="mt-5 w-full bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50">
        {pending ? "Submitting…" : resubmit ? "Resubmit Application" : "Submit Application"}
      </button>
    </form>
  );
}
