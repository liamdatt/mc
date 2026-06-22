// Pure, DB-free grouping of flat catalog rows into listings + variants.
// See docs/superpowers/specs/2026-06-22-product-variants-design.md.

export type RawProduct = {
  name: string;
  sku: string;
  categorySlug: string;
  shortDescription?: string | null;
  description?: string | null;
  imagePath?: string | null;
  volume?: string | null;
  packSize?: string | null;
  specLabel?: string | null;
  specValue?: string | null;
  color?: string | null;
  industry?: string | null;
  isChemical?: boolean;
  sampleAvailable?: boolean;
  sdsUrl?: string | null;
  featured?: boolean;
};

export type GroupedVariant = {
  sku: string;
  size: string | null;
  packType: "Each" | "Case";
  label: string | null;
  volume: string | null;
  packSize: string | null;
  specLabel: string | null;
  specValue: string | null;
  imagePath: string | null;
  sortOrder: number;
};

export type GroupedListing = {
  slug: string;
  name: string;
  categorySlug: string;
  shortDescription: string | null;
  description: string | null;
  imagePath: string;
  color: string | null;
  industry: string | null;
  isChemical: boolean;
  sampleAvailable: boolean;
  sdsUrl: string | null;
  featured: boolean;
  variants: GroupedVariant[];
};

const PLACEHOLDER = "/images/product-placeholder.png";

export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const PACK_TOKENS = new Set(["EA", "CS", "CASE", "EACH"]);

/** Listing key = SKU suffix with the leading "XXX-#### " code token dropped,
 *  pack-type tokens (EA/CS/CASE/EACH) removed, and the remaining tokens SORTED
 *  so word-order typos in the client's data don't split a product. Strength and
 *  scent tokens (e.g. "2", "FLR") survive sorting, so those stay separate
 *  listings; only reordered duplicates collapse — e.g. "BLEACH 2 SP" and
 *  "BLEACH SP 2" both key to "2 BLEACH SP". */
export function listingKey(sku: string): string {
  const space = sku.indexOf(" ");
  const suffix = space === -1 ? sku : sku.slice(space + 1);
  return suffix
    .toUpperCase()
    .split(/\s+/)
    .filter((t) => t && !PACK_TOKENS.has(t))
    .sort()
    .join(" ");
}

/** "4L" -> "4 L", "208.5L" -> "208.5 L", "11.5kg" -> "11.5 kg". */
export function formatSize(volume: string | null | undefined): string | null {
  if (!volume) return null;
  const m = volume.trim().match(/^([\d.]+)\s*(L|kg)$/i);
  if (!m) return volume.trim();
  const unit = m[2].toLowerCase() === "l" ? "L" : "kg";
  return `${m[1]} ${unit}`;
}

/** Numeric magnitude for sorting sizes ascending (kg and L sorted by value). */
export function sizeSortValue(volume: string | null | undefined): number {
  if (!volume) return Number.MAX_SAFE_INTEGER;
  const m = volume.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : Number.MAX_SAFE_INTEGER;
}

export function packTypeFromRaw(sku: string, packSize: string | null | undefined): "Each" | "Case" {
  if (/case/i.test(packSize ?? "")) return "Case";
  if (/\s+CS$/i.test(sku)) return "Case";
  return "Each";
}

/** Longest member name with a trailing "(...)" size parenthetical stripped. */
export function canonicalName(names: string[]): string {
  const cleaned = names
    .map((n) => n.replace(/\s*\([^)]*\)\s*$/, "").trim())
    .filter(Boolean);
  return cleaned.sort((a, b) => b.length - a.length)[0] ?? names[0];
}

export function groupProducts(raw: RawProduct[]): GroupedListing[] {
  const groups = new Map<string, RawProduct[]>();
  for (const p of raw) {
    const key = `${p.categorySlug}::${listingKey(p.sku)}`;
    const arr = groups.get(key) ?? [];
    arr.push(p);
    groups.set(key, arr);
  }

  const usedSlugs = new Set<string>();
  const listings: GroupedListing[] = [];

  for (const members of groups.values()) {
    const name = canonicalName(members.map((m) => m.name));
    let slug = slugify(name);
    if (usedSlugs.has(slug)) slug = `${slug}-${slugify(members[0].sku)}`;
    usedSlugs.add(slug);

    // Representative member = longest name (richest data) for listing-level fields.
    const rep = [...members].sort((a, b) => b.name.length - a.name.length)[0];

    const packTypes = new Set(members.map((m) => packTypeFromRaw(m.sku, m.packSize)));
    const multiPack = packTypes.size > 1;

    const variants: GroupedVariant[] = members
      .map((m) => {
        const size = formatSize(m.volume);
        const packType = packTypeFromRaw(m.sku, m.packSize);
        const label =
          size && multiPack ? `${size} · ${packType}` : size ?? (multiPack ? packType : null);
        return {
          sku: m.sku,
          size,
          packType,
          label,
          volume: m.volume ?? null,
          packSize: m.packSize ?? null,
          specLabel: m.specLabel ?? null,
          specValue: m.specValue ?? null,
          imagePath: m.imagePath ?? null,
          sortOrder: 0,
        };
      })
      .sort(
        (a, b) =>
          sizeSortValue(a.volume) - sizeSortValue(b.volume) ||
          a.packType.localeCompare(b.packType),
      )
      .map((v, i) => ({ ...v, sortOrder: i }));

    listings.push({
      slug,
      name,
      categorySlug: rep.categorySlug,
      shortDescription: rep.shortDescription ?? null,
      description: rep.description ?? null,
      imagePath: rep.imagePath ?? PLACEHOLDER,
      color: rep.color ?? null,
      industry: rep.industry ?? null,
      isChemical: rep.isChemical ?? false,
      sampleAvailable: rep.sampleAvailable ?? false,
      sdsUrl: rep.sdsUrl ?? null,
      featured: members.some((m) => m.featured),
      variants,
    });
  }

  return listings;
}
