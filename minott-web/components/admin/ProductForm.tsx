"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ProductFormState } from "@/lib/actions/admin-products";

type Category = { id: number; name: string };
type ProductValues = {
  id?: number;
  name?: string;
  slug?: string;
  categoryId?: number;
  shortDescription?: string | null;
  description?: string | null;
  imagePath?: string;
  sku?: string | null;
  sdsUrl?: string | null;
  isChemical?: boolean;
  sampleAvailable?: boolean;
  featured?: boolean;
  active?: boolean;
  sortOrder?: number;
};

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label = "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";

export function ProductForm({
  action,
  categories,
  product,
}: {
  action: (
    prevState: ProductFormState,
    formData: FormData,
  ) => Promise<ProductFormState>;
  categories: Category[];
  product?: ProductValues;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const p = product ?? {};
  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {p.id != null && <input type="hidden" name="id" value={p.id} />}

      <label className={label}>
        Name
        <input name="name" defaultValue={p.name ?? ""} required className={field} />
      </label>

      <label className={label}>
        Slug (leave blank to auto-generate)
        <input name="slug" defaultValue={p.slug ?? ""} className={field} />
      </label>

      <label className={label}>
        Category
        <select
          name="categoryId"
          defaultValue={p.categoryId ?? categories[0]?.id}
          className={field}
          required
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className={label}>
        Short description
        <input
          name="shortDescription"
          defaultValue={p.shortDescription ?? ""}
          className={field}
        />
      </label>

      <label className={label}>
        Full description
        <textarea
          name="description"
          defaultValue={p.description ?? ""}
          rows={4}
          className={`${field} resize-none`}
        />
      </label>

      <label className={label}>
        Image path
        <input
          name="imagePath"
          defaultValue={p.imagePath ?? "/images/product-placeholder.png"}
          className={field}
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className={label}>
          SKU
          <input name="sku" defaultValue={p.sku ?? ""} className={field} />
        </label>
        <label className={label}>
          Sort order
          <input
            name="sortOrder"
            type="number"
            defaultValue={p.sortOrder ?? 0}
            className={field}
          />
        </label>
      </div>

      <label className={label}>
        SDS URL (chemicals)
        <input name="sdsUrl" defaultValue={p.sdsUrl ?? ""} className={field} />
      </label>

      <fieldset className="grid grid-cols-2 gap-3 rounded-sm border border-black/10 p-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isChemical" defaultChecked={p.isChemical ?? false} />
          Is chemical (SDS + sample)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="sampleAvailable" defaultChecked={p.sampleAvailable ?? false} />
          Sample available
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="featured" defaultChecked={p.featured ?? false} />
          Featured
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={p.active ?? true} />
          Active (visible on site)
        </label>
      </fieldset>

      {state.error && <p className="text-sm text-mec-red">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover disabled:opacity-50"
        >
          Save Product
        </button>
        <Link
          href="/admin/products"
          className="px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70 hover:text-mec-red"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
