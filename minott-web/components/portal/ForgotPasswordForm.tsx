"use client";

import { useActionState } from "react";
import { requestPasswordResetEmail, type ForgotState } from "@/lib/actions/portal";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<ForgotState, FormData>(
    requestPasswordResetEmail,
    {},
  );

  if (state.done) {
    return (
      <p className="mt-6 rounded-sm border border-mec-ink/15 bg-mec-mist px-4 py-3 text-sm text-mec-ink">
        If that address has a Minott account, we&apos;ve emailed a link to reset
        your password. The link is valid for 72 hours.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-8" noValidate>
      <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-[0.16em] text-mec-ink/60">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        autoFocus
        required
        className="mt-2 w-full rounded-sm border border-mec-ink/20 bg-mec-pure px-4 py-3 text-mec-ink outline-none transition-colors focus:border-mec-red"
      />
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
        {pending ? "Sending…" : "Email me a reset link"}
      </button>
    </form>
  );
}
