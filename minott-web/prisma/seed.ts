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
// First admin account for the unified Accounts Portal.
// ---------------------------------------------------------------------------

/**
 * First admin account for the unified Accounts Portal. Created through
 * better-auth (headerless createUser) so the credential Account row uses
 * better-auth's own hash format; activated immediately (no invite email —
 * createUser does not trigger sendResetPassword). Idempotent: skips when the
 * email already exists. Runs in every environment, including production —
 * without it there is no way to sign in to a fresh deploy — so the seeded
 * credential defaults to a well-known email/password pair (overridable via
 * SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD) and a loud warning fires when the
 * default password is actually used to create the account. Operators are
 * expected to rotate it post-deploy (see README).
 */
export async function seedAdmin() {
  // `||` (not `??`) so the `KEY=""` idiom used in .env.example falls back to
  // the defaults instead of seeding an empty email or a credential-less
  // account. Lowercased because better-auth normalizes emails on create — a
  // mixed-case env value would otherwise miss the idempotency check and abort
  // every subsequent boot with USER_ALREADY_EXISTS.
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@example.com")
    .trim()
    .toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "test123";
  const usingDefaultPassword = !process.env.SEED_ADMIN_PASSWORD;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists — skipping.`);
    return;
  }
  const { auth } = await import("../lib/auth/portal");
  await auth.api.createUser({
    body: { email, password, name: "MEC Admin", data: {} },
  });
  await db.user.update({
    where: { email },
    data: { role: "admin", activatedAt: new Date() },
  });
  console.log(`Seeded admin ${email}.`);
  if (usingDefaultPassword) {
    console.warn(
      "[seed] SECURITY: seeded admin with the well-known default password (test123). Set SEED_ADMIN_PASSWORD or rotate this account before exposing the site.",
    );
  }
}

/**
 * Local-dev Accounts Receivable login. Skipped in production (NODE_ENV) —
 * real AR staff are invited from /portal/admins.
 */
export async function seedArUser() {
  if (process.env.NODE_ENV === "production") return;
  const email = "ar@example.com";
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return;
  const { auth } = await import("../lib/auth/portal");
  await auth.api.createUser({ body: { email, password: "test123", name: "MEC Accounts", data: {} } });
  await db.user.update({ where: { email }, data: { role: "ar", activatedAt: new Date() } });
  console.log(`Seeded AR user ${email}.`);
}

// ---------------------------------------------------------------------------
// Seed runner — categories only. Idempotent upsert + prune of stale-empty
// categories. Products are owned by scripts/import-catalog.ts.
// ---------------------------------------------------------------------------

export async function seedCategories() {
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

async function main() {
  await seedCategories();
  await seedAdmin();
  await seedArUser();
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
