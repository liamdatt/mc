import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbUrl =
  process.env.DATABASE_URL?.replace("file:", "") ??
  path.join(process.cwd(), "prisma/app.db");

const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const db = new PrismaClient({ adapter, log: ["error"] });

type SeedProduct = {
  name: string;
  shortDescription: string;
  sku: string;
  packSize: string;
  specLabel: string;
  specValue: string;
  isChemical?: boolean;
  featured?: boolean;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const CATEGORIES: {
  name: string;
  description: string;
  imagePath: string;
  products: SeedProduct[];
}[] = [
  {
    name: "Industrial & Household Chemicals",
    description:
      "Manufactured on our Kingston floor — our own extensive line of cleaning and maintenance chemicals.",
    imagePath: "/images/product-chemicals.jpg",
    products: [
      { name: "Time Saver All-Purpose Cleaner", shortDescription: "Versatile cleaner for kitchens, surfaces and equipment. Cuts grease and leaves a fresh fragrance.", sku: "CHM-001", packSize: "1 L, 4 L, 20 L", specLabel: "Form", specValue: "Liquid", isChemical: true, featured: true },
      { name: "Industrial Degreaser", shortDescription: "Heavy-duty degreaser that lifts oil and grime from floors and machinery.", sku: "CHM-002", packSize: "4 L, 20 L", specLabel: "Form", specValue: "Liquid", isChemical: true },
      { name: "Disinfectant Concentrate", shortDescription: "Effective disinfectant and sanitizer; meets government sanitation specs for destroying bacteria.", sku: "CHM-003", packSize: "1 L, 4 L, 20 L", specLabel: "Form", specValue: "Liquid", isChemical: true, featured: true },
      { name: "Chlorine Bleach (Sodium Hypochlorite 5%)", shortDescription: "Commercial-strength bleach for whitening, cleaning and sanitizing applications.", sku: "CHM-004", packSize: "1 L, 4 L, 20 L, 210 L", specLabel: "Form", specValue: "Liquid", isChemical: true },
      { name: "Hand Soap", shortDescription: "Gentle, economical hand soap for high-traffic washrooms.", sku: "CHM-005", packSize: "500 mL, 4 L", specLabel: "Form", specValue: "Liquid", isChemical: true },
      { name: "Floor Cleaner", shortDescription: "Neutral-pH daily floor cleaner safe for polished and sealed surfaces.", sku: "CHM-006", packSize: "4 L, 20 L", specLabel: "Form", specValue: "Liquid", isChemical: true },
      { name: "Deodoriser", shortDescription: "Long-lasting odour control for restrooms, bins and common areas.", sku: "CHM-007", packSize: "1 L, 4 L", specLabel: "Form", specValue: "Liquid", isChemical: true },
      { name: "Carpet & Upholstery Cleaner", shortDescription: "Extraction-ready formula for carpets and soft furnishings.", sku: "CHM-008", packSize: "4 L, 20 L", specLabel: "Form", specValue: "Liquid", isChemical: true },
    ],
  },
  {
    name: "Janitorial Equipment & Supplies",
    description:
      "Floor care, carts, and the everyday tools that keep facilities running.",
    imagePath: "/images/product-janitorial.jpg",
    products: [
      { name: "Rubbermaid Housekeeping Cart", shortDescription: "Commercial cleaning cart with organised storage and a vinyl bag.", sku: "JAN-001", packSize: "1 Unit", specLabel: "Material", specValue: "Plastic", featured: true },
      { name: "Mop Bucket & Wringer (36 QT)", shortDescription: "Durable mop bucket with heavy-duty wringer and smooth-rolling casters.", sku: "JAN-002", packSize: "1 Unit", specLabel: "Material", specValue: "Plastic", featured: true },
      { name: "Wet/Dry Vacuum", shortDescription: "Powerful pickup for liquids and debris in any environment.", sku: "JAN-003", packSize: "1 Unit", specLabel: "Capacity", specValue: "16 Gal", featured: true },
      { name: "Microfibre Wipes", shortDescription: "Lint-free cloths for streak-free cleaning and polishing.", sku: "JAN-004", packSize: "12 per pack", specLabel: "Colour", specValue: "Assorted" },
      { name: "Broom & Dustpan Set", shortDescription: "Durable broom paired with a lobby dustpan.", sku: "JAN-005", packSize: "1 Set", specLabel: "Material", specValue: "PP" },
      { name: "Floor Cleaning Mop", shortDescription: "Replaceable-head mop for daily floor care.", sku: "JAN-006", packSize: "1 Unit", specLabel: "Type", specValue: "Wet" },
      { name: "Garbage Bags", shortDescription: "Strong liners in commercial bin sizes.", sku: "JAN-007", packSize: "100 per box", specLabel: "Gauge", specValue: "Heavy" },
      { name: "Safety Cones & Wet-Floor Signs", shortDescription: "High-visibility hazard signage for safe work areas.", sku: "JAN-008", packSize: "1 Unit", specLabel: "Height", specValue: "28 in" },
      { name: "Waste & Recycling Bins", shortDescription: "Rubbermaid containers for waste and recycling streams.", sku: "JAN-009", packSize: "1 Unit", specLabel: "Capacity", specValue: "23 Gal" },
    ],
  },
  {
    name: "Personal Protection Equipment (PPE)",
    description:
      "Gloves, masks, and protective wear that keep your people safe.",
    imagePath: "/images/product-ppe.jpg",
    products: [
      { name: "Nitrile Gloves (Black)", shortDescription: "Premium powder-free nitrile gloves offering excellent protection and chemical resistance.", sku: "PPE-001", packSize: "100 per box", specLabel: "Size", specValue: "S, M, L, XL", featured: true },
      { name: "Latex Gloves", shortDescription: "Comfortable, flexible powder-free disposable gloves.", sku: "PPE-002", packSize: "100 per box", specLabel: "Size", specValue: "S, M, L, XL" },
      { name: "Surgical Gloves", shortDescription: "Sterile gloves for medical and clinical settings.", sku: "PPE-003", packSize: "50 pairs / box", specLabel: "Size", specValue: "6.5 – 8.0" },
      { name: "KN95 Masks", shortDescription: "High-filtration respiratory protection for everyday use.", sku: "PPE-004", packSize: "20 per box", specLabel: "Filtration", specValue: "95%", featured: true },
      { name: "Surgical Masks", shortDescription: "3-ply disposable masks with comfortable ear loops.", sku: "PPE-005", packSize: "50 per box", specLabel: "Ply", specValue: "3 Ply" },
      { name: "Isolation Gowns", shortDescription: "Fluid-resistant protective gowns for clinical environments.", sku: "PPE-006", packSize: "10 per pack", specLabel: "Level", specValue: "AAMI 2" },
      { name: "Safety Goggles", shortDescription: "Clear, anti-fog eye protection with a comfortable seal.", sku: "PPE-007", packSize: "1 Unit", specLabel: "Lens", specValue: "Anti-fog" },
      { name: "Safety & Water Boots", shortDescription: "Slip-resistant protective footwear for wet work areas.", sku: "PPE-008", packSize: "1 Pair", specLabel: "Size", specValue: "6 – 12" },
    ],
  },
  {
    name: "Paper Products",
    description:
      "Hand towels, tissue, and dispensers — so you never run out.",
    imagePath: "/images/product-paper.jpg",
    products: [
      { name: "Multifold Hand Towels", shortDescription: "Absorbent folded towels for washroom dispensers.", sku: "PPR-001", packSize: "16 packs / case", specLabel: "Sheets", specValue: "250 / pack", featured: true },
      { name: "Jumbo Roll Tissue", shortDescription: "Long-lasting bathroom tissue for high-traffic areas.", sku: "PPR-002", packSize: "12 Rolls / Case", specLabel: "Ply", specValue: "2 Ply" },
      { name: "Bathroom Tissue", shortDescription: "Soft 2-ply tissue in case quantities.", sku: "PPR-003", packSize: "48 Rolls / Case", specLabel: "Ply", specValue: "2 Ply" },
      { name: "Paper Napkins", shortDescription: "Food-service napkins in bulk.", sku: "PPR-004", packSize: "6000 / Case", specLabel: "Ply", specValue: "1 Ply" },
      { name: "Towel & Tissue Dispensers", shortDescription: "Durable wall-mounted dispensers.", sku: "PPR-005", packSize: "1 Unit", specLabel: "Material", specValue: "ABS" },
    ],
  },
];

async function main() {
  const keepSlugs: string[] = [];
  let categorySort = 0;
  for (const cat of CATEGORIES) {
    const categorySlug = slugify(cat.name);
    const category = await db.category.upsert({
      where: { slug: categorySlug },
      update: {
        name: cat.name,
        description: cat.description,
        imagePath: cat.imagePath,
        sortOrder: categorySort,
      },
      create: {
        slug: categorySlug,
        name: cat.name,
        description: cat.description,
        imagePath: cat.imagePath,
        sortOrder: categorySort,
      },
    });
    categorySort += 1;

    let productSort = 0;
    for (const p of cat.products) {
      const productSlug = slugify(p.name);
      keepSlugs.push(productSlug);
      const data = {
        name: p.name,
        categoryId: category.id,
        shortDescription: p.shortDescription,
        sku: p.sku,
        packSize: p.packSize,
        specLabel: p.specLabel,
        specValue: p.specValue,
        isChemical: p.isChemical ?? false,
        sampleAvailable: p.isChemical ?? false,
        featured: p.featured ?? false,
        sortOrder: productSort,
      };
      await db.product.upsert({
        where: { slug: productSlug },
        update: data,
        create: { slug: productSlug, ...data },
      });
      productSort += 1;
    }
  }

  // Prune products that are no longer part of the seed set (e.g. renamed slugs).
  const removed = await db.product.deleteMany({
    where: { slug: { notIn: keepSlugs } },
  });

  console.log(
    `Seed complete. ${keepSlugs.length} products seeded, ${removed.count} stale removed.`,
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
