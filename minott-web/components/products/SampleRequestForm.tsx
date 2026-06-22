"use client";

import { useActionState } from "react";
import { submitSample, type InquiryResult } from "@/lib/actions/inquiries";

const initial: InquiryResult = { ok: false };
const inputCls =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-4 py-2.5 text-mec-ink outline-none focus:border-mec-red";

type SampleVariant = {
  id: number;
  sku: string;
  label: string | null;
  size: string | null;
};

export function SampleRequestForm({
  productId,
  productName,
  selectedVariant,
}: {
  productId: number;
  productName: string;
  /** The variant currently chosen via the size/pack pills — the sample is for this one. */
  selectedVariant: SampleVariant;
}) {
  const [state, formAction, pending] = useActionState(submitSample, initial);
  const variantLabel =
    selectedVariant.label || selectedVariant.size || selectedVariant.sku;

  if (state.ok) {
    return (
      <p className="rounded-sm border border-mec-red/30 bg-mec-red/5 p-4 text-sm text-mec-ink">
        Sample request received for <strong>{productName}</strong>. We&apos;ll be
        in touch within one business day.
      </p>
    );
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="variantId" value={selectedVariant.id} />
      <p className="text-sm text-mec-ink/70 sm:col-span-2">
        Sample for: <strong className="text-mec-ink">{variantLabel}</strong>{" "}
        <span className="font-mono text-xs text-mec-ink/50">({selectedVariant.sku})</span>
      </p>
      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
        Name *
        <input name="name" required className={inputCls} />
      </label>
      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
        Company
        <input name="company" className={inputCls} />
      </label>
      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
        Email *
        <input name="email" type="email" required className={inputCls} />
      </label>
      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
        Phone
        <input name="phone" className={inputCls} />
      </label>
      {state.error && (
        <p className="text-sm text-mec-red sm:col-span-2">{state.error}</p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-mec-ink px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure transition hover:bg-mec-graphite disabled:opacity-50"
        >
          {pending ? "Sending…" : "Request Sample"}
        </button>
      </div>
    </form>
  );
}
