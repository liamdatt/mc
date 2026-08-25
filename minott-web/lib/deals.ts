import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const DEAL_TYPE = { PERCENT: "PERCENT", CUSTOM: "CUSTOM" } as const;

/** Lightweight badge rows for listing/cart lookups. */
export type DealBadge = {
  productId: number;
  variantId: number | null;
  label: string;
  sortOrder: number;
};

/** Render a deal's badge text. The ONLY place label formatting lives. */
export function dealLabel(deal: {
  type: string;
  percentOff: number | null;
  badgeText: string | null;
}): string {
  if (deal.type === DEAL_TYPE.PERCENT && deal.percentOff != null) {
    return `${deal.percentOff}% OFF`;
  }
  return (deal.badgeText ?? "").trim();
}

/** The single "live deal" definition: active and not yet expired. */
export function liveDealWhere(now: Date = new Date()): Prisma.DealWhereInput {
  return { active: true, OR: [{ endsAt: null }, { endsAt: { gt: now } }] };
}

const cardInclude = {
  product: { include: { category: true } },
  variant: true,
} satisfies Prisma.DealInclude;

export type DealCard = Prisma.DealGetPayload<{ include: typeof cardInclude }>;

/** Top-4 live deals for the homepage, plus the total live count (for the
 *  "View all deals" threshold). Only deals on active products are shown. */
export async function getFeaturedDeals(): Promise<{
  deals: DealCard[];
  total: number;
}> {
  const where: Prisma.DealWhereInput = {
    ...liveDealWhere(),
    product: { is: { active: true } },
    AND: [{ OR: [{ variantId: null }, { variant: { is: { active: true } } }] }],
  };
  const [deals, total] = await Promise.all([
    db.deal.findMany({
      where,
      include: cardInclude,
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      take: 4,
    }),
    db.deal.count({ where }),
  ]);
  return { deals, total };
}

/** Every live deal (active products only), for the /deals page. */
export function getAllLiveDeals(): Promise<DealCard[]> {
  return db.deal.findMany({
    where: {
      ...liveDealWhere(),
      product: { is: { active: true } },
      AND: [{ OR: [{ variantId: null }, { variant: { is: { active: true } } }] }],
    },
    include: cardInclude,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
}

/** All live deals as lightweight badges, for listing/cart/submission lookups. */
export async function getLiveDealBadges(): Promise<DealBadge[]> {
  const rows = await db.deal.findMany({
    where: liveDealWhere(),
    select: {
      productId: true,
      variantId: true,
      type: true,
      percentOff: true,
      badgeText: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return rows
    .map((d) => ({
      productId: d.productId,
      variantId: d.variantId,
      label: dealLabel(d),
      sortOrder: d.sortOrder,
    }))
    .filter((b) => b.label);
}

/**
 * Badge for a product card: precedence is variant-scoped deal on any of the
 * card's SKUs first, then product-level, then lowest sortOrder (rows arrive
 * sorted, so first match wins).
 */
export function pickBadge(
  badges: DealBadge[],
  productId: number,
  variantIds: number[],
): string | null {
  const mine = badges.filter((b) => b.productId === productId);
  const variantHit = mine.find(
    (b) => b.variantId != null && variantIds.includes(b.variantId),
  );
  const hit = variantHit ?? mine.find((b) => b.variantId == null);
  return hit && hit.label ? hit.label : null;
}

/** Badge for one exact SKU (or product-level fallback). */
export function pickBadgeForVariant(
  badges: DealBadge[],
  productId: number,
  variantId: number | null,
): string | null {
  const mine = badges.filter((b) => b.productId === productId);
  const hit =
    (variantId != null &&
      mine.find((b) => b.variantId === variantId)) ||
    mine.find((b) => b.variantId == null);
  return hit && hit.label ? hit.label : null;
}
