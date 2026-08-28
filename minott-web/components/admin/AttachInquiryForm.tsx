"use client";

import { useActionState } from "react";
import {
  attachInquiryToCompany,
  detachInquiryFromCompany,
  type AttachState,
} from "@/lib/actions/admin-inquiries";

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label =
  "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";

export type AttachCompanyOption = {
  id: number;
  name: string;
  mecAccountNumber: string | null;
};

/**
 * Admin manual override for a quote request's company link — attach,
 * re-assign, or detach. Shown on `/portal/requests/[id]` for QUOTE rows only.
 */
export function AttachInquiryForm({
  inquiryId,
  currentCompanyId,
  suggestedCompanyId,
  companies,
}: {
  inquiryId: number;
  currentCompanyId: number | null;
  suggestedCompanyId: number | null;
  companies: AttachCompanyOption[];
}) {
  const [attachState, attachAction, attachPending] = useActionState<AttachState, FormData>(
    attachInquiryToCompany,
    {},
  );
  const [detachState, detachAction, detachPending] = useActionState<AttachState, FormData>(
    detachInquiryFromCompany,
    {},
  );

  const attached = currentCompanyId !== null;
  const defaultValue = currentCompanyId ?? suggestedCompanyId ?? "";

  return (
    <div className="rounded-md border border-black/10 bg-mec-pure p-5 text-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/50">
        Attach to customer account
      </p>

      <form action={attachAction} className="mt-3 space-y-3">
        <input type="hidden" name="id" value={inquiryId} />
        <label className={label}>
          Company
          <select name="companyId" defaultValue={defaultValue} className={field}>
            <option value="">— Select —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.mecAccountNumber ? ` · #${c.mecAccountNumber}` : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={attachPending}
            className="bg-mec-red px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover disabled:opacity-50"
          >
            {attachPending ? "Saving…" : attached ? "Re-assign" : "Attach"}
          </button>
          {attachState.success && (
            <span className="text-sm text-mec-ink/60">Attached.</span>
          )}
          {attachState.error && (
            <span className="text-sm text-mec-red">{attachState.error}</span>
          )}
        </div>
      </form>

      {attached && (
        <form action={detachAction} className="mt-3 flex flex-wrap items-center gap-3">
          <input type="hidden" name="id" value={inquiryId} />
          <button
            type="submit"
            disabled={detachPending}
            className="rounded-sm border border-mec-ink/20 px-4 py-2 text-xs font-semibold text-mec-ink/80 transition-colors hover:border-mec-red hover:text-mec-red disabled:opacity-50"
          >
            {detachPending ? "Detaching…" : "Detach"}
          </button>
        </form>
      )}
      {/* Rendered outside the `attached` form so the confirmation survives
          the revalidated re-render that flips `attached` to false (and
          would otherwise unmount this alongside the form that produced it). */}
      {detachState.success && (
        <p className="mt-3 text-sm text-mec-ink/60">Detached.</p>
      )}
      {detachState.error && (
        <p className="mt-3 text-sm text-mec-red">{detachState.error}</p>
      )}
    </div>
  );
}
