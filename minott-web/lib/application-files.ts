import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Applicant-uploaded documents (Business Registration Certificate) live on the
// persisted data volume next to the SQLite file — NOT under public/, which is
// only served for assets that existed at build time and is wiped on redeploy.
// They are private: only the staff download route reads them.
const DIR = path.join(process.cwd(), "data/applications");

export const CERT_MAX_BYTES = 6 * 1024 * 1024;

export { CERT_ACCEPT } from "./application-files-shared";

const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MIME: Record<string, string> = Object.fromEntries(
  Object.entries(EXT).map(([mime, ext]) => [ext, mime]),
);

// Stored names are always `${randomUUID()}.${ext}`.
const NAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|png|jpg|webp)$/;

export type CertValidation = { ok: true } | { ok: false; error: string };

export function validateCertificate(file: File): CertValidation {
  if (!EXT[file.type]) return { ok: false, error: "The certificate must be a PDF, PNG, JPG or WEBP file." };
  if (file.size > CERT_MAX_BYTES) return { ok: false, error: "The certificate must be under 6 MB." };
  return { ok: true };
}

/** Persist a validated certificate; returns the stored filename (not a URL). */
export async function saveCertificate(file: File): Promise<string> {
  const name = `${randomUUID()}.${EXT[file.type]}`;
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

/** Read a stored certificate by its stored name; null when missing/invalid. */
export async function readCertificate(
  name: string,
): Promise<{ body: Buffer; mime: string } | null> {
  const match = NAME_RE.exec(name);
  if (!match) return null;
  try {
    return { body: await readFile(path.join(DIR, name)), mime: MIME[match[1]] };
  } catch {
    return null;
  }
}
