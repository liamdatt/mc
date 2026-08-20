import Link from "next/link";
import { db } from "@/lib/db";
import { DeleteCategoryButton } from "@/components/admin/DeleteCategoryButton";
import { requireAdminSession } from "@/lib/portal";

export default async function AdminCategoriesPage() {
  await requireAdminSession();
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display-tight text-3xl">Categories</h1>
        <Link
          href="/portal/categories/new"
          className="bg-mec-red px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover"
        >
          + New Category
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-black/5">
                <td className="px-4 py-3 font-semibold">{c.name}</td>
                <td className="px-4 py-3 text-mec-ink/70">
                  {c._count.products}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/portal/categories/${c.id}/edit`}
                    className="font-semibold text-mec-red hover:underline"
                  >
                    Edit
                  </Link>
                  <DeleteCategoryButton id={c.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
