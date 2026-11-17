/**
 * Pure checks for promotion form rules (no DB, no Next runtime).
 * Run: npx tsx scripts/check-promotions.ts
 */
import assert from "node:assert/strict";
import {
  parsePromotionForm,
  promotionStatus,
  toDateInput,
} from "../lib/promotion-rules";

const parse = (o: Record<string, string>) =>
  parsePromotionForm((k) => (k in o ? o[k] : null));
const base = { categoryId: "3", eyebrow: "October Feature", title: "Paper Products", body: "Save 15%." };

const ok = parse(base);
assert.ok("data" in ok);
if ("data" in ok) {
  assert.equal(ok.data.badgeText, null);
  assert.equal(ok.data.ctaLabel, "Shop the Promotion");
  assert.equal(ok.data.startsAt, null);
  assert.equal(ok.data.endsAt, null);
  assert.equal(ok.data.categoryId, 3);
}

const dated = parse({ ...base, startsAt: "2026-10-01", endsAt: "2026-10-31" });
assert.ok("data" in dated);
if ("data" in dated) {
  assert.equal(dated.data.endsAt!.toISOString(), "2026-11-01T04:59:59.000Z");
  assert.equal(dated.data.startsAt!.toISOString(), "2026-10-01T05:00:00.000Z");
}

assert.deepEqual(parse({ ...base, startsAt: "2026-11-02", endsAt: "2026-11-01" }), {
  error: "End date must be on or after the start date.",
});
assert.ok("data" in parse({ ...base, startsAt: "2026-11-01", endsAt: "2026-11-01" }));
assert.ok("error" in parse({ ...base, endsAt: "nope" }));

const t = parse({ ...base, title: "x".repeat(61) });
assert.ok("error" in t && t.error.includes("60"));
const b = parse({ ...base, badgeText: "x".repeat(15) });
assert.ok("error" in b && b.error.includes("14"));
assert.ok("error" in parse({ ...base, title: "" }));
assert.ok("error" in parse({ ...base, categoryId: "abc" }));
assert.ok("error" in parse({ ...base, categoryId: "9007199254740993" }));
assert.ok("error" in parse({ ...base, categoryId: "2147483648" }));
assert.ok("data" in parse({ ...base, categoryId: "2147483647" }));

// Impossible calendar days are rejected, not rolled over.
assert.deepEqual(parse({ ...base, startsAt: "2026-02-31" }), {
  error: "Start date is not a valid date.",
});
assert.deepEqual(parse({ ...base, endsAt: "2026-04-31" }), {
  error: "End date is not a valid date.",
});
assert.ok("data" in parse({ ...base, startsAt: "2028-02-29" }));

// Body whitespace (incl. CRLF) is collapsed before the 160-char check.
const crlf = parse({ ...base, body: "x".repeat(150) + "\r\n\r\n" + "y".repeat(9) }); // 163 raw → 160
assert.ok("data" in crlf);
if ("data" in crlf) assert.equal(crlf.data.body, "x".repeat(150) + " " + "y".repeat(9));
assert.ok("error" in parse({ ...base, body: "x".repeat(161) }));

const now = new Date("2026-10-15T12:00:00Z");
const d = (s: string) => new Date(s);
assert.equal(promotionStatus({ active: true, startsAt: d("2026-10-20T05:00:00Z"), endsAt: null }, now), "Scheduled");
assert.equal(promotionStatus({ active: false, startsAt: null, endsAt: d("2026-10-10T00:00:00Z") }, now), "Expired");
assert.equal(promotionStatus({ active: false, startsAt: null, endsAt: null }, now), "Inactive");
assert.equal(
  promotionStatus({ active: true, startsAt: d("2026-10-01T05:00:00Z"), endsAt: d("2026-10-31T00:00:00Z") }, now),
  "Live",
);

assert.equal(toDateInput(new Date("2026-11-01T04:59:59Z")), "2026-10-31");
assert.equal(toDateInput(null), "");

console.log("ok");
