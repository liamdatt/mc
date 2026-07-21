import { Resend } from "resend";

const globalForResend = globalThis as unknown as {
  resend: Resend | undefined;
};

/**
 * Returns the shared Resend client, or null when RESEND_API_KEY is unset
 * (callers skip sending — email is best-effort and optional in dev).
 */
export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const client = globalForResend.resend ?? new Resend(key);
  if (process.env.NODE_ENV !== "production") globalForResend.resend = client;
  return client;
}
