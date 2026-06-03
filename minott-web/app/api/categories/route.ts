import type { NextRequest } from "next/server";
import { getCategoriesForApi } from "@/lib/products";
import { getOrigin, serializeCategory } from "@/lib/api/serialize";
import { jsonData, enforceRateLimit } from "@/lib/api/http";

// Prisma reads are not auto-dynamic; force per-request rendering so the catalog
// stays in sync with admin edits (matches the site-wide convention).
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;

  const origin = getOrigin(req);
  const categories = await getCategoriesForApi();
  return jsonData(categories.map((c) => serializeCategory(c, origin)));
}
