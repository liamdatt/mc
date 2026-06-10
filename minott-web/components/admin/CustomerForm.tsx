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
};

/**
 * Admin form to provision or edit a portal customer. Posts the
 * `createCustomer` / `updateCustomer` Server Actions (gated by the
 * shared-password admin). On create the password is required (the customer's
 * temporary credential); on edit it's optional — leave it blank to keep the
 * current password, or set a new one to reset it (which also signs the
 * customer out everywhere).
 */
export function CustomerForm({ customer }: { customer?: CustomerFormData }) {
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
        {editing ? "New password (optional, min 8 chars)" : "Temporary password (min 8 chars)"}
        <input
          name="password"
          type="text"
          minLength={8}
          required={!editing}
          placeholder={editing ? "Leave blank to keep current password" : undefined}
          className={field}
        />
        <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-mec-ink/50">
          {editing
            ? "Setting a new password signs the customer out of all devices. Share it with them securely."
            : "Share this with the customer securely; they sign in with it at /portal/sign-in."}
        </span>
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
          href="/admin/customers"
          className="px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70 hover:text-mec-red"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
