import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Uploaded images live in a dir SEPARATE from the git-committed product images
// (public/images/products), so a deploy can mount a persistent volume here
// without masking the committed catalog images.
const UPLOAD_DIR = path.join(process.cwd(), "public/images/uploads");
const PUBLIC_PREFIX = "/images/uploads";
const MAX_BYTES = 6 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySession(process.env.SESSION_SECRET ?? "", token, "admin"))) {
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

  revalidatePath("/admin/products");
  revalidatePath("/products");
  return Response.json({ path: imagePath });
}
