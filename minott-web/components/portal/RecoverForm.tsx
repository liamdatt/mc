"use client";

import { useActionState } from "react";
import { recoverAccount, type RecoverState } from "@/lib/actions/recover";

const inputCls =
  "mt-2 w-full rounded-sm border border-mec-ink/20 bg-mec-pure px-4 py-3 text-mec-ink outline-none transition-colors focus:border-mec-red";
const labelCls =
  "mt-6 block text-xs font-semibold uppercase tracking-[0.16em] text-mec-ink/60 first:mt-0";

export function RecoverForm({ refToken }: { refToken: string | null }) {
  const [state, formAction, pending] = useActionState<RecoverState, FormData>(
    recoverAccount,
    {},
  );

  if (state.done) {
    return (
      <p className="mt-6 rounded-sm border border-mec-ink/15 bg-mec-mist px-4 py-3 text-sm text-mec-ink">
        If your details matched an MEC account, password instructions have been
        sent to the email address on file. If you don&apos;t receive anything,
        contact your MEC sales representative.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-8" noValidate>
      {refToken && <input type="hidden" name="ref" value={refToken} />}
      <label htmlFor="companyName" className={labelCls}>Company name</label>
      <input id="companyName" name="companyName" required autoFocus className={inputCls} />
      <label htmlFor="accountNumber" className={labelCls}>MEC account number</label>
      <input id="accountNumber" name="accountNumber" required autoComplete="off" className={inputCls} />
      <p className="mt-2 text-xs text-mec-ink/55">
        Your account number appears on previous MEC invoices.
      </p>
      {state.error && (
        <p role="alert" className="mt-5 rounded-sm border border-mec-red/30 bg-mec-red/5 px-4 py-3 text-sm text-mec-red">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-7 w-full bg-mec-red px-6 py-3.5 font-semibold uppercase tracking-[0.14em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50"
      >
        {pending ? "Checking…" : "Recover account"}
      </button>
    </form>
  );
}
