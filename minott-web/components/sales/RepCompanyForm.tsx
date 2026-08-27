"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateRepCompany, type RepCompanyState } from "@/lib/actions/sales";
import { INDUSTRIES } from "@/lib/industries";

const field = "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label = "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";

export type RepCompanyFormData = {
  id: number;
  name: string;
  industry: string | null;
  location: string | null;
};

/** Rep-editable company profile. Users and rep assignment are admin-managed. */
export function RepCompanyForm({ company }: { company: RepCompanyFormData }) {
  const [state, formAction, pending] = useActionState<RepCompanyState, FormData>(updateRepCompany, {});
  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <input type="hidden" name="id" value={company.id} />
      <label className={label}>
        Company name
        <input name="name" required defaultValue={company.name} className={field} />
      </label>
      <label className={label}>
        Industry
        <select name="industry" defaultValue={company.industry ?? ""} className={field}>
          <option value="">— Select —</option>
          {company.industry && !(INDUSTRIES as readonly string[]).includes(company.industry) && (
            <option value={company.industry}>{company.industry} (legacy)</option>
          )}
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </label>
      <label className={label}>
        Location
        <input name="location" defaultValue={company.location ?? ""} className={field} />
      </label>
      {state.error && <p role="alert" className="text-sm text-mec-red">{state.error}</p>}
      {state.success && <p className="text-sm text-mec-ink/60">Saved.</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover disabled:opacity-50">
          {pending ? "Saving…" : "Save Changes"}
        </button>
        <Link href="/portal/customers" className="px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70 hover:text-mec-red">Cancel</Link>
      </div>
    </form>
  );
}
