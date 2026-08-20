import { db } from "@/lib/db";
import { createProduct } from "@/lib/actions/admin-products";
import { ProductForm } from "@/components/admin/ProductForm";
import { requireAdminSession } from "@/lib/portal";

export default async function NewProductPage() {
  await requireAdminSession();
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <h1 className="font-display-tight text-3xl">New Product</h1>
      <div className="mt-6">
        <ProductForm action={createProduct} categories={categories} />
      </div>
    </div>
  );
}
