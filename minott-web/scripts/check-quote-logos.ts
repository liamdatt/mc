/**
 * Pure checks for the custom-logo upload helpers (no DB, no Next runtime).
 * Run: npx tsx --conditions=react-server scripts/check-quote-logos.ts
 * (`react-server` satisfies the `server-only` import outside Next.)
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { access, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

async function main() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "quote-logos-"));
  // lib/quote-logos.ts stores under `${cwd}/data/quote-logos`, resolved at
  // import time — chdir into a tmp dir first so the round trip never touches
  // the real data volume.
  const repoCwd = process.cwd();
  process.chdir(tmp);
  const {
    validateLogo,
    saveLogo,
    isLogoToken,
    logoExists,
    readLogo,
    listLogoFiles,
    logoDirBytes,
    logoQuotaExceeded,
    selectOrphanLogos,
    deleteLogos,
    LOGO_DIR_QUOTA_BYTES,
    ORPHAN_MAX_AGE_MS,
  } = await import("../lib/quote-logos");
  const { LOGO_MAX_BYTES, isLogoCategory } = await import("../lib/quote-logos-shared");

  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const JPG = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10];
  const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31];
  const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
  const mk = (bytes: number[], name: string, type: string, pad = 64) => {
    const buf = new Uint8Array(Math.max(bytes.length, pad));
    buf.set(bytes);
    return new File([buf], name, { type });
  };
  const head = async (f: File) => new Uint8Array(await f.slice(0, 8).arrayBuffer());
  const check = async (f: File) => validateLogo(f, await head(f));

  // Accepts by magic bytes; extension comes from the bytes, not file.type.
  const png = await check(mk(PNG, "logo.png", "image/png"));
  assert.deepEqual(png, { ok: true, ext: "png" });
  const jpg = await check(mk(JPG, "logo.jpeg", "image/jpeg"));
  assert.deepEqual(jpg, { ok: true, ext: "jpg" });
  const pdf = await check(mk(PDF, "logo.pdf", "application/pdf"));
  assert.deepEqual(pdf, { ok: true, ext: "pdf" });
  const mislabeled = await check(mk(PNG, "logo.pdf", "application/pdf"));
  assert.deepEqual(mislabeled, { ok: true, ext: "png" });

  // Rejects
  assert.equal((await check(mk(GIF, "logo.gif", "image/gif"))).ok, false, "GIF");
  const html = new File([new TextEncoder().encode("<html><script>alert(1)</script></html>")], "evil.png", {
    type: "image/png",
  });
  assert.equal((await check(html)).ok, false, "HTML named .png");
  assert.equal((await check(new File([], "empty.png", { type: "image/png" }))).ok, false, "0-byte");
  const big = mk(PNG, "big.png", "image/png", 11 * 1024 * 1024);
  assert.ok(big.size > LOGO_MAX_BYTES);
  assert.equal((await check(big)).ok, false, "11 MB");

  // Tokens
  const uuid = randomUUID();
  assert.equal(isLogoToken(uuid + ".png"), true);
  assert.equal(isLogoToken(uuid + ".jpg"), true);
  assert.equal(isLogoToken(uuid + ".pdf"), true);
  for (const bad of ["../x.png", "abc.png", uuid + ".exe", uuid + ".png/../a", "", 42, null, undefined]) {
    assert.equal(isLogoToken(bad), false, `token ${String(bad)}`);
  }

  // Round trip in the overridden dir
  const saved = await saveLogo(mk(PNG, "logo.png", "image/png"));
  assert.ok(saved.ok, "saveLogo ok");
  if (!saved.ok) throw new Error("unreachable");
  assert.equal(isLogoToken(saved.token), true);
  assert.ok(saved.token.endsWith(".png"));
  assert.equal(await logoExists(saved.token), true);
  assert.equal(await logoExists(randomUUID() + ".png"), false);
  assert.equal(await logoExists("../package.json"), false);
  const read = await readLogo(saved.token);
  assert.ok(read);
  assert.equal(read!.mime, "image/png");
  assert.equal(read!.body[0], 0x89);
  assert.equal(await readLogo("../x.png"), null);

  const rejected = await saveLogo(html);
  assert.equal(rejected.ok, false, "saveLogo rejects HTML");

  // Quota: directory total is readdir+stat over token-named files only.
  await writeFile(path.join(tmp, "data/quote-logos", "README.txt"), "x".repeat(5000)); // ignored
  const saved2 = await saveLogo(mk(JPG, "b.jpg", "image/jpeg", 1000));
  assert.ok(saved2.ok);
  const fresh = await logoDirBytes({ fresh: true });
  assert.equal(fresh, 64 + 1000, "dir bytes = sum of stored logos");
  assert.equal(LOGO_DIR_QUOTA_BYTES, 1024 * 1024 * 1024);
  assert.equal(await logoQuotaExceeded({ fresh: true }), false, "well under 1 GB");
  assert.equal(await logoQuotaExceeded({ fresh: true, limitBytes: 1063 }), true, "over a tiny limit");
  assert.equal(await logoQuotaExceeded({ fresh: true, limitBytes: 1064 }), false, "at the limit is allowed");
  // Cached between refreshes, but saveLogo bumps the cached total.
  const saved3 = await saveLogo(mk(PDF, "c.pdf", "application/pdf", 500));
  assert.ok(saved3.ok);
  assert.equal(await logoDirBytes(), 64 + 1000 + 500, "cache tracks new saves");

  // Orphan selection (pure).
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const oldOrphan = randomUUID() + ".png";
  const oldReferenced = randomUUID() + ".jpg";
  const youngOrphan = randomUUID() + ".pdf";
  const picked = selectOrphanLogos(
    [
      { name: oldOrphan, mtimeMs: now - 31 * DAY },
      { name: oldReferenced, mtimeMs: now - 90 * DAY },
      { name: youngOrphan, mtimeMs: now - 29 * DAY },
      { name: "README.txt", mtimeMs: now - 365 * DAY }, // not a token — never touched
      { name: "../../prisma/app.db", mtimeMs: now - 365 * DAY },
    ],
    new Set([oldReferenced]),
    now,
  );
  assert.deepEqual(picked, [oldOrphan]);
  assert.equal(ORPHAN_MAX_AGE_MS, 30 * DAY);

  // Sweep on disk: age one stored file past 30 days, keep one "referenced".
  if (!saved2.ok || !saved3.ok) throw new Error("unreachable");
  const ancient = new Date(now - 40 * DAY);
  await utimes(path.join(tmp, "data/quote-logos", saved2.token), ancient, ancient);
  await utimes(path.join(tmp, "data/quote-logos", saved3.token), ancient, ancient);
  const onDisk = await listLogoFiles();
  assert.equal(onDisk.length, 3, "README.txt not listed");
  const doomed = selectOrphanLogos(onDisk, new Set([saved3.token]), now);
  assert.deepEqual(doomed, [saved2.token]);
  assert.equal(await deleteLogos([...doomed, "../README.txt", "README.txt"]), 1);
  assert.equal(await logoExists(saved2.token), false, "orphan deleted");
  assert.equal(await logoExists(saved3.token), true, "referenced kept");
  assert.equal(await logoExists(saved.token), true, "young kept");
  await access(path.join(tmp, "data/quote-logos", "README.txt")); // non-token untouched

  // Category gate
  assert.equal(isLogoCategory("mats"), true);
  assert.equal(isLogoCategory("chemicals"), false);

  // Landed in the tmp dir, not the repo's data volume.
  await access(path.join(tmp, "data/quote-logos", saved.token));
  await assert.rejects(access(path.join(repoCwd, "data/quote-logos", saved.token)));
  process.chdir(repoCwd);
  await rm(tmp, { recursive: true, force: true });
  console.log("all quote-logo checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
