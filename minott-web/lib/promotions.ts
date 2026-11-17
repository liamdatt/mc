import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const PLACEHOLDER_IMAGE = "/images/product-placeholder.png";

/** The single "live promotion" definition: active, started, not yet expired. */
export function livePromotionWhere(now: Date = new Date()): Prisma.PromotionWhereInput {
  return {
    active: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
    ],
  };
}

export type PromoSlide = {
  id: number;
  eyebrow: string;
  title: string;
  body: string;
  badgeText: string | null;
  ctaLabel: string;
  href: string;
  imagePath: string;
};

// cache(): dedupe per request across homepage consumers.
export const getLivePromotions = cache(async function getLivePromotions(): Promise<PromoSlide[]> {
  const rows = await db.promotion.findMany({
    where: livePromotionWhere(),
    include: { category: { select: { slug: true, imagePath: true } } },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return rows.map((p) => ({
    id: p.id,
    eyebrow: p.eyebrow,
    title: p.title,
    body: p.body,
    badgeText: p.badgeText,
    ctaLabel: p.ctaLabel,
    // Link straight to the final URL (/products/[category] only redirects here).
    href: `/products/all?category=${p.category.slug}`,
    imagePath: p.category.imagePath ?? PLACEHOLDER_IMAGE,
  }));
});
