"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createCustomer,
  type CreateCustomerState,
} from "@/lib/actions/customers";

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label =
  "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";

/**
 * Admin form to provision a portal customer. Posts the `createCustomer` Server
 * Action (gated by the shared-password admin), which calls BetterAuth's
 * `auth.api.createUser` server-side. Give the customer the temp password
 * out-of-band; they can't change their email here.
 */
export function CustomerForm() {
  const [state, formAction, pending] = useActionState<
    CreateCustomerState,
    FormData
  >(createCustomer, {});

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <label className={label}>
        Contact name
        <input name="name" required className={field} />
      </label>
      <label className={label}>
        Email
        <input name="email" type="email" required className={field} />
      </label>
      <label className={label}>
        Temporary password (min 8 chars)
        <input
          name="password"
          type="text"
          minLength={8}
          required
          className={field}
        />
        <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-mec-ink/50">
          Share this with the customer securely; they sign in with it at
          /portal/sign-in.
        </span>
      </label>
      <label className={label}>
        Company name
        <input name="companyName" className={field} />
      </label>
      <label className={label}>
        Phone
        <input name="phone" type="tel" className={field} />
      </label>
      <label className={label}>
        WhatsApp
        <input name="whatsapp" type="tel" className={field} />
      </label>

      {state.error && <p className="text-sm text-mec-red">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create Customer"}
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
