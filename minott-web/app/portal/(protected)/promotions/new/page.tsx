import { createPromotion } from "@/lib/actions/admin-promotions";
import { PromotionForm } from "@/components/admin/PromotionForm";
import { getPromotionCategoryOptions } from "@/lib/promotion-categories";
import { requireAdminSession } from "@/lib/portal";

export default async function NewPromotionPage() {
  await requireAdminSession();
  const categories = await getPromotionCategoryOptions();

  return (
    <div>
      <h1 className="font-display-tight text-3xl">New Promotion</h1>
      <div className="mt-6">
        <PromotionForm action={createPromotion} categories={categories} />
      </div>
    </div>
  );
}
