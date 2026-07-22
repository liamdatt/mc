"use client";

import { useActionState, useRef, useEffect } from "react";
import { addQuoteNote, type QuoteActionState } from "@/lib/actions/sales";

export function AddNoteForm({ inquiryId }: { inquiryId: number }) {
  const [state, formAction, pending] = useActionState<QuoteActionState, FormData>(addQuoteNote, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={formAction} className="space-y-3">
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <textarea name="body" rows={3} required placeholder="Add a note about this quote…" className="w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-sm text-mec-ink outline-none focus:border-mec-red" />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-sm bg-mec-ink px-4 py-2 text-sm font-semibold uppercase tracking-[0.1em] text-mec-pure hover:bg-mec-graphite disabled:opacity-50">
          {pending ? "Adding…" : "Add note"}
        </button>
        {state.error && <span role="alert" className="text-sm text-mec-red">{state.error}</span>}
      </div>
    </form>
  );
}
