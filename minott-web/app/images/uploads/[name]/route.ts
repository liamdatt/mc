import { readFile } from "node:fs/promises";
import path from "node:path";

// Admin-uploaded images live on the persisted data volume (data/uploads), not
// in public/ — `next start` only serves public/ assets that existed at build
// time, so runtime uploads must go through a route handler. The public URL
// prefix (/images/uploads) is kept so imagePath values in the DB stay valid.
export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "data/uploads");
// Pre-fix uploads landed in public/; serve any that still exist on disk.
const LEGACY_DIR = path.join(process.cwd(), "public/images/uploads");

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

// Filenames are always `${randomUUID()}.${ext}` from the upload route.
const NAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|gif)$/;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const match = NAME_RE.exec(name);
  if (!match) {
    return new Response("Not found", { status: 404 });
  }

  let file: Buffer;
  try {
    file = await readFile(path.join(UPLOAD_DIR, name));
  } catch {
    try {
      file = await readFile(path.join(LEGACY_DIR, name));
    } catch {
      // DB rows can reference uploads lost to a pre-fix redeploy; degrade to
      // the placeholder (temporary redirect — the file may be re-uploaded).
      return Response.redirect(
        new URL("/images/product-placeholder.png", req.url),
        302,
      );
    }
  }

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": MIME[match[1]],
      // Filenames are content-unique UUIDs; replacing an image mints a new URL.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
