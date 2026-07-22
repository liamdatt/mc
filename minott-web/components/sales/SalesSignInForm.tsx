"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { portalAuthClient } from "@/lib/auth/portal-client";

/**
 * Sales-rep sign-in. Authenticates via BetterAuth, then confirms the account is
 * a rep (role="rep"). A customer signing in here is immediately signed back out
 * with a clear message — reps and customers share the credential store but not
 * the portal.
 */
export function SalesSignInForm() {
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

    const { data, error: authError } = await portalAuthClient.signIn.email({
      email,
      password,
      rememberMe: true,
    });
    if (authError) {
      setPending(false);
      setError(
        authError.code === "INVALID_EMAIL_OR_PASSWORD" || authError.status === 401
          ? "That email and password don't match. Please try again."
          : authError.message || "We couldn't sign you in. Please try again.",
      );
      return;
    }
    if (data?.user?.role !== "rep") {
      await portalAuthClient.signOut();
      setPending(false);
      setError("This sign-in is for MEC sales representatives. Customers should use the customer portal.");
      return;
    }
    router.push("/sales");
    router.refresh();
  }

  const inputCls =
    "mt-2 w-full rounded-sm border border-mec-ink/20 bg-mec-pure px-4 py-3 text-mec-ink outline-none transition-colors focus:border-mec-red";

  return (
    <form onSubmit={handleSubmit} className="mt-8" noValidate>
      <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-[0.16em] text-mec-ink/60">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" autoFocus required className={inputCls} />
      <label htmlFor="password" className="mt-6 block text-xs font-semibold uppercase tracking-[0.16em] text-mec-ink/60">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required className={inputCls} />
      {error && (
        <p role="alert" className="mt-5 rounded-sm border border-mec-red/30 bg-mec-red/5 px-4 py-3 text-sm text-mec-red">{error}</p>
      )}
      <button type="submit" disabled={pending} className="mt-7 w-full bg-mec-red px-6 py-3.5 font-semibold uppercase tracking-[0.14em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
