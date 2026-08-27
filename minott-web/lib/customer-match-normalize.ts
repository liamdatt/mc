/**
 * Pure normalisers for the guest-submission matching engine (spec §4). Kept
 * free of the `server-only` import so they can be unit-checked directly
 * (`lib/customer-match.ts` re-exports these for its callers).
 */

export function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

export function normalizePhone(s: string): string {
  return s.replace(/\D/g, "");
}

/** Last 7 digits — tolerant of +1 / 876 / spacing variants. Null when too short. */
export function phoneKey(s: string | null | undefined): string | null {
  if (!s) return null;
  const digits = normalizePhone(s);
  return digits.length >= 7 ? digits.slice(-7) : null;
}

const COMPANY_SUFFIXES = new Set(["ltd", "limited", "co", "company", "inc", "jamaica"]);

export function normalizeCompanyName(s: string): string {
  const tokens = s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  while (tokens.length > 1 && COMPANY_SUFFIXES.has(tokens[tokens.length - 1]!)) tokens.pop();
  return tokens.join(" ");
}

export function normalizeAccountNumber(s: string): string {
  return s.trim().toUpperCase().replace(/[\s-]/g, "");
}
