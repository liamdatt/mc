const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export type SessionAudience = "admin" | "preview";

export async function signSession(
  secret: string,
  ttlMs: number,
  aud: SessionAudience,
): Promise<string> {
  const payload = bytesToB64url(
    encoder.encode(JSON.stringify({ exp: Date.now() + ttlMs, aud })),
  );
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${bytesToB64url(new Uint8Array(sig))}`;
}

export async function verifySession(
  secret: string,
  token: string | undefined,
  aud: SessionAudience,
): Promise<boolean> {
  if (!secret || !token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  try {
    const key = await getKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlToBytes(sig).buffer as ArrayBuffer,
      encoder.encode(payload),
    );
    if (!valid) return false;
    const parsed = JSON.parse(decoder.decode(b64urlToBytes(payload)));
    return (
      typeof parsed.aud === "string" &&
      parsed.aud === aud &&
      typeof parsed.exp === "number" &&
      parsed.exp > Date.now()
    );
  } catch {
    return false;
  }
}

export const PREVIEW_COOKIE = "mec_preview";
// Backstop expiry inside the preview token. The cookie itself is session-scoped
// (no maxAge); this bounds browsers that restore session cookies on relaunch.
export const PREVIEW_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours
