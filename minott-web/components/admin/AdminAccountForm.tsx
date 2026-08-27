"use client";

import { useActionState } from "react";
import { createAdmin, type CreateAdminState } from "@/lib/actions/admins";

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label =
  "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";

/** Invite a new admin account. They set their own password via the emailed invite. */
export function AdminAccountForm() {
  const [state, formAction, pending] = useActionState<CreateAdminState, FormData>(
    createAdmin,
    {},
  );

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <label className={label}>
        Name
        <input name="name" required className={field} />
      </label>
      <label className={label}>
        Email
        <input name="email" type="email" required className={field} />
      </label>
      <label className={label}>
        Role
        <select name="role" defaultValue="admin" className={field}>
          <option value="admin">Administrator</option>
          <option value="ar">Accounts Receivable</option>
        </select>
      </label>

      {state.error && <p className="text-sm text-mec-red">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send invite"}
      </button>
    </form>
  );
}
