// Prod boot script (start:prod) — replaces the old unconditional
// seed + catalog import, which was an authoritative full replace and clobbered
// portal edits on every container start. The portal is the source of truth for
// the catalog; the prisma/data modules are initial-load data only.
//
// Every boot: ensure the bootstrap admin exists (idempotent, never touches an
// existing account). Once ever per database: seed categories + import the
// catalog, then stamp a Setting marker. A database that already has products
// but no marker (deployments predating this script) is grandfathered — marker
// stamped, import skipped, portal edits untouched.
//
// To deliberately reset the catalog to the data modules: npm run setup:catalog.
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { seedAdmin, seedCategories } from "../prisma/seed";
import { importCatalog } from "./import-catalog";

const MARKER_KEY = "catalogBootstrappedAt";

const dbUrl =
  process.env.DATABASE_URL?.replace("file:", "") ??
  path.join(process.cwd(), "prisma/app.db");
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const db = new PrismaClient({ adapter, log: ["error"] });

async function main() {
  await seedAdmin();

  const marker = await db.setting.findUnique({ where: { key: MARKER_KEY } });
  if (marker) {
    console.log(
      `[bootstrap] Catalog already bootstrapped (${marker.value}) — portal owns the catalog, skipping seed/import.`,
    );
    return;
  }

  const stamp = () =>
    db.setting.create({
      data: { key: MARKER_KEY, value: new Date().toISOString() },
    });

  const productCount = await db.product.count();
  if (productCount > 0) {
    await stamp();
    console.log(
      `[bootstrap] Existing catalog found (${productCount} products) — marked as bootstrapped without importing.`,
    );
    return;
  }

  console.log("[bootstrap] Empty catalog — seeding categories and importing the catalog data modules.");
  await seedCategories();
  await importCatalog();
  await stamp();
  console.log("[bootstrap] Catalog bootstrapped — the portal owns it from here.");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
