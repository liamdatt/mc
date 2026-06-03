import type { NextRequest } from "next/server";
import { getProductsForApi } from "@/lib/products";
import { getOrigin, serializeProductCard } from "@/lib/api/serialize";
import { jsonData, enforceRateLimit } from "@/lib/api/http";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function parseBool(v: string | null): boolean | undefined {
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);

  const rawLimit = Number(searchParams.get("limit"));
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
      : DEFAULT_LIMIT;

  const products = await getProductsForApi({
    q: searchParams.get("q") ?? undefined,
    categorySlug: searchParams.get("category") ?? undefined,
    form: searchParams.get("form") ?? undefined,
    isChemical: parseBool(searchParams.get("isChemical")),
    sampleAvailable: parseBool(searchParams.get("sampleAvailable")),
    featured: parseBool(searchParams.get("featured")),
    limit,
  });

  const origin = getOrigin(req);
  return jsonData(products.map((p) => serializeProductCard(p, origin)));
}
