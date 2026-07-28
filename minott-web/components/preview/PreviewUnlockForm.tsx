"use client";

import { useActionState } from "react";
import { unlock, type UnlockState } from "@/lib/actions/preview";

const initial: UnlockState = {};

export function PreviewUnlockForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(unlock, initial);

  return (
    <main
      id="main"
      className="grid min-h-screen place-items-center bg-mec-ink px-6 text-mec-pure"
    >
      <form
        action={formAction}
        className="w-full max-w-sm rounded-md border border-white/10 bg-white/5 p-8"
      >
        <h1 className="font-display text-3xl tracking-wider">
          {/* Explicit {" "} — JSX drops the space at a line wrap, which would
              render "MinottEquipment". */}
          <span className="text-mec-red">Minott</span>{" "}
          Equipment &amp; Chemicals
        </h1>
        <p className="mt-2 text-sm text-mec-pure/60">
          This site is in private preview. Enter the password you were given to
          continue.
        </p>

        <input type="hidden" name="next" value={next} />

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
          autoComplete="current-password"
          aria-invalid={!!state.error}
          aria-describedby={state.error ? "unlock-error" : undefined}
          className="mt-2 w-full rounded-sm border border-white/20 bg-mec-ink px-4 py-3 text-mec-pure outline-none focus:border-mec-red"
        />

        {state.error && (
          <p
            id="unlock-error"
            role="alert"
            className="mt-3 text-sm text-mec-red"
          >
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full bg-mec-red px-6 py-3 font-semibold uppercase tracking-[0.14em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50"
        >
          {pending ? "Unlocking…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}
