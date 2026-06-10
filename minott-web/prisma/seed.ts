import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbUrl =
  process.env.DATABASE_URL?.replace("file:", "") ??
  path.join(process.cwd(), "prisma/app.db");

const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const db = new PrismaClient({ adapter, log: ["error"] });

// ---------------------------------------------------------------------------
// NOTE: product images are placeholders pending real assets from the client.
// All products use /images/product-placeholder.png until image uploads ship.
// ---------------------------------------------------------------------------

const PLACEHOLDER = "/images/product-placeholder.png";

type SeedProduct = {
  name: string;
  shortDescription: string;
  sku: string;
  packSize: string;
  specLabel: string;
  specValue: string;
  isChemical?: boolean;
  featured?: boolean;
  industry?: string;
  volume?: string;
  color?: string;
};

type SeedCategory = {
  name: string;
  description: string;
  imagePath: string;
  products: SeedProduct[];
  children?: SeedChildCategory[];
};

type SeedChildCategory = {
  name: string;
  description: string;
  imagePath: string;
  products: SeedProduct[];
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ---------------------------------------------------------------------------
// The 12 official MEC product categories + chemical child categories
// ---------------------------------------------------------------------------

const CATEGORIES: SeedCategory[] = [
  // 1. Industrial & Household Chemicals
  {
    name: "Industrial & Household Chemicals",
    description:
      "Manufactured on our Kingston floor — our own extensive line of cleaning and maintenance chemicals.",
    imagePath: "/images/product-chemicals.jpg",
    // Parent category carries a representative selection of flagship products;
    // subsections below hold the full detail.
    products: [
      {
        name: "Time Saver All-Purpose Cleaner",
        shortDescription:
          "Versatile cleaner for kitchens, surfaces and equipment. Cuts grease and leaves a fresh fragrance.",
        sku: "CHM-001",
        packSize: "1 L, 4 L, 20 L",
        specLabel: "Form",
        specValue: "Liquid",
        isChemical: true,
        featured: true,
        industry: "Hospitality",
        volume: "1L",
        color: "Yellow",
      },
      {
        name: "Chlorine Bleach (Sodium Hypochlorite 5%)",
        shortDescription:
          "Commercial-strength bleach for whitening, cleaning and sanitising applications.",
        sku: "CHM-004",
        packSize: "1 L, 4 L, 20 L, 210 L",
        specLabel: "Form",
        specValue: "Liquid",
        isChemical: true,
        industry: "Healthcare",
        volume: "4L",
        color: "Clear",
      },
      {
        name: "Hand Soap",
        shortDescription:
          "Gentle, economical hand soap for high-traffic washrooms.",
        sku: "CHM-005",
        packSize: "500 mL, 4 L",
        specLabel: "Form",
        specValue: "Liquid",
        isChemical: true,
        featured: true,
        industry: "Office",
        volume: "500ml",
        color: "Pink",
      },
    ],
    children: [
      // ----------- Child: Disinfectants & Sanitizers
      {
        name: "Disinfectants & Sanitizers",
        description:
          "Hospital-grade and food-safe disinfectants that destroy bacteria, viruses and fungi on contact.",
        imagePath: PLACEHOLDER,
        products: [
          {
            name: "Disinfectant Concentrate",
            shortDescription:
              "Broad-spectrum disinfectant; meets government sanitation specs for destroying bacteria and viruses.",
            sku: "DIS-001",
            packSize: "1 L, 4 L, 20 L",
            specLabel: "Form",
            specValue: "Liquid",
            isChemical: true,
            featured: true,
            industry: "Healthcare",
            volume: "4L",
            color: "Blue",
          },
          {
            name: "Alcohol Hand Sanitiser (70%)",
            shortDescription:
              "Quick-dry ethanol gel for hands; WHO-formula compliant.",
            sku: "DIS-002",
            packSize: "500 mL, 5 L",
            specLabel: "Active",
            specValue: "70% Ethanol",
            isChemical: true,
            industry: "Healthcare",
            volume: "500ml",
            color: "Clear",
          },
          {
            name: "Surface Sanitiser Spray",
            shortDescription:
              "Ready-to-use quaternary ammonium spray for food-contact surfaces.",
            sku: "DIS-003",
            packSize: "750 mL, 5 L",
            specLabel: "Form",
            specValue: "Spray",
            isChemical: true,
            industry: "Food Service",
            volume: "1L",
            color: "Clear",
          },
        ],
      },
      // ----------- Child: Degreasers
      {
        name: "Degreasers",
        description:
          "Industrial-strength degreasers that lift oil, grease and carbon build-up from hard surfaces.",
        imagePath: PLACEHOLDER,
        products: [
          {
            name: "Industrial Degreaser",
            shortDescription:
              "Heavy-duty degreaser that lifts oil and grime from floors and machinery.",
            sku: "DEG-001",
            packSize: "4 L, 20 L",
            specLabel: "Form",
            specValue: "Liquid",
            isChemical: true,
            industry: "Manufacturing",
            volume: "5gal",
            color: "Orange",
          },
          {
            name: "Kitchen Degreaser Concentrate",
            shortDescription:
              "Powerful concentrate for hoods, grills and fryers in commercial kitchens.",
            sku: "DEG-002",
            packSize: "4 L, 20 L",
            specLabel: "Dilution",
            specValue: "1:10 – 1:50",
            isChemical: true,
            industry: "Food Service",
            volume: "4L",
            color: "Green",
          },
        ],
      },
      // ----------- Child: Laundry Care
      {
        name: "Laundry Care",
        description:
          "Commercial laundry detergents, softeners and stain treatments formulated for high-volume use.",
        imagePath: PLACEHOLDER,
        products: [
          {
            name: "Commercial Laundry Detergent",
            shortDescription:
              "High-performance liquid detergent for commercial washers; low-foam formula.",
            sku: "LAU-001",
            packSize: "4 L, 20 L",
            specLabel: "Form",
            specValue: "Liquid",
            isChemical: true,
            industry: "Hospitality",
            volume: "4L",
            color: "Blue",
          },
          {
            name: "Fabric Softener & Conditioner",
            shortDescription:
              "Anti-static softener that leaves linens soft and fresh-smelling.",
            sku: "LAU-002",
            packSize: "4 L, 20 L",
            specLabel: "Form",
            specValue: "Liquid",
            isChemical: true,
            industry: "Hospitality",
            volume: "4L",
            color: "Light Blue",
          },
          {
            name: "Stain Remover Pre-treat",
            shortDescription:
              "Enzyme-based pre-treatment spray for protein and oil stains.",
            sku: "LAU-003",
            packSize: "1 L, 5 L",
            specLabel: "Type",
            specValue: "Enzyme",
            isChemical: true,
            industry: "Healthcare",
            volume: "1L",
            color: "Clear",
          },
        ],
      },
      // ----------- Child: Dishwashing & Kitchen
      {
        name: "Dishwashing & Kitchen",
        description:
          "Warewashing liquids and kitchen degreasers for restaurants, hotels and food processors.",
        imagePath: PLACEHOLDER,
        products: [
          {
            name: "Commercial Dish Detergent",
            shortDescription:
              "Concentrated warewashing liquid; cuts grease with minimal residue.",
            sku: "KIT-001",
            packSize: "4 L, 20 L",
            specLabel: "Form",
            specValue: "Liquid",
            isChemical: true,
            industry: "Food Service",
            volume: "4L",
            color: "Green",
          },
          {
            name: "Rinse Aid",
            shortDescription:
              "Machine rinse-aid for spot-free drying in commercial dishwashers.",
            sku: "KIT-002",
            packSize: "4 L",
            specLabel: "Form",
            specValue: "Liquid",
            isChemical: true,
            industry: "Food Service",
            volume: "4L",
            color: "Clear",
          },
          {
            name: "Food-Safe Sanitiser Dip",
            shortDescription:
              "Iodine-based three-compartment sink sanitiser approved for food contact.",
            sku: "KIT-003",
            packSize: "1 L, 5 L",
            specLabel: "Active",
            specValue: "Iodine",
            isChemical: true,
            industry: "Food Service",
            volume: "1L",
            color: "Amber",
          },
        ],
      },
      // ----------- Child: Air Care
      {
        name: "Air Care",
        description:
          "Deodorisers, odour counteractants and air fresheners for restrooms, lobbies and industrial spaces.",
        imagePath: PLACEHOLDER,
        products: [
          {
            name: "Deodoriser Concentrate",
            shortDescription:
              "Long-lasting odour control for restrooms, bins and common areas.",
            sku: "AIR-001",
            packSize: "1 L, 4 L",
            specLabel: "Form",
            specValue: "Liquid",
            isChemical: true,
            industry: "Hospitality",
            volume: "1L",
            color: "Purple",
          },
          {
            name: "Odour Counteractant Spray",
            shortDescription:
              "Eliminates malodours on contact rather than masking them.",
            sku: "AIR-002",
            packSize: "750 mL",
            specLabel: "Form",
            specValue: "Spray",
            isChemical: true,
            industry: "Office",
            volume: "1L",
            color: "Clear",
          },
        ],
      },
      // ----------- Child: Specialty Chemicals
      {
        name: "Specialty Chemicals",
        description:
          "Specialty formulations including carpet cleaners, floor strippers, pool chemicals and more.",
        imagePath: PLACEHOLDER,
        products: [
          {
            name: "Carpet & Upholstery Cleaner",
            shortDescription:
              "Extraction-ready formula for carpets and soft furnishings.",
            sku: "SPC-001",
            packSize: "4 L, 20 L",
            specLabel: "Form",
            specValue: "Liquid",
            isChemical: true,
            industry: "Hospitality",
            volume: "4L",
            color: "Blue",
          },
          {
            name: "Floor Stripper",
            shortDescription:
              "Aggressive alkaline stripper that removes old wax and finish coatings.",
            sku: "SPC-002",
            packSize: "4 L, 20 L",
            specLabel: "pH",
            specValue: "13",
            isChemical: true,
            industry: "Manufacturing",
            volume: "4L",
            color: "Clear",
          },
          {
            name: "Neutral Floor Cleaner",
            shortDescription:
              "Neutral-pH daily floor cleaner safe for polished and sealed surfaces.",
            sku: "SPC-003",
            packSize: "4 L, 20 L",
            specLabel: "pH",
            specValue: "7",
            isChemical: true,
            industry: "Education",
            volume: "4L",
            color: "Green",
          },
        ],
      },
    ],
  },

  // 2. Garbage Bins
  {
    name: "Garbage Bins",
    description:
      "Commercial waste containers in a range of capacities — indoor, outdoor and recycling configurations.",
    imagePath: PLACEHOLDER,
    products: [
      {
        name: "Rubbermaid Brute Round Container (32 Gal)",
        shortDescription:
          "Heavy-duty round waste container for indoor and outdoor use.",
        sku: "BIN-001",
        packSize: "1 Unit",
        specLabel: "Capacity",
        specValue: "32 Gal",
        featured: true,
      },
      {
        name: "Slim Jim Waste Container",
        shortDescription: "Space-saving rectangular bin for tight spaces.",
        sku: "BIN-002",
        packSize: "1 Unit",
        specLabel: "Capacity",
        specValue: "23 Gal",
      },
      {
        name: "Recycling Station (3-Stream)",
        shortDescription:
          "Three-compartment recycling centre for paper, plastic and general waste.",
        sku: "BIN-003",
        packSize: "1 Unit",
        specLabel: "Streams",
        specValue: "3",
        featured: true,
      },
      {
        name: "Step-On Waste Container",
        shortDescription:
          "Foot-pedal bin for hygienic hands-free waste disposal.",
        sku: "BIN-004",
        packSize: "1 Unit",
        specLabel: "Capacity",
        specValue: "12 Gal",
      },
    ],
  },

  // 3. Garbage Bags
  {
    name: "Garbage Bags",
    description:
      "Heavy-duty liners for commercial bins — available in a range of sizes and gauges.",
    imagePath: PLACEHOLDER,
    products: [
      {
        name: "Heavy-Duty Black Bin Liners (40–45 Gal)",
        shortDescription:
          "Tear-resistant black garbage bags for large commercial bins.",
        sku: "BAG-001",
        packSize: "100 per box",
        specLabel: "Gauge",
        specValue: "2 mil",
        featured: true,
      },
      {
        name: "Medium Garbage Bags (30 Gal)",
        shortDescription: "General-purpose liners for office and light waste.",
        sku: "BAG-002",
        packSize: "200 per box",
        specLabel: "Gauge",
        specValue: "1.5 mil",
      },
      {
        name: "Kitchen Waste Bags (12–16 Gal)",
        shortDescription:
          "Compact liners for desk bins and small waste containers.",
        sku: "BAG-003",
        packSize: "500 per box",
        specLabel: "Gauge",
        specValue: "1 mil",
      },
      {
        name: "Clear Recycling Liners (40 Gal)",
        shortDescription:
          "Transparent bags to allow content verification without opening.",
        sku: "BAG-004",
        packSize: "100 per box",
        specLabel: "Gauge",
        specValue: "1.5 mil",
      },
    ],
  },

  // 4. Janitorial Supplies
  {
    name: "Janitorial Supplies",
    description:
      "Floor care, carts, mops and the everyday tools that keep facilities running.",
    imagePath: "/images/product-janitorial.jpg",
    products: [
      {
        name: "Rubbermaid Housekeeping Cart",
        shortDescription:
          "Commercial cleaning cart with organised storage and a vinyl bag.",
        sku: "JAN-001",
        packSize: "1 Unit",
        specLabel: "Material",
        specValue: "Plastic",
        featured: true,
      },
      {
        name: "Mop Bucket & Wringer (36 QT)",
        shortDescription:
          "Durable mop bucket with heavy-duty wringer and smooth-rolling casters.",
        sku: "JAN-002",
        packSize: "1 Unit",
        specLabel: "Material",
        specValue: "Plastic",
        featured: true,
      },
      {
        name: "Wet/Dry Vacuum (16 Gal)",
        shortDescription:
          "Powerful pickup for liquids and debris in any environment.",
        sku: "JAN-003",
        packSize: "1 Unit",
        specLabel: "Capacity",
        specValue: "16 Gal",
        featured: true,
      },
      {
        name: "Microfibre Wipes",
        shortDescription:
          "Lint-free cloths for streak-free cleaning and polishing.",
        sku: "JAN-004",
        packSize: "12 per pack",
        specLabel: "Colour",
        specValue: "Assorted",
      },
      {
        name: "Broom & Dustpan Set",
        shortDescription: "Durable broom paired with a lobby dustpan.",
        sku: "JAN-005",
        packSize: "1 Set",
        specLabel: "Material",
        specValue: "PP",
      },
      {
        name: "Floor Cleaning Mop (Replaceable Head)",
        shortDescription: "Replaceable-head mop for daily floor care.",
        sku: "JAN-006",
        packSize: "1 Unit",
        specLabel: "Type",
        specValue: "Wet",
      },
      {
        name: "Safety Cones & Wet-Floor Signs",
        shortDescription:
          "High-visibility hazard signage for safe work areas.",
        sku: "JAN-007",
        packSize: "1 Unit",
        specLabel: "Height",
        specValue: "28 in",
      },
    ],
  },

  // 5. Dispensers
  {
    name: "Dispensers",
    description:
      "Wall-mounted dispensers for soap, sanitiser, paper towels, tissue and more.",
    imagePath: PLACEHOLDER,
    products: [
      {
        name: "Manual Soap Dispenser (1 L)",
        shortDescription:
          "Durable ABS wall-mount dispenser for liquid soap or sanitiser.",
        sku: "DSP-001",
        packSize: "1 Unit",
        specLabel: "Capacity",
        specValue: "1 L",
        featured: true,
      },
      {
        name: "Touchless Hand Sanitiser Dispenser",
        shortDescription:
          "Sensor-activated dispenser for hands-free hygiene compliance.",
        sku: "DSP-002",
        packSize: "1 Unit",
        specLabel: "Operation",
        specValue: "Sensor",
        featured: true,
      },
      {
        name: "Multifold Towel Dispenser",
        shortDescription:
          "Wall-mount dispenser compatible with C-fold and multifold hand towels.",
        sku: "DSP-003",
        packSize: "1 Unit",
        specLabel: "Material",
        specValue: "ABS",
      },
      {
        name: "Jumbo Roll Tissue Dispenser",
        shortDescription:
          "High-capacity dispenser for jumbo-roll bathroom tissue.",
        sku: "DSP-004",
        packSize: "1 Unit",
        specLabel: "Material",
        specValue: "ABS",
      },
      {
        name: "Foam Soap Dispenser",
        shortDescription:
          "Converts liquid soap to foam — reduces consumption by up to 50 %.",
        sku: "DSP-005",
        packSize: "1 Unit",
        specLabel: "Type",
        specValue: "Foam",
      },
    ],
  },

  // 6. Personal Protection Equipment (PPE)
  {
    name: "Personal Protection Equipment (PPE)",
    description:
      "Gloves, masks, and protective wear that keep your people safe.",
    imagePath: "/images/product-ppe.jpg",
    products: [
      {
        name: "Nitrile Gloves — Black (Powder-Free)",
        shortDescription:
          "Premium powder-free nitrile gloves offering excellent protection and chemical resistance.",
        sku: "PPE-001",
        packSize: "100 per box",
        specLabel: "Size",
        specValue: "S, M, L, XL",
        featured: true,
      },
      {
        name: "Latex Gloves (Powder-Free)",
        shortDescription:
          "Comfortable, flexible disposable gloves for general-purpose use.",
        sku: "PPE-002",
        packSize: "100 per box",
        specLabel: "Size",
        specValue: "S, M, L, XL",
      },
      {
        name: "Surgical Gloves (Sterile)",
        shortDescription: "Sterile gloves for medical and clinical settings.",
        sku: "PPE-003",
        packSize: "50 pairs / box",
        specLabel: "Size",
        specValue: "6.5 – 8.0",
      },
      {
        name: "KN95 Masks",
        shortDescription:
          "High-filtration respiratory protection for everyday use.",
        sku: "PPE-004",
        packSize: "20 per box",
        specLabel: "Filtration",
        specValue: "95%",
        featured: true,
      },
      {
        name: "Surgical Masks (3-Ply)",
        shortDescription: "3-ply disposable masks with comfortable ear loops.",
        sku: "PPE-005",
        packSize: "50 per box",
        specLabel: "Ply",
        specValue: "3 Ply",
      },
      {
        name: "Isolation Gowns",
        shortDescription:
          "Fluid-resistant protective gowns for clinical environments.",
        sku: "PPE-006",
        packSize: "10 per pack",
        specLabel: "Level",
        specValue: "AAMI 2",
      },
      {
        name: "Safety Goggles",
        shortDescription:
          "Clear, anti-fog eye protection with a comfortable seal.",
        sku: "PPE-007",
        packSize: "1 Unit",
        specLabel: "Lens",
        specValue: "Anti-fog",
      },
      {
        name: "Safety & Water Boots",
        shortDescription:
          "Slip-resistant protective footwear for wet work areas.",
        sku: "PPE-008",
        packSize: "1 Pair",
        specLabel: "Size",
        specValue: "6 – 12",
      },
    ],
  },

  // 7. Paper Products
  {
    name: "Paper Products",
    description:
      "Hand towels, tissue, napkins and paper goods — so you never run out.",
    imagePath: "/images/product-paper.jpg",
    products: [
      {
        name: "Multifold Hand Towels",
        shortDescription:
          "Absorbent folded towels for washroom dispensers.",
        sku: "PPR-001",
        packSize: "16 packs / case",
        specLabel: "Sheets",
        specValue: "250 / pack",
        featured: true,
      },
      {
        name: "Jumbo Roll Tissue",
        shortDescription:
          "Long-lasting bathroom tissue for high-traffic areas.",
        sku: "PPR-002",
        packSize: "12 Rolls / Case",
        specLabel: "Ply",
        specValue: "2 Ply",
      },
      {
        name: "Bathroom Tissue (Standard Roll)",
        shortDescription: "Soft 2-ply tissue in case quantities.",
        sku: "PPR-003",
        packSize: "48 Rolls / Case",
        specLabel: "Ply",
        specValue: "2 Ply",
      },
      {
        name: "Paper Napkins",
        shortDescription: "Food-service napkins in bulk.",
        sku: "PPR-004",
        packSize: "6000 / Case",
        specLabel: "Ply",
        specValue: "1 Ply",
      },
      {
        name: "Paper Towel Roll (Kitchen)",
        shortDescription: "Absorbent 2-ply kitchen roll for food-service use.",
        sku: "PPR-005",
        packSize: "30 Rolls / Case",
        specLabel: "Ply",
        specValue: "2 Ply",
      },
    ],
  },

  // 8. Aerosols
  {
    name: "Aerosols",
    description:
      "Aerosol cleaners, disinfectants, insecticides and maintenance sprays.",
    imagePath: PLACEHOLDER,
    products: [
      {
        name: "Air Freshener Aerosol",
        shortDescription:
          "Long-lasting fragrance spray for restrooms and common areas.",
        sku: "AER-001",
        packSize: "300 mL, 12 per case",
        specLabel: "Form",
        specValue: "Aerosol",
        featured: true,
        isChemical: true,
        industry: "Hospitality",
        volume: "500ml",
        color: "N/A",
      },
      {
        name: "Insect Killer Spray",
        shortDescription:
          "Fast-acting aerosol for flying and crawling insect control.",
        sku: "AER-002",
        packSize: "400 mL, 12 per case",
        specLabel: "Form",
        specValue: "Aerosol",
        isChemical: true,
        industry: "Hospitality",
        volume: "500ml",
        color: "N/A",
      },
      {
        name: "Penetrating Oil & Lubricant Spray",
        shortDescription:
          "Multi-use lubricant for hinges, locks and mechanical components.",
        sku: "AER-003",
        packSize: "400 mL, 12 per case",
        specLabel: "Form",
        specValue: "Aerosol",
        industry: "Manufacturing",
        volume: "500ml",
        color: "N/A",
      },
      {
        name: "Surface Disinfectant Spray (Aerosol)",
        shortDescription:
          "Hospital-grade disinfectant in a convenient aerosol can.",
        sku: "AER-004",
        packSize: "350 mL, 12 per case",
        specLabel: "Form",
        specValue: "Aerosol",
        featured: true,
        isChemical: true,
        industry: "Healthcare",
        volume: "500ml",
        color: "N/A",
      },
    ],
  },

  // 9. Safety Supplies
  {
    name: "Safety Supplies",
    description:
      "First aid, spill control, hazard signage and workplace safety essentials.",
    imagePath: PLACEHOLDER,
    products: [
      {
        name: "First Aid Kit (Type I — 25 Person)",
        shortDescription:
          "ANSI-compliant kit with essentials for a 25-person workplace.",
        sku: "SAF-001",
        packSize: "1 Kit",
        specLabel: "Standard",
        specValue: "ANSI A",
        featured: true,
      },
      {
        name: "Spill Kit (Oil & Chemical)",
        shortDescription:
          "Absorbent pads, socks and disposal bags for chemical spill response.",
        sku: "SAF-002",
        packSize: "1 Kit",
        specLabel: "Coverage",
        specValue: "7 Gal",
        featured: true,
      },
      {
        name: "Safety Data Sheet Binder",
        shortDescription:
          "Pre-tabbed binder for organising WHMIS/GHS safety data sheets.",
        sku: "SAF-003",
        packSize: "1 Unit",
        specLabel: "Capacity",
        specValue: "50 sheets",
      },
      {
        name: "Eyewash Station",
        shortDescription:
          "Portable gravity-fed eyewash for immediate eye-flush response.",
        sku: "SAF-004",
        packSize: "1 Unit",
        specLabel: "Capacity",
        specValue: "16 oz",
      },
    ],
  },

  // 10. Floor Maintenance Products
  {
    name: "Floor Maintenance Products",
    description:
      "Floor waxes, polishes, strippers and pads for all floor types.",
    imagePath: PLACEHOLDER,
    products: [
      {
        name: "High-Gloss Floor Finish (Wax)",
        shortDescription:
          "Metal cross-link floor wax delivering a durable, high-shine finish.",
        sku: "FLR-001",
        packSize: "4 L, 20 L",
        specLabel: "Gloss",
        specValue: "High",
        featured: true,
        isChemical: true,
        industry: "Hospitality",
        volume: "4L",
        color: "Milky White",
      },
      {
        name: "Floor Sealer",
        shortDescription:
          "Penetrating sealer that prepares concrete and VCT before wax application.",
        sku: "FLR-002",
        packSize: "4 L, 20 L",
        specLabel: "Gloss",
        specValue: "Low",
        isChemical: true,
        industry: "Manufacturing",
        volume: "4L",
        color: "Clear",
      },
      {
        name: "Spray Buff Polish",
        shortDescription:
          "Spray-and-buff restorer that renews shine between stripping cycles.",
        sku: "FLR-003",
        packSize: "4 L",
        specLabel: "Method",
        specValue: "Spray-buff",
        isChemical: true,
        industry: "Hospitality",
        volume: "4L",
        color: "Clear",
      },
      {
        name: "Black Stripping Pads (17 in)",
        shortDescription:
          "Aggressive floor pads for stripping old wax coatings.",
        sku: "FLR-004",
        packSize: "5 per case",
        specLabel: "Diameter",
        specValue: "17 in",
      },
      {
        name: "Red Buffing Pads (17 in)",
        shortDescription:
          "Medium-duty pads for spray buffing and light scrubbing.",
        sku: "FLR-005",
        packSize: "5 per case",
        specLabel: "Diameter",
        specValue: "17 in",
      },
    ],
  },

  // 11. Consumer Products
  {
    name: "Consumer Products",
    description:
      "Retail-sized household cleaning products available in single units for everyday consumers.",
    imagePath: PLACEHOLDER,
    products: [
      {
        name: "All-Purpose Cleaner (Consumer 750 mL)",
        shortDescription:
          "Smaller retail pack of our popular all-purpose cleaner, ideal for home use.",
        sku: "CON-001",
        packSize: "750 mL",
        specLabel: "Form",
        specValue: "Liquid",
        isChemical: true,
        featured: true,
        industry: "Office",
        volume: "500ml",
        color: "Yellow",
      },
      {
        name: "Bathroom Cleaner & Descaler",
        shortDescription:
          "Removes limescale, soap scum and bathroom stains quickly.",
        sku: "CON-002",
        packSize: "750 mL",
        specLabel: "Form",
        specValue: "Gel",
        isChemical: true,
        industry: "Office",
        volume: "500ml",
        color: "Blue",
      },
      {
        name: "Dishwashing Liquid (Consumer)",
        shortDescription:
          "Gentle yet effective dish soap for hand-washing in home kitchens.",
        sku: "CON-003",
        packSize: "500 mL, 1 L",
        specLabel: "Form",
        specValue: "Liquid",
        isChemical: true,
        industry: "Office",
        volume: "500ml",
        color: "Green",
      },
      {
        name: "Glass & Window Cleaner",
        shortDescription:
          "Ammonia-free formula for streak-free glass and mirror surfaces.",
        sku: "CON-004",
        packSize: "750 mL",
        specLabel: "Form",
        specValue: "Spray",
        isChemical: true,
        industry: "Office",
        volume: "500ml",
        color: "Blue",
      },
    ],
  },

  // 12. Custom Products
  {
    name: "Custom Products",
    description:
      "Custom-formulated chemicals and private-label packaging produced to your specifications.",
    imagePath: PLACEHOLDER,
    products: [
      {
        name: "Custom Formula Development",
        shortDescription:
          "Work with our chemists to develop a proprietary cleaning or maintenance formula.",
        sku: "CUS-001",
        packSize: "MOQ 20 L",
        specLabel: "Lead Time",
        specValue: "4–6 weeks",
        featured: true,
        isChemical: true,
      },
      {
        name: "Private Label Bottling",
        shortDescription:
          "Your branding on any of our standard formulations — minimum quantities apply.",
        sku: "CUS-002",
        packSize: "MOQ 100 units",
        specLabel: "Formats",
        specValue: "500 mL – 20 L",
        featured: true,
        isChemical: true,
      },
      {
        name: "Bulk Contract Supply",
        shortDescription:
          "Recurring bulk orders with scheduled delivery and priority pricing.",
        sku: "CUS-003",
        packSize: "By agreement",
        specLabel: "Contract",
        specValue: "12 months",
        isChemical: true,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------

async function main() {
  const keepSlugs: string[] = [];
  const keepCategorySlugs: string[] = [];
  let categorySort = 0;

  for (const cat of CATEGORIES) {
    const categorySlug = slugify(cat.name);
    keepCategorySlugs.push(categorySlug);

    // Upsert the parent category (no parentId)
    const category = await db.category.upsert({
      where: { slug: categorySlug },
      update: {
        name: cat.name,
        description: cat.description,
        imagePath: cat.imagePath,
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

    // Seed products that belong directly to the parent category
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
        industry: p.industry ?? null,
        volume: p.volume ?? null,
        color: p.color ?? null,
        sortOrder: productSort,
      };
      await db.product.upsert({
        where: { slug: productSlug },
        update: data,
        create: { slug: productSlug, ...data },
      });
      productSort += 1;
    }

    // Seed child categories (chemicals subsections)
    if (cat.children) {
      let childSort = 0;
      for (const child of cat.children) {
        const childSlug = slugify(child.name);
        keepCategorySlugs.push(childSlug);

        const childCategory = await db.category.upsert({
          where: { slug: childSlug },
          update: {
            name: child.name,
            description: child.description,
            imagePath: child.imagePath,
            sortOrder: childSort,
            parentId: category.id,
          },
          create: {
            slug: childSlug,
            name: child.name,
            description: child.description,
            imagePath: child.imagePath,
            sortOrder: childSort,
            parentId: category.id,
          },
        });
        childSort += 1;

        let childProductSort = 0;
        for (const p of child.products) {
          const productSlug = slugify(p.name);
          keepSlugs.push(productSlug);
          const data = {
            name: p.name,
            categoryId: childCategory.id,
            shortDescription: p.shortDescription,
            sku: p.sku,
            packSize: p.packSize,
            specLabel: p.specLabel,
            specValue: p.specValue,
            isChemical: p.isChemical ?? false,
            sampleAvailable: p.isChemical ?? false,
            featured: p.featured ?? false,
            industry: p.industry ?? null,
            volume: p.volume ?? null,
            color: p.color ?? null,
            sortOrder: childProductSort,
          };
          await db.product.upsert({
            where: { slug: productSlug },
            update: data,
            create: { slug: productSlug, ...data },
          });
          childProductSort += 1;
        }
      }
    }
  }

  // Prune products that are no longer part of the seed set (e.g. renamed slugs).
  const removed = await db.product.deleteMany({
    where: { slug: { notIn: keepSlugs } },
  });

  // Prune stale categories (e.g. the old "Janitorial Equipment & Supplies"
  // that was split into "Janitorial Supplies" + "Dispensers"). Only delete
  // categories that are no longer in the seed set AND hold no products —
  // Product.categoryId is a required FK with no cascade, so a non-empty stale
  // category is left intact rather than throwing.
  const staleCategories = await db.category.findMany({
    where: { slug: { notIn: keepCategorySlugs } },
    select: { id: true, slug: true, _count: { select: { products: true } } },
  });
  const emptyStaleIds = staleCategories
    .filter((c) => c._count.products === 0)
    .map((c) => c.id);
  const removedCategories = emptyStaleIds.length
    ? await db.category.deleteMany({ where: { id: { in: emptyStaleIds } } })
    : { count: 0 };

  console.log(
    `Seed complete. ${keepSlugs.length} products seeded, ${removed.count} stale products removed, ${removedCategories.count} stale categories removed.`,
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
