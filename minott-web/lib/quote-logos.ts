import "server-only";
import { randomUUID } from "node:crypto";
import { access, mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
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
  // Keep the cached quota total roughly honest between refreshes.
  if (sizeCache) sizeCache.bytes += file.size;
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

// ---------------------------------------------------------------------------
// Volume protection. The uploads share the persisted volume with SQLite, and
// the upload action is unauthenticated, so the directory is capped and swept.

/** Refuse new uploads once data/quote-logos/ holds more than this. */
export const LOGO_DIR_QUOTA_BYTES = 1024 * 1024 * 1024; // 1 GB
const SIZE_CACHE_MS = 60_000;
let sizeCache: { bytes: number; at: number } | null = null;

export type LogoFileInfo = { name: string; size: number; mtimeMs: number };

/** Stored logo files (token-named only — anything else in the dir is ignored). */
export async function listLogoFiles(): Promise<LogoFileInfo[]> {
  let names: string[];
  try {
    names = await readdir(ROOT);
  } catch {
    return []; // dir not created yet
  }
  const out: LogoFileInfo[] = [];
  for (const name of names) {
    if (!NAME_RE.test(name)) continue;
    try {
      const st = await stat(path.join(ROOT, name));
      if (st.isFile()) out.push({ name, size: st.size, mtimeMs: st.mtimeMs });
    } catch {
      /* removed concurrently */
    }
  }
  return out;
}

/** Total bytes in the logo dir; readdir + stat, cached in-module for 60 s. */
export async function logoDirBytes(opts: { fresh?: boolean } = {}): Promise<number> {
  const now = Date.now();
  if (!opts.fresh && sizeCache && now - sizeCache.at < SIZE_CACHE_MS) return sizeCache.bytes;
  const bytes = (await listLogoFiles()).reduce((n, f) => n + f.size, 0);
  sizeCache = { bytes, at: now };
  return bytes;
}

/** True when the logo dir is over quota and uploads must be refused. */
export async function logoQuotaExceeded(
  opts: { limitBytes?: number; fresh?: boolean } = {},
): Promise<boolean> {
  return (await logoDirBytes({ fresh: opts.fresh })) > (opts.limitBytes ?? LOGO_DIR_QUOTA_BYTES);
}

export const ORPHAN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Pure selection for the orphan sweep: token-named files older than `maxAgeMs`
 * that no InquiryItem references.
 */
export function selectOrphanLogos(
  files: { name: string; mtimeMs: number }[],
  referenced: ReadonlySet<string>,
  now: number,
  maxAgeMs: number = ORPHAN_MAX_AGE_MS,
): string[] {
  return files
    .filter((f) => NAME_RE.test(f.name) && now - f.mtimeMs > maxAgeMs && !referenced.has(f.name))
    .map((f) => f.name);
}

/** Delete the given stored logos (token names only); returns how many went. */
export async function deleteLogos(names: string[]): Promise<number> {
  let n = 0;
  for (const name of names) {
    if (!NAME_RE.test(name)) continue;
    try {
      await unlink(path.join(ROOT, name));
      n++;
    } catch {
      /* already gone */
    }
  }
  if (n > 0) sizeCache = null;
  return n;
}
