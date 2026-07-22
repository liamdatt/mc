"use client";

import { LogOut } from "lucide-react";
import { salesSignOut } from "@/lib/actions/sales-auth";

export function SalesSignOutButton() {
  return (
    <form action={salesSignOut}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-pill border border-mec-ink/15 px-4 py-2 text-sm font-semibold text-mec-ink/70 transition-colors hover:border-mec-red hover:text-mec-red"
      >
        <LogOut aria-hidden className="h-4 w-4" />
        Sign out
      </button>
    </form>
  );
}
