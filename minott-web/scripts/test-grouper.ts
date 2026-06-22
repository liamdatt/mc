import assert from "node:assert/strict";
import { groupProducts, listingKey, canonicalName, formatSize, type RawProduct } from "../lib/variants/group";

const raw = (over: Partial<RawProduct> & Pick<RawProduct, "name" | "sku">): RawProduct => ({
  categorySlug: "industrial-and-household-chemicals",
  isChemical: true,
  ...over,
});

// listingKey strips the code token and trailing pack token; keeps strength/scent.
assert.equal(listingKey("BLH-0004 BLEACH 2 SP"), "BLEACH 2 SP");
assert.equal(listingKey("BLH-0004 BLEACH 4"), "BLEACH 4");
assert.equal(listingKey("CHM-11OZ INSTA CLN CS"), "INSTA CLN");
assert.equal(listingKey("CHM-11OZ INSTA CLN EA"), "INSTA CLN");
assert.equal(listingKey("BIN-001"), "BIN-001");

assert.equal(formatSize("208.5L"), "208.5 L");
assert.equal(formatSize("11.5kg"), "11.5 kg");
assert.equal(canonicalName(["Conquer Floral (4L)", "Conquer Disinfectant Floral (1L)"]), "Conquer Disinfectant Floral");

const listings = groupProducts([
  raw({ name: "2% Sunbrite Bleach (1L)", sku: "BLH-0001 BLEACH 2 SP", volume: "1L", packSize: "EACH" }),
  raw({ name: "2% Sunbrite Bleach (4L)", sku: "BLH-0004 BLEACH 2 SP", volume: "4L", packSize: "EACH" }),
  raw({ name: "2% Sunbrite Bleach (19L)", sku: "BLH-0019 BLEACH 2 SP", volume: "19L", packSize: "EACH" }),
  raw({ name: "4% Sun Brite Bleach (4L)", sku: "BLH-0004 BLEACH 4", volume: "4L", packSize: "EACH" }),
  raw({ name: "11oz Insta Clean Sanitizer", sku: "CHM-11OZ INSTA CLN EA", volume: null, packSize: "EACH" }),
  raw({ name: "11oz Sanitizer (6 per case)", sku: "CHM-11OZ INSTA CLN CS", volume: null, packSize: "CASE" }),
  raw({ name: "Rubbermaid Brute (32 Gal)", sku: "BIN-001", categorySlug: "garbage-bins", isChemical: false }),
]);

const byName = (n: string) => listings.find((l) => l.name === n)!;

// Sizes merge under one listing; strengths stay separate.
const b2 = byName("2% Sunbrite Bleach");
assert.equal(b2.variants.length, 3, "2% bleach should have 3 size variants");
assert.deepEqual(b2.variants.map((v) => v.size), ["1 L", "4 L", "19 L"], "variants sorted ascending");
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

console.log(`OK — ${listings.length} listings from 7 rows`);
