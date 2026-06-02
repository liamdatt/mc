"use client";

import { useActionState } from "react";
import { deleteCategory } from "@/lib/actions/admin-categories";

const initial: { error?: string } = {};

export function DeleteCategoryButton({ id }: { id: number }) {
  const [state, action] = useActionState(deleteCategory, initial);
  return (
    <form action={action} className="ml-4 inline">
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-mec-ink/50 hover:text-mec-red">
        Delete
      </button>
      {state.error && (
        <span className="ml-3 text-xs text-mec-red">{state.error}</span>
      )}
    </form>
  );
}
