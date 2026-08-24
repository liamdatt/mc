"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { DealFormState } from "@/lib/actions/admin-deals";

// Inlined rather than imported from "@/lib/deals" — that module pulls in the
// Prisma client (server-only, native module), which breaks the client bundle.
const DEAL_TYPE = { PERCENT: "PERCENT", CUSTOM: "CUSTOM" } as const;

export type ProductOption = {
  id: number;
  name: string;
  variants: { id: number; sku: string; label: string | null; size: string | null }[];
};

export type SerializedDeal = {
  id?: number;
  type?: string;
  percentOff?: number | null;
  badgeText?: string | null;
  description?: string | null;
  productId?: number;
  variantId?: number | null;
  active?: boolean;
  endsAt?: string | null;
  sortOrder?: number;
};

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label = "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";

export function DealForm({
  action,
  products,
  deal,
}: {
  action: (
    prevState: DealFormState,
    formData: FormData,
  ) => Promise<DealFormState>;
  products: ProductOption[];
  deal?: SerializedDeal;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const d = deal ?? {};
  const [productId, setProductId] = useState(
    d.productId ?? products[0]?.id ?? 0,
  );
  const [variantId, setVariantId] = useState(d.variantId ?? null);
  const [type, setType] = useState(d.type === DEAL_TYPE.CUSTOM ? DEAL_TYPE.CUSTOM : DEAL_TYPE.PERCENT);

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {d.id != null && <input type="hidden" name="id" value={d.id} />}

      <label className={label}>
        Product
        <select
          name="productId"
          value={productId}
          onChange={(e) => {
            setProductId(Number(e.target.value));
            setVariantId(null);
          }}
          className={field}
          required
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label className={label}>
        SKU
        <select
          name="variantId"
          value={variantId ?? ""}
          onChange={(e) => setVariantId(e.target.value ? Number(e.target.value) : null)}
          className={field}
        >
          <option value="">Whole product — all SKUs</option>
          {selectedProduct?.variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.sku} — {v.label ?? v.size}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <span className={label}>Type</span>
        <div className="mt-2 flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="type"
              value={DEAL_TYPE.PERCENT}
              checked={type === DEAL_TYPE.PERCENT}
              onChange={() => setType(DEAL_TYPE.PERCENT)}
            />
            Percent off
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="type"
              value={DEAL_TYPE.CUSTOM}
              checked={type === DEAL_TYPE.CUSTOM}
              onChange={() => setType(DEAL_TYPE.CUSTOM)}
            />
            Custom badge
          </label>
        </div>
      </fieldset>

      {type === DEAL_TYPE.PERCENT ? (
        <label className={label}>
          Percent off
          <input
            name="percentOff"
            type="number"
            min={1}
            max={99}
            defaultValue={d.percentOff ?? ""}
            className={field}
          />
        </label>
      ) : (
        <label className={label}>
          Badge text
          <input
            name="badgeText"
            maxLength={40}
            placeholder="BUY 1 GET 1 FREE"
            defaultValue={d.badgeText ?? ""}
            className={field}
          />
        </label>
      )}

      <label className={label}>
        Description
        <textarea
          name="description"
          defaultValue={d.description ?? ""}
          rows={3}
          className={`${field} resize-none`}
          placeholder="Falls back to the product's short description"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className={label}>
          Ends
          <input
            name="endsAt"
            type="date"
            defaultValue={d.endsAt ?? ""}
            className={field}
          />
        </label>
        <label className={label}>
          Sort order
          <input
            name="sortOrder"
            type="number"
            defaultValue={d.sortOrder ?? 0}
            className={field}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={d.active ?? true} />
        Active
      </label>

      {state.error && <p className="text-sm text-mec-red">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover disabled:opacity-50"
        >
          Save Deal
        </button>
        <Link
          href="/portal/deals"
          className="px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70 hover:text-mec-red"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
