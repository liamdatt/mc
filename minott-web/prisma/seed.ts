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
      { name: "Time Saver All-Purpose Cleaner", shortDescription: "Versatile cleaner for kitchens, surfaces and equipment.", isChemical: true, featured: true },
      { name: "Industrial Degreaser", shortDescription: "Heavy-duty degreaser for floors and machinery.", isChemical: true },
      { name: "Disinfectant Concentrate", shortDescription: "Kills bacteria; meets government sanitation specs.", isChemical: true, featured: true },
      { name: "Chlorine Bleach", shortDescription: "Commercial-strength bleach for whitening and sanitizing.", isChemical: true },
      { name: "Hand Soap", shortDescription: "Gentle, economical hand soap for high-traffic washrooms.", isChemical: true },
      { name: "Floor Cleaner", shortDescription: "Neutral pH daily floor cleaner for polished surfaces.", isChemical: true },
      { name: "Deodoriser", shortDescription: "Long-lasting odour control for restrooms and bins.", isChemical: true },
      { name: "Carpet & Upholstery Cleaner", shortDescription: "Extraction-ready formula for carpets and soft furnishings.", isChemical: true },
    ],
  },
  {
    name: "Janitorial Equipment & Supplies",
    description:
      "Floor care, carts, and the everyday tools that keep facilities running.",
    imagePath: "/images/product-janitorial.jpg",
    products: [
      { name: "Rubbermaid Housekeeping Cart", shortDescription: "Commercial cleaning cart with organised storage.", featured: true },
      { name: "Mop Bucket & Wringer", shortDescription: "Heavy-duty bucket with side-press wringer.", featured: true },
      { name: "Wet/Dry Vacuum", shortDescription: "Powerful pickup for liquids and debris.", featured: true },
      { name: "Microfibre Wipes", shortDescription: "Lint-free cloths for streak-free cleaning." },
      { name: "Broom & Dustpan Set", shortDescription: "Durable broom paired with a lobby dustpan." },
      { name: "Floor Cleaning Mop", shortDescription: "Replaceable-head mop for daily floor care." },
      { name: "Garbage Bags", shortDescription: "Strong liners in commercial bin sizes." },
      { name: "Safety Cones & Wet-Floor Signs", shortDescription: "High-visibility hazard signage." },
      { name: "Waste & Recycling Bins", shortDescription: "Rubbermaid containers for any environment." },
    ],
  },
  {
    name: "Personal Protection Equipment (PPE)",
    description:
      "Gloves, masks, and protective wear that keep your people safe.",
    imagePath: "/images/product-ppe.jpg",
    products: [
      { name: "Nitrile Gloves", shortDescription: "Powder-free disposable gloves, box of 100.", featured: true },
      { name: "Latex Gloves", shortDescription: "Comfortable, flexible disposable gloves." },
      { name: "Surgical Gloves", shortDescription: "Sterile gloves for medical settings." },
      { name: "KN95 Masks", shortDescription: "High-filtration respiratory protection.", featured: true },
      { name: "Surgical Masks", shortDescription: "3-ply disposable masks, box of 50." },
      { name: "Isolation Gowns", shortDescription: "Fluid-resistant protective gowns." },
      { name: "Safety Goggles", shortDescription: "Clear, anti-fog eye protection." },
      { name: "Safety & Water Boots", shortDescription: "Slip-resistant protective footwear." },
    ],
  },
  {
    name: "Paper Products",
    description:
      "Hand towels, tissue, and dispensers — so you never run out.",
    imagePath: "/images/product-paper.jpg",
    products: [
      { name: "Multifold Hand Towels", shortDescription: "Absorbent folded towels for washroom dispensers.", featured: true },
      { name: "Jumbo Roll Tissue", shortDescription: "Long-lasting bathroom tissue for high-traffic areas." },
      { name: "Bathroom Tissue", shortDescription: "Soft 2-ply tissue in case quantities." },
      { name: "Paper Napkins", shortDescription: "Food-service napkins in bulk." },
      { name: "Towel & Tissue Dispensers", shortDescription: "Durable wall-mounted dispensers." },
    ],
  },
];

async function main() {
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
      await db.product.upsert({
        where: { slug: productSlug },
        update: {
          name: p.name,
          categoryId: category.id,
          shortDescription: p.shortDescription,
          isChemical: p.isChemical ?? false,
          sampleAvailable: p.isChemical ?? false,
          featured: p.featured ?? false,
          sortOrder: productSort,
        },
        create: {
          slug: productSlug,
          name: p.name,
          categoryId: category.id,
          shortDescription: p.shortDescription,
          isChemical: p.isChemical ?? false,
          sampleAvailable: p.isChemical ?? false,
          featured: p.featured ?? false,
          sortOrder: productSort,
        },
      });
      productSort += 1;
    }
  }
  console.log("Seed complete.");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
