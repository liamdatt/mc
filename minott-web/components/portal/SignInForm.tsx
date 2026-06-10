"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { portalAuthClient } from "@/lib/auth/portal-client";

/**
 * Customer-portal sign-in form. Authenticates via the BetterAuth client
 * (`signIn.email`) with "remember me" on by default (30-day session per the
 * portal auth config). On success it navigates to the dashboard and refreshes
 * so the protected server layout re-reads the freshly-set session cookie. An
 * optional `next` path (validated by the sign-in page) overrides the dashboard
 * destination.
 */
export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const rememberMe = form.get("rememberMe") !== null;

    const { error: authError } = await portalAuthClient.signIn.email({
      email,
      password,
      rememberMe,
    });

    if (authError) {
      setPending(false);
      setError(
        authError.code === "INVALID_EMAIL_OR_PASSWORD" ||
          authError.status === 401
          ? "That email and password don't match. Please try again."
          : authError.message ||
              "We couldn't sign you in. Please try again in a moment.",
      );
      return;
    }

    router.push(next ?? "/portal");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8" noValidate>
      <label
        htmlFor="email"
        className="block text-xs font-semibold uppercase tracking-[0.16em] text-mec-ink/60"
      >
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

      <label
        htmlFor="password"
        className="mt-6 block text-xs font-semibold uppercase tracking-[0.16em] text-mec-ink/60"
      >
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className="mt-2 w-full rounded-sm border border-mec-ink/20 bg-mec-pure px-4 py-3 text-mec-ink outline-none transition-colors focus:border-mec-red"
      />

      <label className="mt-5 flex items-center gap-2.5 text-sm text-mec-ink/70">
        <input
          name="rememberMe"
          type="checkbox"
          defaultChecked
          className="h-4 w-4 accent-mec-red"
        />
        Keep me signed in for 30 days
      </label>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-sm border border-mec-red/30 bg-mec-red/5 px-4 py-3 text-sm text-mec-red"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-7 w-full bg-mec-red px-6 py-3.5 font-semibold uppercase tracking-[0.14em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
