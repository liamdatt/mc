"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createSalesRep,
  updateSalesRep,
  type SalesRepFormState,
} from "@/lib/actions/admin-sales-reps";

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label =
  "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";

export type SalesRepFormData = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
};

export function SalesRepForm({ rep }: { rep?: SalesRepFormData }) {
  const editing = Boolean(rep);
  const [state, formAction, pending] = useActionState<
    SalesRepFormState,
    FormData
  >(editing ? updateSalesRep : createSalesRep, {});

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      {rep && <input type="hidden" name="id" value={rep.id} />}
      <label className={label}>
        Name
        <input name="name" required defaultValue={rep?.name} className={field} />
      </label>
      <label className={label}>
        Email
        <input
          name="email"
          type="email"
          required
          defaultValue={rep?.email ?? ""}
          className={field}
        />
      </label>
      <label className={label}>
        Phone
        <input
          name="phone"
          type="tel"
          defaultValue={rep?.phone ?? ""}
          className={field}
        />
      </label>
      <label className="flex items-center gap-2.5 text-sm text-mec-ink/80">
        <input
          name="active"
          type="checkbox"
          defaultChecked={rep?.active ?? true}
          className="h-4 w-4 accent-mec-red"
        />
        Active (can sign in to the sales portal & receive new clients)
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
              : "Create Sales Rep"}
        </button>
        <Link
          href="/portal/sales-reps"
          className="px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70 hover:text-mec-red"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
