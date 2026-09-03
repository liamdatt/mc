"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createCompany,
  updateCompany,
  type CompanyActionState,
} from "@/lib/actions/companies";
import { INDUSTRIES } from "@/lib/industries";
import { CREDIT_TERMS, GCT_STATUSES } from "@/lib/constants";
import { AddressFields, EMPTY_ADDRESS, type AddressValues } from "@/components/forms/AddressFields";

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label =
  "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";
const legend = "px-1 text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";
const fieldset = "space-y-4 rounded-md border border-black/10 p-4";

export type CompanyFormData = {
  id: number;
  name: string;
  mecAccountNumber: string | null;
  industry: string | null;
  location: string | null;
  salesRepId: number | null;
  businessType: string | null;
  inBusinessSince: string | null;
  trn: string | null;
  taxExemptionNumber: string | null;
  billing: AddressValues;
  /** null = same as billing */
  shipping: AddressValues | null;
  accountingName: string | null;
  accountingPhone: string | null;
  accountingEmail: string | null;
  sector: string | null;
  creditTerms: string | null;
  /** Decimal serialised as a string for the client boundary. */
  creditLimit: string | null;
  gctStatus: string | null;
};

/** Create-mode prefill (from an approved application). */
export type CompanyPrefill = Omit<CompanyFormData, "id" | "salesRepId" | "mecAccountNumber" | "sector" | "creditTerms" | "creditLimit" | "gctStatus"> & {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
};

export type SalesRepOption = { id: number; name: string };

/**
 * Admin form to create or edit a customer company (the account). On create it
 * can optionally provision + invite the company's first portal user — that
 * user sets their own password via the emailed invite. When `applicationId`
 * is set the form is creating the account for an approved New Customer Form:
 * the principal is required and their email is fixed.
 */
export function CompanyForm({
  company,
  prefill,
  applicationId,
  salesReps,
}: {
  company?: CompanyFormData;
  prefill?: CompanyPrefill;
  applicationId?: number;
  salesReps: SalesRepOption[];
}) {
  const editing = Boolean(company);
  const fromApplication = applicationId !== undefined;
  const v = company ?? prefill;
  const [state, formAction, pending] = useActionState<
    CompanyActionState,
    FormData
  >(editing ? updateCompany : createCompany, {});
  const [sameAsBilling, setSameAsBilling] = useState((v?.shipping ?? null) === null);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {company && <input type="hidden" name="id" value={company.id} />}
      {fromApplication && <input type="hidden" name="applicationId" value={applicationId} />}

      <fieldset className={fieldset}>
        <legend className={legend}>Business</legend>
        <label className={label}>
          Company name
          <input name="name" required defaultValue={v?.name} className={field} />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>
            Industry
            <select name="industry" defaultValue={v?.industry ?? ""} className={field}>
              <option value="">— Select —</option>
              {v?.industry && !(INDUSTRIES as readonly string[]).includes(v.industry) && (
                <option value={v.industry}>{v.industry} (legacy)</option>
              )}
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            Type of business
            <input name="businessType" defaultValue={v?.businessType ?? ""} className={field} />
          </label>
          <label className={label}>
            Sector
            <input name="sector" defaultValue={company?.sector ?? ""} className={field} />
          </label>
          <label className={label}>
            In business since
            <input name="inBusinessSince" defaultValue={v?.inBusinessSince ?? ""} className={field} />
          </label>
          <label className={label}>
            TRN
            <input name="trn" defaultValue={v?.trn ?? ""} className={field} />
          </label>
          <label className={label}>
            Tax exemption number
            <input name="taxExemptionNumber" defaultValue={v?.taxExemptionNumber ?? ""} className={field} />
          </label>
        </div>
        <label className={label}>
          Location
          <input name="location" defaultValue={v?.location ?? ""} className={field} />
        </label>
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>Billing address</legend>
        <AddressFields prefix="billing" values={v?.billing ?? EMPTY_ADDRESS} required={false} inputClass={field} labelClass={label} />
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>Shipping address</legend>
        <label className="flex items-center gap-2 text-sm text-mec-ink/80">
          <input type="checkbox" name="shippingSame" checked={sameAsBilling} onChange={(e) => setSameAsBilling(e.target.checked)} className="h-4 w-4 accent-mec-red" />
          Same as billing address
        </label>
        {!sameAsBilling && (
          <AddressFields prefix="shipping" values={v?.shipping ?? EMPTY_ADDRESS} required={false} inputClass={field} labelClass={label} />
        )}
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>Accounting contact</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className={label}>
            Name
            <input name="accountingName" defaultValue={v?.accountingName ?? ""} className={field} />
          </label>
          <label className={label}>
            Tel.
            <input name="accountingPhone" type="tel" defaultValue={v?.accountingPhone ?? ""} className={field} />
          </label>
          <label className={label}>
            Email
            <input name="accountingEmail" type="email" defaultValue={v?.accountingEmail ?? ""} className={field} />
          </label>
        </div>
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>Account terms</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>
            MEC account number
            <input
              name="mecAccountNumber"
              autoFocus={fromApplication}
              defaultValue={company?.mecAccountNumber ?? ""}
              className={field}
            />
          </label>
          <label className={label}>
            Sales rep
            <select name="salesRepId" defaultValue={company?.salesRepId ?? ""} className={field}>
              <option value="">Unassigned</option>
              {salesReps.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            Credit terms
            <select name="creditTerms" defaultValue={company?.creditTerms ?? ""} className={field}>
              <option value="">— Select —</option>
              {company?.creditTerms && !(CREDIT_TERMS as readonly string[]).includes(company.creditTerms) && (
                <option value={company.creditTerms}>{company.creditTerms} (legacy)</option>
              )}
              {CREDIT_TERMS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            Credit limit (JMD)
            <input name="creditLimit" type="number" min={0} step="0.01" defaultValue={company?.creditLimit ?? "0"} className={field} />
          </label>
          <label className={label}>
            GCT status
            <select name="gctStatus" defaultValue={company?.gctStatus ?? ""} className={field}>
              <option value="">— Select —</option>
              {GCT_STATUSES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      {!editing && (
        <fieldset className={`${fieldset} bg-mec-mist/40`}>
          <legend className={legend}>
            {fromApplication ? "Principal contact (first portal user)" : "First portal user (optional)"}
          </legend>
          <label className={label}>
            Contact name
            <input name="contactName" required={fromApplication} defaultValue={prefill?.contactName ?? ""} className={field} />
          </label>
          <label className={label}>
            Email
            <input name="contactEmail" type="email" required={fromApplication} readOnly={fromApplication} defaultValue={prefill?.contactEmail ?? ""} className={`${field} ${fromApplication ? "bg-mec-mist/60" : ""}`} />
          </label>
          <label className={label}>
            Phone
            <input name="contactPhone" type="tel" defaultValue={prefill?.contactPhone ?? ""} className={field} />
          </label>
          <p className="text-xs text-mec-ink/55">
            {fromApplication
              ? "The principal will be invited to set their password when you save. To use a different login email, add a user from the company page afterwards."
              : "If an email is provided, they'll receive an invite to set their own password. More users can be added from the company page."}
          </p>
        </fieldset>
      )}

      {state.error && <p className="text-sm text-mec-red">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover disabled:opacity-50"
        >
          {pending
            ? editing ? "Saving…" : "Creating…"
            : editing ? "Save Changes" : fromApplication ? "Create Account & Send Invite" : "Create Company"}
        </button>
        <Link
          href={fromApplication ? `/portal/applications/${applicationId}` : "/portal/customers"}
          className="px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70 hover:text-mec-red"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
