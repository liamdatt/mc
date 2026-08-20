import { createCategory } from "@/lib/actions/admin-categories";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { requireAdminSession } from "@/lib/portal";

export default async function NewCategoryPage() {
  await requireAdminSession();
  return (
    <div>
      <h1 className="font-display-tight text-3xl">New Category</h1>
      <div className="mt-6">
        <CategoryForm action={createCategory} />
      </div>
    </div>
  );
}
