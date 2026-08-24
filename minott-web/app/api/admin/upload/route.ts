import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getPortalSession } from "@/lib/portal";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Uploaded images go on the persisted data volume (alongside the SQLite file),
// NOT under public/ — `next start` only serves public/ assets that existed at
// build time, and the container filesystem is wiped on every redeploy. The
// route handler at app/images/uploads/[name] serves them back under the same
// public URL prefix, so imagePath values in the DB stay valid.
const UPLOAD_DIR = path.join(process.cwd(), "data/uploads");
const PUBLIC_PREFIX = "/images/uploads";
const MAX_BYTES = 6 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: Request) {
  const session = await getPortalSession();
  if (session?.user.role !== "admin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }
  const ext = EXT[file.type];
  if (!ext) {
    return Response.json(
      { error: "Only PNG, JPG, WEBP or GIF images are allowed." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Image must be under 6 MB." }, { status: 400 });
  }

  const productId = Number(form.get("productId")) || null;
  const variantId = Number(form.get("variantId")) || null;
  if (!productId && !variantId) {
    return Response.json({ error: "Missing upload target." }, { status: 400 });
  }

  const name = `${randomUUID()}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  const imagePath = `${PUBLIC_PREFIX}/${name}`;

  try {
    if (variantId) {
      await db.productVariant.update({ where: { id: variantId }, data: { imagePath } });
    } else if (productId) {
      await db.product.update({ where: { id: productId }, data: { imagePath } });
    }
  } catch {
    return Response.json({ error: "Target not found." }, { status: 404 });
  }

  revalidatePath("/portal/products");
  revalidatePath("/products");
  return Response.json({ path: imagePath });
}
