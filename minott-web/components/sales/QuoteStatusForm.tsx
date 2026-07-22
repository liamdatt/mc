"use client";

import { useActionState } from "react";
import { updateRepQuoteStatus, type QuoteActionState } from "@/lib/actions/sales";
import { INQUIRY_STATUS, INQUIRY_STATUS_LABELS } from "@/lib/constants";

export function QuoteStatusForm({ inquiryId, status }: { inquiryId: number; status: string }) {
  const [state, formAction, pending] = useActionState<QuoteActionState, FormData>(updateRepQuoteStatus, {});
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <select name="status" defaultValue={status} className="rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-sm text-mec-ink outline-none focus:border-mec-red">
        {Object.keys(INQUIRY_STATUS).map((s) => (
          <option key={s} value={s}>{INQUIRY_STATUS_LABELS[s] ?? s}</option>
        ))}
      </select>
      <button type="submit" disabled={pending} className="rounded-sm bg-mec-red px-4 py-2 text-sm font-semibold uppercase tracking-[0.1em] text-mec-pure hover:bg-mec-red-hover disabled:opacity-50">
        {pending ? "Saving…" : "Update"}
      </button>
      {state.success && <span className="text-sm text-mec-ink/60">Updated.</span>}
      {state.error && <span role="alert" className="text-sm text-mec-red">{state.error}</span>}
    </form>
  );
}
