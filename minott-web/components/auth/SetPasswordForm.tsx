"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { portalAuthClient } from "@/lib/auth/portal-client";

/**
 * Token-gated set-password form. The token comes from the emailed invite link
 * (BetterAuth appends it to our /set-password redirect). Only a valid, unexpired
 * token lets a password be set — that IS the access gate; no session required.
 * On success we route to the correct sign-in based on `portal`.
 */
export function SetPasswordForm({
  token,
  portal,
}: {
  token: string | null;
  portal: "customer" | "sales";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const signInPath = portal === "sales" ? "/sales/sign-in" : "/portal/sign-in";

  if (!token) {
    return (
      <p className="mt-6 rounded-sm border border-mec-red/30 bg-mec-red/5 px-4 py-3 text-sm text-mec-red">
        This link is invalid or has expired. Ask a MEC administrator to resend
        your invitation.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    const { error: authError } = await portalAuthClient.resetPassword({
      newPassword: password,
      token: token!,
    });
    if (authError) {
      setPending(false);
      setError(
        authError.code === "INVALID_TOKEN"
          ? "This link is invalid or has expired. Ask a MEC administrator to resend your invitation."
          : authError.message || "We couldn't set your password. Please try again.",
      );
      return;
    }
    setDone(true);
    setTimeout(() => router.push(signInPath), 1500);
  }

  if (done) {
    return (
      <p className="mt-6 rounded-sm border border-mec-ink/15 bg-mec-mist px-4 py-3 text-sm text-mec-ink">
        Password set. Redirecting you to sign in…
      </p>
    );
  }

  const inputCls =
    "mt-2 w-full rounded-sm border border-mec-ink/20 bg-mec-pure px-4 py-3 text-mec-ink outline-none transition-colors focus:border-mec-red";
  const labelCls =
    "mt-6 block text-xs font-semibold uppercase tracking-[0.16em] text-mec-ink/60 first:mt-0";

  return (
    <form onSubmit={handleSubmit} className="mt-8" noValidate>
      <label htmlFor="password" className={labelCls}>New password</label>
      <input id="password" name="password" type="password" autoComplete="new-password" autoFocus required minLength={8} className={inputCls} />
      <label htmlFor="confirm" className={labelCls}>Confirm password</label>
      <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} className={inputCls} />
      {error && (
        <p role="alert" className="mt-5 rounded-sm border border-mec-red/30 bg-mec-red/5 px-4 py-3 text-sm text-mec-red">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="mt-7 w-full bg-mec-red px-6 py-3.5 font-semibold uppercase tracking-[0.14em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50">
        {pending ? "Setting password…" : "Set password"}
      </button>
    </form>
  );
}
