import { db } from "@/lib/db";
import { createDeal } from "@/lib/actions/admin-deals";
import { DealForm, type ProductOption } from "@/components/admin/DealForm";
import { requireAdminSession } from "@/lib/portal";

export default async function NewDealPage() {
  await requireAdminSession();
  const products: ProductOption[] = await db.product.findMany({
    orderBy: { name: "asc" },
    include: {
      variants: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, sku: true, label: true, size: true },
      },
    },
  });

  return (
    <div>
      <h1 className="font-display-tight text-3xl">New Deal</h1>
      <div className="mt-6">
        <DealForm action={createDeal} products={products} />
      </div>
    </div>
  );
}
