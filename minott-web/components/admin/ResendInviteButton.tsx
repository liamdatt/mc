"use client";

import { useActionState } from "react";
import { resendInvite, type ResendInviteState } from "@/lib/actions/customers";

/**
 * Re-sends the set-password invite for a provisioned user. Shown on the customer
 * and sales-rep edit pages. `userId` is the BetterAuth User id.
 */
export function ResendInviteButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState<ResendInviteState, FormData>(
    resendInvite,
    {},
  );
  return (
    <form action={formAction} className="inline-flex items-center gap-3">
      <input type="hidden" name="id" value={userId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-sm border border-mec-ink/20 px-4 py-2 text-sm font-semibold text-mec-ink/80 transition-colors hover:border-mec-red hover:text-mec-red disabled:opacity-50"
      >
        {pending ? "Sending…" : "Resend invite"}
      </button>
      {state.success && <span className="text-sm text-mec-ink/60">Invite sent.</span>}
      {state.error && <span className="text-sm text-mec-red">{state.error}</span>}
    </form>
  );
}
