import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateProduct } from "@/lib/actions/admin-products";
import { ProductForm } from "@/components/admin/ProductForm";
import { VariantManager } from "@/components/admin/VariantManager";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  const [product, categories, variants, allListings] = await Promise.all([
    db.product.findUnique({ where: { id: productId } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.productVariant.findMany({
      where: { productId },
      orderBy: { sortOrder: "asc" },
    }),
    db.product.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
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
      <VariantManager
        listing={{ id: product.id, name: product.name }}
        variants={variants}
        allListings={allListings}
      />
    </div>
  );
}
