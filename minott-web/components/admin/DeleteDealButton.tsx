"use client";

import { deleteDeal } from "@/lib/actions/admin-deals";

export function DeleteDealButton({ id }: { id: number }) {
  return (
    <form
      action={deleteDeal}
      className="ml-4 inline"
      onSubmit={(e) => {
        if (!confirm("Delete this deal?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-mec-ink/50 hover:text-mec-red">
        Delete
      </button>
    </form>
  );
}
