"use client";

import { useActionState } from "react";
import {
  addCompanyUser,
  updateCompanyUser,
  type CompanyActionState,
} from "@/lib/actions/companies";

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label =
  "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";

export type CompanyUserFormData = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
};

/**
 * Admin form to add a portal user to a company (invite flow) or edit an
 * existing user's contact details. Passwords are never set here.
 */
export function CompanyUserForm({
  companyId,
  user,
}: {
  companyId: number;
  user?: CompanyUserFormData;
}) {
  const editing = Boolean(user);
  const [state, formAction, pending] = useActionState<
    CompanyActionState,
    FormData
  >(editing ? updateCompanyUser : addCompanyUser, {});

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <input type="hidden" name="companyId" value={companyId} />
      {user && <input type="hidden" name="id" value={user.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Contact name
          <input name="name" required defaultValue={user?.name} className={field} />
        </label>
        <label className={label}>
          Email
          <input
            name="email"
            type="email"
            required
            defaultValue={user?.email}
            className={field}
          />
        </label>
        <label className={label}>
          Phone
          <input name="phone" type="tel" defaultValue={user?.phone ?? ""} className={field} />
        </label>
        <label className={label}>
          WhatsApp
          <input
            name="whatsapp"
            type="tel"
            defaultValue={user?.whatsapp ?? ""}
            className={field}
          />
        </label>
      </div>
      {state.error && <p className="text-sm text-mec-red">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-mec-red px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover disabled:opacity-50"
      >
        {pending
          ? editing
            ? "Saving…"
            : "Inviting…"
          : editing
            ? "Save Changes"
            : "Add & Invite User"}
      </button>
    </form>
  );
}
