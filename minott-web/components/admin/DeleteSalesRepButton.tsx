"use client";

import { useActionState } from "react";
import { deleteSalesRep } from "@/lib/actions/admin-sales-reps";

const initial: { error?: string } = {};

export function DeleteSalesRepButton({
  id,
  clientCount,
}: {
  id: number;
  clientCount: number;
}) {
  const [state, action] = useActionState(deleteSalesRep, initial);
  return (
    <form
      action={action}
      className="ml-4 inline"
      onSubmit={(e) => {
        const detail =
          clientCount > 0
            ? ` ${clientCount} ${clientCount === 1 ? "company" : "companies"} will become Unassigned.`
            : "";
        if (!window.confirm(`Delete this sales rep?${detail}`))
          e.preventDefault();
      }}
    >
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
