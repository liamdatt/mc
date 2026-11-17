import "server-only";
import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { LOGO_MAX_BYTES } from "./quote-logos-shared";

// Customer-uploaded mat logos live on the persisted data volume next to the
// SQLite file — NOT under public/, which is only served for assets that
// existed at build time and is wiped on redeploy. They are private: only the
// staff route /portal/requests/[id]/logo/[itemId] reads them.
// Statically scoped under cwd so Turbopack's file tracer stays narrow (an
// env-var override here made it trace the whole project); the check script
// points it at a tmp dir by chdir-ing before import instead.
const ROOT = path.join(process.cwd(), "data/quote-logos");

export type LogoExt = "png" | "jpg" | "pdf";

const MIME: Record<LogoExt, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  pdf: "application/pdf",
};

const MAGIC: { ext: LogoExt; bytes: number[] }[] = [
  { ext: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: "jpg", bytes: [0xff, 0xd8, 0xff] },
  { ext: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
];

// Stored names (tokens) are always `${randomUUID()}.${ext}`.
const NAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|pdf)$/;

export type LogoValidation = { ok: true; ext: LogoExt } | { ok: false; error: string };

/** Size + magic-byte check. The extension is derived from the bytes, never `file.type`. */
export function validateLogo(file: File, head: Uint8Array): LogoValidation {
  if (file.size <= 0) return { ok: false, error: "The logo file is empty." };
  if (file.size > LOGO_MAX_BYTES) return { ok: false, error: "The logo must be 10 MB or smaller." };
  const match = MAGIC.find((m) => m.bytes.every((b, i) => head[i] === b));
  if (!match) return { ok: false, error: "The logo must be a PNG, JPG, or PDF file." };
  return { ok: true, ext: match.ext };
}

/** Validate and persist a logo; returns the opaque stored token (not a URL). */
export async function saveLogo(
  file: File,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const v = validateLogo(file, head);
  if (!v.ok) return v;
  const token = `${randomUUID()}.${v.ext}`;
  await mkdir(ROOT, { recursive: true });
  await writeFile(path.join(ROOT, token), Buffer.from(await file.arrayBuffer()));
  return { ok: true, token };
}

export function isLogoToken(token: unknown): token is string {
  return typeof token === "string" && NAME_RE.test(token);
}

export async function logoExists(token: string): Promise<boolean> {
  if (!isLogoToken(token)) return false;
  try {
    await access(path.join(ROOT, token));
    return true;
  } catch {
    return false;
  }
}

/** Read a stored logo by token; null when the token is invalid or the file is missing. */
export async function readLogo(token: string): Promise<{ body: Buffer; mime: string } | null> {
  const match = NAME_RE.exec(token);
  if (!match) return null;
  try {
    return { body: await readFile(path.join(ROOT, token)), mime: MIME[match[1] as LogoExt] };
  } catch {
    return null;
  }
}
