import type { NextRequest } from "next/server";
import { getProductForApi } from "@/lib/products";
import { getOrigin, serializeProductDetail } from "@/lib/api/serialize";
import { jsonData, jsonError, enforceRateLimit } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;

  const { slug } = await params;
  const product = await getProductForApi(slug);
  if (!product) {
    return jsonError("not_found", "No product with that slug.", 404);
  }

  const origin = getOrigin(req);
  return jsonData(serializeProductDetail(product, origin));
}
