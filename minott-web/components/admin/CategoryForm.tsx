"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { CategoryFormState } from "@/lib/actions/admin-categories";

type CategoryValues = {
  id?: number;
  name?: string;
  slug?: string;
  description?: string | null;
  imagePath?: string | null;
  sortOrder?: number;
};

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label = "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";

export function CategoryForm({
  action,
  category,
}: {
  action: (
    prevState: CategoryFormState,
    formData: FormData,
  ) => Promise<CategoryFormState>;
  category?: CategoryValues;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const c = category ?? {};
  return (
    <form action={formAction} className="max-w-xl space-y-5">
      {c.id != null && <input type="hidden" name="id" value={c.id} />}
      <label className={label}>
        Name
        <input name="name" defaultValue={c.name ?? ""} required className={field} />
      </label>
      <label className={label}>
        Slug (leave blank to auto-generate)
        <input name="slug" defaultValue={c.slug ?? ""} className={field} />
      </label>
      <label className={label}>
        Description
        <textarea
          name="description"
          defaultValue={c.description ?? ""}
          rows={3}
          className={`${field} resize-none`}
        />
      </label>
      <label className={label}>
        Image path
        <input name="imagePath" defaultValue={c.imagePath ?? ""} className={field} />
      </label>
      <label className={label}>
        Sort order
        <input
          name="sortOrder"
          type="number"
          defaultValue={c.sortOrder ?? 0}
          className={field}
        />
      </label>
      {state.error && <p className="text-sm text-mec-red">{state.error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover disabled:opacity-50"
        >
          Save Category
        </button>
        <Link
          href="/admin/categories"
          className="px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70 hover:text-mec-red"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
