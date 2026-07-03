import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbUrl =
  process.env.DATABASE_URL?.replace("file:", "") ??
  path.join(process.cwd(), "prisma/app.db");

const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const db = new PrismaClient({ adapter, log: ["error"] });

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type SeedCategory = {
  name: string;
  description: string;
  imagePath: string;
};

const PLACEHOLDER = "/images/product-placeholder.png";

// ---------------------------------------------------------------------------
// The MEC product categories — one per sheet of the June 2026 product listing.
// Products (listings + variants) are populated per-category by
// scripts/import-catalog.ts from prisma/data/*.ts. Category order = array order.
// ---------------------------------------------------------------------------

export const CATEGORIES: SeedCategory[] = [
  {
    name: "Chemicals",
    description:
      "Our manufactured line of cleaning, sanitising and maintenance chemicals — bleaches, disinfectants, degreasers, polishes and more.",
    imagePath: PLACEHOLDER,
  },
  {
    name: "Cleaning Tools",
    description:
      "Scouring pads, scrubbers, brushes, cloths and the everyday hand tools that keep facilities clean.",
    imagePath: PLACEHOLDER,
  },
  {
    name: "Floor Maintenance",
    description:
      "Brooms, mops, handles, squeegees and floor-care equipment for daily and deep cleaning.",
    imagePath: PLACEHOLDER,
  },
  {
    name: "Dispensers",
    description:
      "Wall-mounted soap, sanitiser, tissue and paper-towel dispensers for washrooms and kitchens.",
    imagePath: PLACEHOLDER,
  },
  {
    name: "Paper",
    description:
      "Hand towels, bathroom tissue, kitchen roll and paper products in commercial pack sizes.",
    imagePath: PLACEHOLDER,
  },
  {
    name: "Food Service Supplies",
    description:
      "Disposable cups, plates, lunch boxes, cutlery and food-service disposables.",
    imagePath: PLACEHOLDER,
  },
  {
    name: "Gloves",
    description:
      "Nitrile, vinyl and work gloves in a full range of colours and sizes.",
    imagePath: PLACEHOLDER,
  },
  {
    name: "Safety",
    description:
      "Personal protective equipment — boots, coats, vests, goggles and protective wear.",
    imagePath: PLACEHOLDER,
  },
  {
    name: "Bins",
    description:
      "Buckets, wringers, waste containers and mop-bucket systems.",
    imagePath: PLACEHOLDER,
  },
  {
    name: "Garbage Bags",
    description:
      "Poly bags and bin liners across every dimension, gauge and case count.",
    imagePath: PLACEHOLDER,
  },
  {
    name: "Mats",
    description:
      "Entrance, scraper and anti-fatigue floor mats in a range of sizes and colours.",
    imagePath: PLACEHOLDER,
  },
  {
    name: "Facility Care",
    description:
      "Tarpaulins, covers and general facility-maintenance supplies.",
    imagePath: PLACEHOLDER,
  },
];

// ---------------------------------------------------------------------------
// Seed runner — categories only. Idempotent upsert + prune of stale-empty
// categories. Products are owned by scripts/import-catalog.ts.
// ---------------------------------------------------------------------------

async function main() {
  const keepCategorySlugs: string[] = [];
  let categorySort = 0;

  for (const cat of CATEGORIES) {
    const categorySlug = slugify(cat.name);
    keepCategorySlugs.push(categorySlug);

    await db.category.upsert({
      where: { slug: categorySlug },
      update: {
        name: cat.name,
        description: cat.description,
        sortOrder: categorySort,
        parentId: null,
      },
      create: {
        slug: categorySlug,
        name: cat.name,
        description: cat.description,
        imagePath: cat.imagePath,
        sortOrder: categorySort,
        parentId: null,
      },
    });
    categorySort += 1;
  }

  // Prune stale categories that hold no products (required FK, no cascade).
  const staleCategories = await db.category.findMany({
    where: { slug: { notIn: keepCategorySlugs } },
    select: { id: true, _count: { select: { products: true } } },
  });
  const emptyStaleIds = staleCategories
    .filter((c) => c._count.products === 0)
    .map((c) => c.id);
  const removedCategories = emptyStaleIds.length
    ? await db.category.deleteMany({ where: { id: { in: emptyStaleIds } } })
    : { count: 0 };

  console.log(
    `Category seed complete. ${keepCategorySlugs.length} categories seeded, ${removedCategories.count} stale categories removed.`,
  );
}

if (require.main === module) {
  main()
    .then(() => db.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await db.$disconnect();
      process.exit(1);
    });
}
