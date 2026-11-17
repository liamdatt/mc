import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updatePromotion } from "@/lib/actions/admin-promotions";
import {
  PromotionForm,
  type SerializedPromotion,
} from "@/components/admin/PromotionForm";
import { getPromotionCategoryOptions } from "@/lib/promotion-categories";
import { toDateInput } from "@/lib/promotion-rules";
import { requireAdminSession } from "@/lib/portal";

export default async function EditPromotionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const promoId = Number(id);
  if (!Number.isInteger(promoId)) notFound();
  const [promo, categories] = await Promise.all([
    db.promotion.findUnique({ where: { id: promoId } }),
    getPromotionCategoryOptions(),
  ]);
  if (!promo) notFound();

  const serialized: SerializedPromotion = {
    id: promo.id,
    eyebrow: promo.eyebrow,
    title: promo.title,
    body: promo.body,
    badgeText: promo.badgeText,
    ctaLabel: promo.ctaLabel,
    categoryId: promo.categoryId,
    startsAt: toDateInput(promo.startsAt),
    endsAt: toDateInput(promo.endsAt),
    active: promo.active,
  };

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Edit Promotion</h1>
      <div className="mt-6">
        <PromotionForm
          action={updatePromotion}
          categories={categories}
          promotion={serialized}
        />
      </div>
    </div>
  );
}
