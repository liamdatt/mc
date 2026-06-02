import { createCategory } from "@/lib/actions/admin-categories";
import { CategoryForm } from "@/components/admin/CategoryForm";

export default function NewCategoryPage() {
  return (
    <div>
      <h1 className="font-display-tight text-3xl">New Category</h1>
      <div className="mt-6">
        <CategoryForm action={createCategory} />
      </div>
    </div>
  );
}
