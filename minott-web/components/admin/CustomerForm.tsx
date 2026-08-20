"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createCustomer,
  updateCustomer,
  type CreateCustomerState,
} from "@/lib/actions/customers";

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label =
  "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";

export type CustomerFormData = {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  phone: string | null;
  whatsapp: string | null;
  salesRepId: number | null;
};

export type SalesRepOption = { id: number; name: string };

/**
 * Admin form to provision or edit a portal customer. Posts the
 * `createCustomer` / `updateCustomer` Server Actions (gated by the
 * shared-password admin). The customer sets their own password via an emailed
 * invite — this form never collects or sets a credential.
 */
export function CustomerForm({
  customer,
  salesReps,
}: {
  customer?: CustomerFormData;
  salesReps: SalesRepOption[];
}) {
  const editing = Boolean(customer);
  const [state, formAction, pending] = useActionState<
    CreateCustomerState,
    FormData
  >(editing ? updateCustomer : createCustomer, {});

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      {customer && <input type="hidden" name="id" value={customer.id} />}
      <label className={label}>
        Contact name
        <input
          name="name"
          required
          defaultValue={customer?.name}
          className={field}
        />
      </label>
      <label className={label}>
        Email
        <input
          name="email"
          type="email"
          required
          defaultValue={customer?.email}
          className={field}
        />
      </label>
      <label className={label}>
        Company name
        <input
          name="companyName"
          defaultValue={customer?.companyName ?? ""}
          className={field}
        />
      </label>
      <label className={label}>
        Phone
        <input
          name="phone"
          type="tel"
          defaultValue={customer?.phone ?? ""}
          className={field}
        />
      </label>
      <label className={label}>
        WhatsApp
        <input
          name="whatsapp"
          type="tel"
          defaultValue={customer?.whatsapp ?? ""}
          className={field}
        />
      </label>
      <label className={label}>
        Sales rep
        <select
          name="salesRepId"
          defaultValue={customer?.salesRepId ?? ""}
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
              : "Create Customer"}
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
