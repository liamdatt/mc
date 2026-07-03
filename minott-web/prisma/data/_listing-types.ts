// Shared types for the per-category catalog data modules (one file per sheet of
// "MEC Product Listing Jun30.xlsx"). Each module exports a `SeedListing[]` that the
// importer (scripts/import-catalog.ts) writes directly as Product (listing) +
// ProductVariant rows — the grouping is decided per category by whoever authored
// the module, NOT by a generic grouper.

export type SeedVariant = {
  /** Client item code — globally unique. Persisted verbatim as ProductVariant.sku. */
  sku: string;
  /** Human size/option label shown as a pill, e.g. "4 L", "Large", "3x5 ft". Null when the listing has no size axis. */
  size: string | null;
  /** Pack unit, e.g. "Each" | "Case" | "Pack". Drives the second selector when a listing mixes pack types. */
  packType: string;
  /** Full display label, e.g. "4 L · Case" or "Large". Optional — the importer falls back to size/packType. */
  label?: string | null;
  /** Raw volume token for filtering, e.g. "4L", "290g". Optional. */
  volume?: string | null;
  /** Raw UOM from the sheet, e.g. "CASE". Optional. */
  packSize?: string | null;
  /** Per-variant image; falls back to the listing hero when absent. */
  imagePath?: string | null;
};

export type SeedListing = {
  /** Canonical listing name WITHOUT the size (e.g. "2% Sunbrite Bleach", not "... (4L)"). */
  name: string;
  shortDescription: string;
  description?: string | null;
  /** Hero image (usually the first variant's image). */
  imagePath: string;
  color?: string | null;
  industry?: string | null;
  isChemical?: boolean;
  sampleAvailable?: boolean;
  sdsUrl?: string | null;
  featured?: boolean;
  /** One entry per orderable size/pack. A standalone product has exactly one. */
  variants: SeedVariant[];
};
