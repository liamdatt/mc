"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions/auth";

const initial: LoginState = {};

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <main className="grid min-h-screen place-items-center bg-mec-ink px-6 text-mec-pure">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-md border border-white/10 bg-white/5 p-8"
      >
        <p className="font-display text-3xl tracking-wider">
          <span className="text-mec-red">MEC</span> Admin
        </p>
        <p className="mt-2 text-sm text-mec-pure/60">
          Enter the admin password to continue.
        </p>

        <label
          htmlFor="password"
          className="mt-8 block text-xs font-semibold uppercase tracking-[0.16em] text-mec-pure/70"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          required
          className="mt-2 w-full rounded-sm border border-white/20 bg-mec-ink px-4 py-3 text-mec-pure outline-none focus:border-mec-red"
        />

        {state.error && (
          <p className="mt-3 text-sm text-mec-red">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full bg-mec-red px-6 py-3 font-semibold uppercase tracking-[0.14em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
