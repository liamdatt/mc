"use client";

import { useActionState } from "react";
import {
  approveApplication,
  requestApplicationInfo,
  rejectApplication,
  type DecisionState,
} from "@/lib/actions/applications";

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label = "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";
const primary =
  "bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover disabled:opacity-50";
const secondary =
  "rounded-sm border border-mec-ink/20 px-4 py-2 text-sm font-semibold text-mec-ink/80 transition-colors hover:border-mec-red hover:text-mec-red disabled:opacity-50";

export function ApplicationDecisionForms({
  id,
  salesReps,
}: {
  id: number;
  salesReps: { id: number; name: string }[];
}) {
  const [approve, approveAction, approving] = useActionState<DecisionState, FormData>(approveApplication, {});
  const [info, infoAction, requesting] = useActionState<DecisionState, FormData>(requestApplicationInfo, {});
  const [reject, rejectAction, rejecting] = useActionState<DecisionState, FormData>(rejectApplication, {});

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <form action={approveAction} className="rounded-md border border-black/10 bg-mec-pure p-5">
        <input type="hidden" name="id" value={id} />
        <h3 className="font-display-tight text-xl">Approve</h3>
        <p className="mt-1 text-xs text-mec-ink/60">Creates the company, invites the contact and attaches their quote.</p>
        <label className={`${label} mt-4`}>Sales rep
          <select name="salesRepId" defaultValue="" className={field}>
            <option value="">Unassigned</option>
            {salesReps.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
          </select>
        </label>
        {approve.error && <p className="mt-3 text-sm text-mec-red">{approve.error}</p>}
        <button type="submit" disabled={approving} className={`${primary} mt-4 w-full`}>{approving ? "Approving…" : "Approve application"}</button>
      </form>

      <form action={infoAction} className="rounded-md border border-black/10 bg-mec-pure p-5">
        <input type="hidden" name="id" value={id} />
        <h3 className="font-display-tight text-xl">Request more info</h3>
        <label className={`${label} mt-4`}>What do you need?
          <textarea name="note" rows={4} required className={`${field} resize-none`} />
        </label>
        {info.error && <p className="mt-3 text-sm text-mec-red">{info.error}</p>}
        <button type="submit" disabled={requesting} className={`${secondary} mt-4 w-full`}>{requesting ? "Sending…" : "Send request"}</button>
      </form>

      <form action={rejectAction} className="rounded-md border border-black/10 bg-mec-pure p-5">
        <input type="hidden" name="id" value={id} />
        <h3 className="font-display-tight text-xl">Reject</h3>
        <label className={`${label} mt-4`}>Reason (sent to the applicant)
          <textarea name="reason" rows={4} required className={`${field} resize-none`} />
        </label>
        {reject.error && <p className="mt-3 text-sm text-mec-red">{reject.error}</p>}
        <button type="submit" disabled={rejecting} className={`${secondary} mt-4 w-full`}>{rejecting ? "Rejecting…" : "Reject application"}</button>
      </form>
    </div>
  );
}
