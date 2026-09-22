import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import sharp from "sharp";
import { db } from "@/lib/db";

// Excel export of the whole catalog, one row per SKU, with a thumbnail of the
// variant image (falling back to the product image) embedded in each row.
// Image paths in the DB are public URLs: admin uploads live on the data volume
// (data/uploads, see app/images/uploads/[name]/route.ts), everything else is a
// build-time asset under public/.

const THUMB_PX = 96;
const THUMB_CONCURRENCY = 8;
const ROW_PT = 76; // ≈ THUMB_PX at 96 dpi (1 px = 0.75 pt) plus padding
const UPLOAD_DIR = path.join(process.cwd(), "data/uploads");
const LEGACY_UPLOAD_DIR = path.join(process.cwd(), "public/images/uploads");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOAD_PREFIX = "/images/uploads/";

async function readImage(imagePath: string): Promise<Buffer | null> {
  const clean = imagePath.split("?")[0];
  // Reject anything that isn't a rooted, traversal-free public path.
  if (!clean.startsWith("/") || clean.includes("..")) return null;
  const candidates = clean.startsWith(UPLOAD_PREFIX)
    ? [path.join(UPLOAD_DIR, clean.slice(UPLOAD_PREFIX.length)), path.join(LEGACY_UPLOAD_DIR, clean.slice(UPLOAD_PREFIX.length))]
    : [path.join(PUBLIC_DIR, clean)];
  for (const file of candidates) {
    try {
      return await readFile(file);
    } catch {
      // try next
    }
  }
  return null;
}

/** Square PNG thumbnail — normalises every source format (incl. webp) for Excel. */
async function thumbnail(buf: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(buf)
      .resize(THUMB_PX, THUMB_PX, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

const yesNo = (v: boolean) => (v ? "Yes" : "No");

export async function buildCatalogWorkbook(): Promise<Buffer> {
  const products = await db.product.findMany({
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    include: {
      category: { select: { name: true, slug: true, parent: { select: { name: true } } } },
      variants: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
    },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Minott Equipment & Chemicals — Accounts Portal";
  wb.created = new Date();
  const ws = wb.addWorksheet("Catalog", { views: [{ state: "frozen", ySplit: 1 }] });

  ws.columns = [
    { header: "Image", key: "image", width: 15 },
    { header: "Category", key: "category", width: 24 },
    { header: "Parent category", key: "parentCategory", width: 20 },
    { header: "Product", key: "product", width: 36 },
    { header: "Product slug", key: "slug", width: 30 },
    { header: "SKU", key: "sku", width: 16 },
    { header: "Option label", key: "optionLabel", width: 14 },
    { header: "Size / option", key: "size", width: 18 },
    { header: "Pack type", key: "packType", width: 12 },
    { header: "Pack size", key: "packSize", width: 12 },
    { header: "Volume", key: "volume", width: 12 },
    { header: "Variant label", key: "label", width: 20 },
    { header: "Spec", key: "spec", width: 22 },
    { header: "Short description", key: "shortDescription", width: 40 },
    { header: "Description", key: "description", width: 60 },
    { header: "Industry", key: "industry", width: 18 },
    { header: "Color", key: "color", width: 12 },
    { header: "Chemical", key: "isChemical", width: 10 },
    { header: "SDS URL", key: "sdsUrl", width: 30 },
    { header: "Sample available", key: "sampleAvailable", width: 10 },
    { header: "Featured", key: "featured", width: 10 },
    { header: "Product active", key: "active", width: 10 },
    { header: "Variant active", key: "variantActive", width: 10 },
    { header: "Image path", key: "imagePath", width: 40 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).alignment = { vertical: "middle" };

  // One workbook image per distinct path, reused across rows. Thumbnails are
  // decoded up front with bounded concurrency — sequential sharp calls over
  // several hundred full-size PNGs take about a minute.
  const distinctPaths = new Set<string>();
  for (const p of products) {
    if (p.variants.length === 0) distinctPaths.add(p.imagePath);
    for (const v of p.variants) distinctPaths.add(v.imagePath ?? p.imagePath);
  }
  const imageIds = new Map<string, number | null>();
  const queue = [...distinctPaths];
  const worker = async () => {
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
      const raw = await readImage(next);
      const thumb = raw ? await thumbnail(raw) : null;
      // wb.addImage is synchronous bookkeeping, so calling it from parallel
      // workers is safe.
      imageIds.set(next, thumb ? wb.addImage({ buffer: thumb as unknown as ExcelJS.Buffer, extension: "png" }) : null);
    }
  };
  await Promise.all(Array.from({ length: THUMB_CONCURRENCY }, worker));
  const imageIdFor = (imagePath: string): number | null => imageIds.get(imagePath) ?? null;

  let rowIndex = 1;
  for (const p of products) {
    // Products with no SKU still get a row so the export is complete.
    const variants = p.variants.length > 0 ? p.variants : [null];
    for (const v of variants) {
      const imagePath = v?.imagePath ?? p.imagePath;
      rowIndex += 1;
      const row = ws.addRow({
        image: "",
        category: p.category.name,
        parentCategory: p.category.parent?.name ?? "",
        product: p.name,
        slug: p.slug,
        sku: v?.sku ?? "",
        optionLabel: p.optionLabel ?? "",
        size: v?.size ?? "",
        packType: v?.packType ?? "",
        packSize: v?.packSize ?? "",
        volume: v?.volume ?? "",
        label: v?.label ?? "",
        spec: v?.specLabel || v?.specValue ? [v?.specLabel, v?.specValue].filter(Boolean).join(": ") : "",
        shortDescription: p.shortDescription ?? "",
        description: p.description ?? "",
        industry: p.industry ?? "",
        color: p.color ?? "",
        isChemical: yesNo(p.isChemical),
        sdsUrl: p.sdsUrl ?? "",
        sampleAvailable: yesNo(p.sampleAvailable),
        featured: yesNo(p.featured),
        active: yesNo(p.active),
        variantActive: v ? yesNo(v.active) : "",
        imagePath,
      });
      row.height = ROW_PT;
      row.alignment = { vertical: "middle", wrapText: true };

      const imageId = imageIdFor(imagePath);
      if (imageId !== null) {
        // Anchor the picture inside the Image cell (0-based col/row); a small
        // offset keeps it off the gridlines.
        ws.addImage(imageId, {
          tl: { col: 0.08, row: rowIndex - 1 + 0.04 },
          ext: { width: THUMB_PX, height: THUMB_PX },
          editAs: "oneCell",
        });
      }
    }
  }

  ws.autoFilter = { from: { row: 1, column: 2 }, to: { row: 1, column: ws.columns.length } };
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

export function catalogExportFilename(now = new Date()): string {
  const stamp = now.toISOString().slice(0, 10);
  return `mec-catalog-${stamp}.xlsx`;
}
