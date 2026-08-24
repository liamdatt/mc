"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createCompany,
  updateCompany,
  type CompanyActionState,
} from "@/lib/actions/companies";

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label =
  "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";

export type CompanyFormData = {
  id: number;
  name: string;
  mecAccountNumber: string | null;
  industry: string | null;
  location: string | null;
  salesRepId: number | null;
};

export type SalesRepOption = { id: number; name: string };

/**
 * Admin form to create or edit a customer company (the account). On create it
 * can optionally provision + invite the company's first portal user — that
 * user sets their own password via the emailed invite.
 */
export function CompanyForm({
  company,
  salesReps,
}: {
  company?: CompanyFormData;
  salesReps: SalesRepOption[];
}) {
  const editing = Boolean(company);
  const [state, formAction, pending] = useActionState<
    CompanyActionState,
    FormData
  >(editing ? updateCompany : createCompany, {});

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      {company && <input type="hidden" name="id" value={company.id} />}
      <label className={label}>
        Company name
        <input name="name" required defaultValue={company?.name} className={field} />
      </label>
      <label className={label}>
        MEC account number
        <input
          name="mecAccountNumber"
          defaultValue={company?.mecAccountNumber ?? ""}
          className={field}
        />
      </label>
      <label className={label}>
        Industry
        <input name="industry" defaultValue={company?.industry ?? ""} className={field} />
      </label>
      <label className={label}>
        Location
        <input name="location" defaultValue={company?.location ?? ""} className={field} />
      </label>
      <label className={label}>
        Sales rep
        <select
          name="salesRepId"
          defaultValue={company?.salesRepId ?? ""}
          className={field}
        >
          <option value="">Unassigned</option>
          {salesReps.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>

      {!editing && (
        <fieldset className="space-y-5 rounded-md border border-black/10 bg-mec-mist/40 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70">
            First portal user (optional)
          </legend>
          <label className={label}>
            Contact name
            <input name="contactName" className={field} />
          </label>
          <label className={label}>
            Email
            <input name="contactEmail" type="email" className={field} />
          </label>
          <label className={label}>
            Phone
            <input name="contactPhone" type="tel" className={field} />
          </label>
          <p className="text-xs text-mec-ink/55">
            If an email is provided, they&apos;ll receive an invite to set their
            own password. More users can be added from the company page.
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
            ? editing
              ? "Saving…"
              : "Creating…"
            : editing
              ? "Save Changes"
              : "Create Company"}
        </button>
        <Link
          href="/portal/customers"
          className="px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70 hover:text-mec-red"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
