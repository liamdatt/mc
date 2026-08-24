// Catalog importer — writes the pre-grouped per-category data modules
// (prisma/data/*.ts) as Product (listing) + ProductVariant rows.
//
// Authoritative full replace: listings are upserted by slug and variants by sku
// (IDs stay stable across runs, so inquiry references survive), then anything not
// present in the modules is pruned. Grouping is decided inside each data module,
// not here. Run `npm run db:seed` first so the categories exist.
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { slugify } from "../prisma/seed";
import type { SeedListing } from "../prisma/data/_listing-types";
import { CHEMICALS } from "../prisma/data/chemicals";
import { CLEANING_TOOLS } from "../prisma/data/cleaning-tools";
import { FLOOR_MAINTENANCE } from "../prisma/data/floor-maintenance";
import { DISPENSERS } from "../prisma/data/dispensers";
import { PAPER } from "../prisma/data/paper";
import { FOOD_SERVICE } from "../prisma/data/food-service-supplies";
import { GLOVES } from "../prisma/data/gloves";
import { SAFETY } from "../prisma/data/safety";
import { BINS } from "../prisma/data/bins";
import { GARBAGE_BAGS } from "../prisma/data/garbage-bags";
import { MATS } from "../prisma/data/mats";
import { FACILITY_CARE } from "../prisma/data/facility-care";

// categorySlug must match a seeded category (prisma/seed.ts CATEGORIES).
const MODULES: { categorySlug: string; listings: SeedListing[] }[] = [
  { categorySlug: "chemicals", listings: CHEMICALS },
  { categorySlug: "cleaning-tools", listings: CLEANING_TOOLS },
  { categorySlug: "floor-maintenance", listings: FLOOR_MAINTENANCE },
  { categorySlug: "dispensers", listings: DISPENSERS },
  { categorySlug: "paper", listings: PAPER },
  { categorySlug: "food-service-supplies", listings: FOOD_SERVICE },
  { categorySlug: "gloves", listings: GLOVES },
  { categorySlug: "safety", listings: SAFETY },
  { categorySlug: "bins", listings: BINS },
  { categorySlug: "garbage-bags", listings: GARBAGE_BAGS },
  { categorySlug: "mats", listings: MATS },
  { categorySlug: "facility-care", listings: FACILITY_CARE },
];

const PLACEHOLDER = "/images/product-placeholder.png";
// Admin-uploaded images (stored on the data volume, served by the
// app/images/uploads route). This importer runs on every prod container start,
// so it must NOT clobber these back to the catalog/placeholder image.
const UPLOAD_PREFIX = "/images/uploads/";

const dbUrl =
  process.env.DATABASE_URL?.replace("file:", "") ??
  path.join(process.cwd(), "prisma/app.db");
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const db = new PrismaClient({ adapter, log: ["error"] });

function variantLabel(
  v: { size: string | null; packType: string; label?: string | null },
  multiPack: boolean,
): string | null {
  if (v.label) return v.label;
  if (v.size) return multiPack ? `${v.size} · ${v.packType}` : v.size;
  return multiPack ? v.packType : null;
}

async function main() {
  const cats = await db.category.findMany({ select: { id: true, slug: true } });
  const catId = new Map(cats.map((c) => [c.slug, c.id]));

  const usedSlugs = new Set<string>();
  const keepSlugs: string[] = [];
  const keepSkus: string[] = [];
  const categoryHero = new Map<number, string>();

  let listingCount = 0;
  let variantCount = 0;

  for (const mod of MODULES) {
    const categoryId = catId.get(mod.categorySlug);
    if (!categoryId) {
      throw new Error(
        `Missing category "${mod.categorySlug}" — run 'npm run db:seed' first.`,
      );
    }

    let sort = 0;
    for (const L of mod.listings) {
      let slug = slugify(L.name);
      if (usedSlugs.has(slug)) {
        let n = 2;
        while (usedSlugs.has(`${slug}-${n}`)) n += 1;
        slug = `${slug}-${n}`;
      }
      usedSlugs.add(slug);
      keepSlugs.push(slug);

      const listingData = {
        name: L.name,
        categoryId,
        shortDescription: L.shortDescription,
        description: L.description ?? null,
        imagePath: L.imagePath || PLACEHOLDER,
        color: L.color ?? null,
        industry: L.industry ?? null,
        optionLabel: L.optionLabel ?? null,
        isChemical: L.isChemical ?? false,
        sampleAvailable: L.sampleAvailable ?? false,
        sdsUrl: L.sdsUrl ?? null,
        featured: L.featured ?? false,
        active: true,
        sortOrder: sort,
      };
      const existing = await db.product.findUnique({
        where: { slug },
        select: { imagePath: true },
      });
      const keepImage = existing?.imagePath.startsWith(UPLOAD_PREFIX) ?? false;
      const listing = await db.product.upsert({
        where: { slug },
        update: keepImage ? { ...listingData, imagePath: undefined } : listingData,
        create: { slug, ...listingData },
      });
      sort += 1;
      listingCount += 1;
      if (
        !categoryHero.has(categoryId) &&
        L.imagePath &&
        !L.imagePath.includes("placeholder")
      ) {
        categoryHero.set(categoryId, L.imagePath);
      }

      const multiPack = new Set(L.variants.map((v) => v.packType)).size > 1;
      let vsort = 0;
      for (const V of L.variants) {
        keepSkus.push(V.sku);
        const variantData = {
          productId: listing.id,
          size: V.size,
          packType: V.packType,
          label: variantLabel(V, multiPack),
          volume: V.volume ?? null,
          packSize: V.packSize ?? null,
          imagePath: V.imagePath ?? null,
          active: true,
          sortOrder: vsort,
        };
        const existingVariant = await db.productVariant.findUnique({
          where: { sku: V.sku },
          select: { imagePath: true },
        });
        const keepVariantImage =
          existingVariant?.imagePath?.startsWith(UPLOAD_PREFIX) ?? false;
        await db.productVariant.upsert({
          where: { sku: V.sku },
          update: keepVariantImage
            ? { ...variantData, imagePath: undefined }
            : variantData,
          create: { sku: V.sku, ...variantData },
        });
        vsort += 1;
        variantCount += 1;
      }
    }
  }

  // Authoritative full replace: prune anything not in the new catalog.
  const delV = await db.productVariant.deleteMany({ where: { sku: { notIn: keepSkus } } });
  const delP = await db.product.deleteMany({ where: { slug: { notIn: keepSlugs } } });

  // Give each category a representative hero image (its first listing's image).
  for (const [cid, img] of categoryHero) {
    await db.category.update({ where: { id: cid }, data: { imagePath: img } });
  }

  // Prune stale categories left empty by the replace (they are safe to delete
  // now that their products are gone). Only touch categories not in the modules.
  const validCatSlugs = new Set(MODULES.map((m) => m.categorySlug));
  const staleCats = await db.category.findMany({
    where: { slug: { notIn: [...validCatSlugs] } },
    select: { id: true, _count: { select: { products: true } } },
  });
  const emptyStaleIds = staleCats.filter((c) => c._count.products === 0).map((c) => c.id);
  const delC = emptyStaleIds.length
    ? await db.category.deleteMany({ where: { id: { in: emptyStaleIds } } })
    : { count: 0 };

  console.log(
    `Import: ${listingCount} listings, ${variantCount} variants across ${MODULES.length} categories. ` +
      `Pruned ${delP.count} stale listings, ${delV.count} stale variants, ${delC.count} stale categories.`,
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
