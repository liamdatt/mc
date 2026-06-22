// Idempotent, SKU-keyed catalog importer.
//
// Bootstrap mode (DB has zero ProductVariant rows): create ALL listings +
// variants from the grouper output.
//
// Incremental mode (variants already exist): for each grouped variant, if its
// SKU already exists UPDATE only the sheet-owned facts (size, packType, label,
// volume, packSize, specLabel, specValue, imagePath) — never touch productId,
// active, or sortOrder (admin-owned). Brand-new SKUs are attached to the hidden
// "Unsorted Imports" holding listing for an admin to place; no new listings are
// created and existing listing names are never rewritten in incremental mode.
//
// Re-running is a no-op apart from refreshing facts.

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { CHEMICALS_2026 } from "../prisma/data/chemicals-2026";
import { CATEGORIES, slugify, type SeedProduct } from "../prisma/seed";
import { groupProducts, type RawProduct } from "../lib/variants/group";

const dbUrl =
  process.env.DATABASE_URL?.replace("file:", "") ?? path.join(process.cwd(), "prisma/app.db");
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const db = new PrismaClient({ adapter, log: ["error"] });

const CHEM_SLUG = "industrial-and-household-chemicals";
const UNSORTED_SLUG = "unsorted-imports";

function collectRaw(): RawProduct[] {
  const rows: RawProduct[] = [];

  // Source 1: chemical sheet — flat per-size rows.
  for (const p of CHEMICALS_2026) {
    rows.push({
      name: p.name,
      sku: p.sku,
      categorySlug: CHEM_SLUG,
      shortDescription: p.shortDescription,
      description: p.description ?? null,
      imagePath: p.imagePath ?? null,
      volume: p.volume ?? null,
      packSize: p.packSize ?? null,
      specLabel: p.specLabel ?? null,
      specValue: p.specValue ?? null,
      isChemical: true,
      sampleAvailable: true,
    });
  }

  // Source 2: every seeded category product (parent + children).
  const pushCat = (slug: string, products: SeedProduct[]) => {
    for (const p of products) {
      rows.push({
        name: p.name,
        sku: p.sku,
        categorySlug: slug,
        shortDescription: p.shortDescription,
        description: p.description ?? null,
        imagePath: p.imagePath ?? null,
        volume: p.volume ?? null,
        packSize: p.packSize ?? null,
        specLabel: p.specLabel ?? null,
        specValue: p.specValue ?? null,
        color: p.color ?? null,
        industry: p.industry ?? null,
        isChemical: p.isChemical ?? false,
        sampleAvailable: p.isChemical ?? false,
        featured: p.featured ?? false,
      });
    }
  };

  for (const cat of CATEGORIES) {
    pushCat(slugify(cat.name), cat.products);
    for (const child of cat.children ?? []) pushCat(slugify(child.name), child.products);
  }

  return rows;
}

async function ensureUnsortedListing(): Promise<number> {
  const cat = await db.category.findUnique({ where: { slug: CHEM_SLUG } });
  if (!cat) throw new Error(`Run 'npm run db:seed' first — category ${CHEM_SLUG} missing.`);
  const listing = await db.product.upsert({
    where: { slug: UNSORTED_SLUG },
    update: {},
    create: {
      slug: UNSORTED_SLUG,
      name: "Unsorted Imports",
      categoryId: cat.id,
      shortDescription: "Newly imported items awaiting grouping. Hidden from the catalog.",
      active: false,
      sortOrder: 9999,
    },
  });
  return listing.id;
}

async function main() {
  const raw = collectRaw();
  const listings = groupProducts(raw);
  const bootstrap = (await db.productVariant.count()) === 0;
  const unsortedId = await ensureUnsortedListing();

  let createdListings = 0;
  let createdVariants = 0;
  let refreshedVariants = 0;
  let routedToUnsorted = 0;

  const cats = await db.category.findMany({ select: { id: true, slug: true } });
  const catId = new Map(cats.map((c) => [c.slug, c.id]));

  const createdListingSlugs = new Set<string>();

  for (const L of listings) {
    const categoryId = catId.get(L.categorySlug);
    if (!categoryId) {
      console.warn(`Skipping listing ${L.slug}: unknown category ${L.categorySlug}`);
      continue;
    }

    for (const V of L.variants) {
      const existing = await db.productVariant.findUnique({ where: { sku: V.sku } });
      if (existing) {
        // Refresh sheet-owned facts only. productId/active/sortOrder are admin-owned.
        await db.productVariant.update({
          where: { sku: V.sku },
          data: {
            size: V.size,
            packType: V.packType,
            label: V.label,
            volume: V.volume,
            packSize: V.packSize,
            specLabel: V.specLabel,
            specValue: V.specValue,
            imagePath: V.imagePath,
          },
        });
        refreshedVariants++;
        continue;
      }

      let productId: number;
      if (bootstrap) {
        const listing = await db.product.upsert({
          where: { slug: L.slug },
          update: {},
          create: {
            slug: L.slug,
            name: L.name,
            categoryId,
            shortDescription: L.shortDescription,
            description: L.description,
            imagePath: L.imagePath,
            color: L.color,
            industry: L.industry,
            isChemical: L.isChemical,
            sampleAvailable: L.sampleAvailable,
            sdsUrl: L.sdsUrl,
            featured: L.featured,
          },
        });
        // Count each freshly-created listing once (a fresh upsert leaves
        // createdAt === updatedAt; the Set dedupes across its variants).
        if (
          listing.createdAt.getTime() === listing.updatedAt.getTime() &&
          !createdListingSlugs.has(L.slug)
        ) {
          createdListingSlugs.add(L.slug);
          createdListings++;
        }
        productId = listing.id;
      } else {
        // Incremental: never create/rewrite listings — park new SKUs in Unsorted.
        productId = unsortedId;
        routedToUnsorted++;
      }

      await db.productVariant.create({
        data: {
          productId,
          sku: V.sku,
          size: V.size,
          packType: V.packType,
          label: V.label,
          volume: V.volume,
          packSize: V.packSize,
          specLabel: V.specLabel,
          specValue: V.specValue,
          imagePath: V.imagePath,
          sortOrder: V.sortOrder,
        },
      });
      createdVariants++;
    }
  }

  console.log(
    `Import (${bootstrap ? "bootstrap" : "incremental"}): +${createdListings} listings, ` +
      `+${createdVariants} variants (${routedToUnsorted} → Unsorted), ${refreshedVariants} refreshed.`,
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
