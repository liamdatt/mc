import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateDeal } from "@/lib/actions/admin-deals";
import { DealForm, type ProductOption, type SerializedDeal } from "@/components/admin/DealForm";
import { requireAdminSession } from "@/lib/portal";

export default async function EditDealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const dealId = Number(id);
  const [deal, products] = await Promise.all([
    db.deal.findUnique({ where: { id: dealId } }),
    db.product.findMany({
      orderBy: { name: "asc" },
      include: {
        variants: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, sku: true, label: true, size: true },
        },
      },
    }) as Promise<ProductOption[]>,
  ]);
  if (!deal) notFound();

  const serialized: SerializedDeal = {
    ...deal,
    endsAt: deal.endsAt
      ? deal.endsAt.toLocaleDateString("en-CA", { timeZone: "America/Jamaica" })
      : null,
  };

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Edit Deal</h1>
      <div className="mt-6">
        <DealForm action={updateDeal} products={products} deal={serialized} />
      </div>
    </div>
  );
}
