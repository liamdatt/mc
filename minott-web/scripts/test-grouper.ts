import assert from "node:assert/strict";
import { groupProducts, listingKey, canonicalName, formatSize, type RawProduct } from "../lib/variants/group";

const raw = (over: Partial<RawProduct> & Pick<RawProduct, "name" | "sku">): RawProduct => ({
  categorySlug: "industrial-and-household-chemicals",
  isChemical: true,
  ...over,
});

// listingKey drops the code token, removes pack tokens, and SORTS the rest so
// word-order typos don't split a product; strength/scent tokens still separate.
assert.equal(listingKey("BLH-0004 BLEACH 2 SP"), "2 BLEACH SP");
assert.equal(listingKey("BLH-0004 BLEACH 4"), "4 BLEACH");
assert.equal(listingKey("CHM-11OZ INSTA CLN CS"), "CLN INSTA");
assert.equal(listingKey("CHM-11OZ INSTA CLN EA"), "CLN INSTA");
assert.equal(listingKey("BIN-001"), "BIN-001");
// Token-order typo collapses to the same key (the 208.5L bleach bug).
assert.equal(listingKey("BLH-0208 BLEACH SP 2"), listingKey("BLH-0001 BLEACH 2 SP"));
// Different strength stays a different key.
assert.notEqual(listingKey("BLH-0004 BLEACH 4"), listingKey("BLH-0004 BLEACH 2 SP"));

assert.equal(formatSize("208.5L"), "208.5 L");
assert.equal(formatSize("11.5kg"), "11.5 kg");
assert.equal(canonicalName(["Conquer Floral (4L)", "Conquer Disinfectant Floral (1L)"]), "Conquer Disinfectant Floral");

const listings = groupProducts([
  raw({ name: "2% Sunbrite Bleach (1L)", sku: "BLH-0001 BLEACH 2 SP", volume: "1L", packSize: "EACH" }),
  raw({ name: "2% Sunbrite Bleach (4L)", sku: "BLH-0004 BLEACH 2 SP", volume: "4L", packSize: "EACH" }),
  raw({ name: "2% Sunbrite Bleach (19L)", sku: "BLH-0019 BLEACH 2 SP", volume: "19L", packSize: "EACH" }),
  // Word-order typo on the largest size — must still join the 2% bleach listing.
  raw({ name: "2% Sunbrite Bleach (208.5L)", sku: "BLH-0208 BLEACH SP 2", volume: "208.5L", packSize: "EACH" }),
  raw({ name: "4% Sun Brite Bleach (4L)", sku: "BLH-0004 BLEACH 4", volume: "4L", packSize: "EACH" }),
  raw({ name: "11oz Insta Clean Sanitizer", sku: "CHM-11OZ INSTA CLN EA", volume: null, packSize: "EACH" }),
  raw({ name: "11oz Sanitizer (6 per case)", sku: "CHM-11OZ INSTA CLN CS", volume: null, packSize: "CASE" }),
  raw({ name: "Rubbermaid Brute (32 Gal)", sku: "BIN-001", categorySlug: "garbage-bins", isChemical: false }),
]);

const byName = (n: string) => listings.find((l) => l.name === n)!;

// Sizes merge under one listing (incl. the reordered-SKU 208.5L); strengths stay separate.
const b2 = byName("2% Sunbrite Bleach");
assert.equal(b2.variants.length, 4, "2% bleach should have 4 size variants (incl. reordered 208.5L)");
assert.deepEqual(b2.variants.map((v) => v.size), ["1 L", "4 L", "19 L", "208.5 L"], "variants sorted ascending");
assert.ok(byName("4% Sun Brite Bleach"), "4% strength is a separate listing");

// EA + CS merge into one listing with two pack types and pack-suffixed labels.
const insta = byName("11oz Insta Clean Sanitizer");
assert.equal(insta.variants.length, 2);
assert.deepEqual(new Set(insta.variants.map((v) => v.packType)), new Set(["Each", "Case"]));
assert.ok(insta.variants.every((v) => v.label?.includes(v.packType)), "multi-pack labels include pack type");

// Non-chemical product becomes its own 1-variant listing.
const bin = byName("Rubbermaid Brute");
assert.equal(bin.variants.length, 1);
assert.equal(bin.categorySlug, "garbage-bins");

// Slug collision: same canonical name in two categories must yield distinct slugs.
const collide = groupProducts([
  raw({ name: "Power Cleaner (4L)", sku: "CHM-0004 POWER", volume: "4L", packSize: "EACH" }),
  raw({ name: "Power Cleaner (4L)", sku: "BIN-POWER", categorySlug: "garbage-bins", isChemical: false }),
]);
assert.equal(collide.length, 2, "same name in two categories = two listings");
assert.equal(new Set(collide.map((l) => l.slug)).size, 2, "colliding listings must get distinct slugs");

console.log(`OK — ${listings.length} listings from 8 rows`);
