"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateRepCustomer, type RepCustomerState } from "@/lib/actions/sales";

const field = "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label = "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";

export type RepCustomerFormData = {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  phone: string | null;
  whatsapp: string | null;
};

/** Rep-editable customer profile. Email is read-only (admin-managed). */
export function RepCustomerForm({ customer }: { customer: RepCustomerFormData }) {
  const [state, formAction, pending] = useActionState<RepCustomerState, FormData>(updateRepCustomer, {});
  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <input type="hidden" name="id" value={customer.id} />
      <label className={label}>
        Contact name
        <input name="name" required defaultValue={customer.name} className={field} />
      </label>
      <div>
        <span className={label}>Email (managed by MEC admin)</span>
        <p className="mt-1 rounded-sm border border-black/10 bg-mec-mist px-3 py-2 text-sm text-mec-ink/60">{customer.email}</p>
      </div>
      <label className={label}>
        Company name
        <input name="companyName" defaultValue={customer.companyName ?? ""} className={field} />
      </label>
      <label className={label}>
        Phone
        <input name="phone" type="tel" defaultValue={customer.phone ?? ""} className={field} />
      </label>
      <label className={label}>
        WhatsApp
        <input name="whatsapp" type="tel" defaultValue={customer.whatsapp ?? ""} className={field} />
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
