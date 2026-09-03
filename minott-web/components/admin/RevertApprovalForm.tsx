"use client";

import { useActionState, useState } from "react";
import { revertApplicationApproval, type DecisionState } from "@/lib/actions/applications";

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const secondary =
  "rounded-sm border border-mec-ink/20 px-4 py-2 text-sm font-semibold text-mec-ink/80 transition-colors hover:border-mec-red hover:text-mec-red disabled:opacity-50";

/** "Return to review" for an APPROVED application that has no account yet. */
export function RevertApprovalForm({ id }: { id: number }) {
  const [state, action, pending] = useActionState<DecisionState, FormData>(revertApplicationApproval, {});
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={secondary}>
        Return to review
      </button>
    );
  }
  return (
    <form action={action} className="max-w-md rounded-md border border-black/10 bg-mec-pure p-5">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm font-semibold">Return to review?</p>
      <p className="mt-1 text-xs text-mec-ink/60">The application goes back to the Awaiting review queue. The applicant is not emailed.</p>
      <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70">
        Internal note (optional)
        <textarea name="note" rows={2} className={`${field} resize-none`} />
      </label>
      {state.error && <p className="mt-3 text-sm text-mec-red">{state.error}</p>}
      <div className="mt-4 flex gap-3">
        <button type="submit" disabled={pending} className={secondary}>{pending ? "Returning…" : "Yes, return to review"}</button>
        <button type="button" onClick={() => setConfirming(false)} className="text-sm text-mec-ink/60 hover:text-mec-red">Cancel</button>
      </div>
    </form>
  );
}
