import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateCategory } from "@/lib/actions/admin-categories";
import { CategoryForm } from "@/components/admin/CategoryForm";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await db.category.findUnique({ where: { id: Number(id) } });
  if (!category) notFound();

  return (
    <div>
      <h1 className="font-display-tight text-3xl">Edit Category</h1>
      <div className="mt-6">
        <CategoryForm action={updateCategory} category={category} />
      </div>
    </div>
  );
}
