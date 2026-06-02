import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateProduct } from "@/lib/actions/admin-products";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id: Number(id) } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Edit Product</h1>
      <div className="mt-6">
        <ProductForm
          action={updateProduct}
          categories={categories}
          product={product}
        />
      </div>
    </div>
  );
}
