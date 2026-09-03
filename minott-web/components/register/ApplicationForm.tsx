"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { INDUSTRIES } from "@/lib/industries";
import { AddressFields, type AddressValues } from "@/components/forms/AddressFields";
import { submitApplication, type ApplicationFormState } from "@/lib/actions/applications";

const inputCls =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-4 py-3 text-mec-ink outline-none focus:border-mec-red";
const labelCls = "mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70";
const h2 = "mt-8 font-display-tight text-h3 text-mec-ink first:mt-0";

export type ApplicationPrefill = {
  companyName: string;
  industry: string;
  businessType: string;
  inBusinessSince: string;
  trn: string;
  taxExemptionNumber: string;
  billing: AddressValues;
  /** null = same as billing */
  shipping: AddressValues | null;
  contactName: string;
  principalTitle: string;
  email: string;
  phone: string;
  accountingName: string;
  accountingPhone: string;
  accountingEmail: string;
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
  const [sameAsBilling, setSameAsBilling] = useState(prefill.shipping === null);

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

      <h2 className={h2}>Business</h2>
      <label className={labelCls}>Business name *<input name="companyName" required defaultValue={prefill.companyName} className={inputCls} /></label>
      <label className={labelCls}>Industry *
        <select name="industry" required defaultValue={prefill.industry} className={inputCls}>
          <option value="" disabled>Select your industry</option>
          {INDUSTRIES.map((i) => (<option key={i} value={i}>{i}</option>))}
        </select>
      </label>
      <label className={labelCls}>Type of business *<input name="businessType" required defaultValue={prefill.businessType} placeholder="e.g. Hotel, School, Manufacturer" className={inputCls} /></label>
      <label className={labelCls}>In business since<input name="inBusinessSince" defaultValue={prefill.inBusinessSince} placeholder="e.g. 2008" className={inputCls} /></label>
      <label className={labelCls}>Tax Registration Number (TRN) *<input name="trn" required defaultValue={prefill.trn} className={inputCls} /></label>
      <label className={labelCls}>Tax exemption number (if applicable)<input name="taxExemptionNumber" defaultValue={prefill.taxExemptionNumber} className={inputCls} /></label>

      <h2 className={h2}>Billing address</h2>
      <AddressFields prefix="billing" values={prefill.billing} required inputClass={inputCls} labelClass={labelCls} />

      <h2 className={h2}>Shipping address</h2>
      <label className="mt-3 flex items-center gap-2 text-sm text-mec-ink/80">
        <input type="checkbox" name="shippingSame" checked={sameAsBilling} onChange={(e) => setSameAsBilling(e.target.checked)} className="h-4 w-4 accent-mec-red" />
        Same as billing address
      </label>
      {!sameAsBilling && (
        <AddressFields prefix="shipping" values={prefill.shipping ?? { street: "", city: "", parish: "", zip: "" }} required={false} inputClass={inputCls} labelClass={labelCls} />
      )}

      <h2 className={h2}>Principal contact</h2>
      <label className={labelCls}>Name *<input name="contactName" required defaultValue={prefill.contactName} className={inputCls} /></label>
      <label className={labelCls}>Title<input name="principalTitle" defaultValue={prefill.principalTitle} placeholder="e.g. Owner, Operations Manager" className={inputCls} /></label>
      <label className={labelCls}>Email *<input name="email" type="email" required defaultValue={prefill.email} className={inputCls} /></label>
      <label className={labelCls}>Tel. *<input name="phone" type="tel" required defaultValue={prefill.phone} className={inputCls} /></label>

      <h2 className={h2}>Accounting contact</h2>
      <p className="mt-1 text-xs text-mec-ink/60">Who should receive invoices and statements? Optional.</p>
      <label className={labelCls}>Name<input name="accountingName" defaultValue={prefill.accountingName} className={inputCls} /></label>
      <label className={labelCls}>Tel.<input name="accountingPhone" type="tel" defaultValue={prefill.accountingPhone} className={inputCls} /></label>
      <label className={labelCls}>Email<input name="accountingEmail" type="email" defaultValue={prefill.accountingEmail} className={inputCls} /></label>

      <label className={labelCls}>Notes<textarea name="notes" rows={3} defaultValue={prefill.notes} className={`${inputCls} resize-none`} /></label>

      {state.error && <p className="mt-3 text-sm text-mec-red">{state.error}</p>}
      <button type="submit" disabled={pending} className="mt-5 w-full bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50">
        {pending ? "Submitting…" : resubmit ? "Resubmit Application" : "Submit Application"}
      </button>
    </form>
  );
}
