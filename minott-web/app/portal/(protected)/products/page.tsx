import Link from "next/link";
import { db } from "@/lib/db";
import { deleteProduct } from "@/lib/actions/admin-products";
import { requireAdminSession } from "@/lib/portal";

const UNSORTED_SLUG = "unsorted-imports";

type Row = {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  featured: boolean;
  isChemical: boolean;
  category: { name: string };
  _count: { variants: number };
};

function ProductRow({ p }: { p: Row }) {
  return (
    <tr className="border-b border-black/5">
      <td className="px-4 py-3 font-semibold">{p.name}</td>
      <td className="px-4 py-3 text-mec-ink/70">{p.category.name}</td>
      <td className="px-4 py-3 text-mec-ink/70">{p._count.variants}</td>
      <td className="px-4 py-3 text-xs text-mec-ink/60">
        {[
          p.active ? "active" : "hidden",
          p.featured ? "featured" : null,
          p.isChemical ? "chemical" : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/portal/products/${p.id}/edit`}
          className="font-semibold text-mec-red hover:underline"
        >
          Edit
        </Link>
        <form action={deleteProduct} className="ml-4 inline">
          <input type="hidden" name="id" value={p.id} />
          <button type="submit" className="text-mec-ink/50 hover:text-mec-red">
            Delete
          </button>
        </form>
      </td>
    </tr>
  );
}

export default async function AdminProductsPage() {
  await requireAdminSession();
  const products = (await db.product.findMany({
    orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
    include: { category: true, _count: { select: { variants: true } } },
  })) as Row[];

  const unsorted = products.find((p) => p.slug === UNSORTED_SLUG);
  const rest = products.filter((p) => p.slug !== UNSORTED_SLUG);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display-tight text-3xl">Products</h1>
        <Link
          href="/portal/products/new"
          className="bg-mec-red px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover"
        >
          + New Product
        </Link>
      </div>

      {unsorted && unsorted._count.variants > 0 && (
        <div className="mt-6 rounded-md border border-mec-red/40 bg-mec-red/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="inline-block rounded-sm bg-mec-red px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.1em] text-mec-pure">
                {unsorted._count.variants} unsorted SKU
                {unsorted._count.variants === 1 ? "" : "s"}
              </span>
              <p className="mt-2 text-sm text-mec-ink/70">
                Newly imported SKUs are parked in “Unsorted Imports”. Open it to
                merge each into the right listing or split it into its own.
              </p>
            </div>
            <Link
              href={`/portal/products/${unsorted.id}/edit`}
              className="shrink-0 font-semibold text-mec-red hover:underline"
            >
              Sort them →
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mec-mist text-xs uppercase tracking-[0.1em] text-mec-ink/60">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Variants</th>
              <th className="px-4 py-3">Flags</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rest.map((p) => (
              <ProductRow key={p.id} p={p} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
