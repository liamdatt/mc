import "server-only";
import { db } from "@/lib/db";
import { deleteLogos, listLogoFiles, selectOrphanLogos } from "@/lib/quote-logos";

const SWEEP_INTERVAL_MS = 60 * 60 * 1000; // at most once per hour per process
let lastSweepAt = 0;

/**
 * Opportunistic orphan sweep for data/quote-logos/: removes logos older than
 * 30 days that no InquiryItem references (abandoned carts, replaced files).
 * Throttled per process; never throws. Kept apart from lib/quote-logos.ts so
 * that module stays DB-free (scripts/check-quote-logos.ts imports it).
 */
export async function maybeSweepOrphanLogos(now = Date.now()): Promise<void> {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;
  try {
    const files = await listLogoFiles();
    if (files.length === 0) return;
    const rows = await db.inquiryItem.findMany({
      where: { logoFile: { in: files.map((f) => f.name) } },
      select: { logoFile: true },
    });
    const referenced = new Set(rows.map((r) => r.logoFile!).filter(Boolean));
    const doomed = selectOrphanLogos(files, referenced, now);
    const removed = await deleteLogos(doomed);
    if (removed > 0) console.log(`[quote-logos] swept ${removed} orphaned logo(s)`);
  } catch (e) {
    console.error("[quote-logos] orphan sweep failed", e);
  }
}
