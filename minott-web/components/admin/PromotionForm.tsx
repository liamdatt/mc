"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { PromotionFormState } from "@/lib/actions/admin-promotions";
import { DEFAULT_PROMO_CTA, PROMO_LIMITS } from "@/lib/promotion-rules";

export type CategoryOption = { id: number; name: string };

export type SerializedPromotion = {
  id?: number;
  eyebrow?: string;
  title?: string;
  body?: string;
  badgeText?: string | null;
  ctaLabel?: string;
  categoryId?: number;
  startsAt?: string;
  endsAt?: string;
  active?: boolean;
};

const field =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-3 py-2 text-mec-ink outline-none focus:border-mec-red";
const label = "block text-xs font-semibold uppercase tracking-[0.1em] text-mec-ink/70";

export function PromotionForm({
  action,
  categories,
  promotion,
}: {
  action: (
    prevState: PromotionFormState,
    formData: FormData,
  ) => Promise<PromotionFormState>;
  categories: CategoryOption[];
  promotion?: SerializedPromotion;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const p = promotion ?? {};

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {p.id != null && <input type="hidden" name="id" value={p.id} />}

      <label className={label}>
        Category
        <select
          name="categoryId"
          defaultValue={p.categoryId ?? categories[0]?.id ?? ""}
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
        Eyebrow
        <input
          name="eyebrow"
          maxLength={PROMO_LIMITS.eyebrow}
          defaultValue={p.eyebrow ?? ""}
          placeholder="October Feature"
          className={field}
          required
        />
      </label>

      <label className={label}>
        Title
        <input
          name="title"
          maxLength={PROMO_LIMITS.title}
          defaultValue={p.title ?? ""}
          className={field}
          required
        />
      </label>

      <label className={label}>
        Body
        <textarea
          name="body"
          maxLength={PROMO_LIMITS.body}
          defaultValue={p.body ?? ""}
          rows={3}
          className={`${field} resize-none`}
          required
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className={label}>
          Badge (optional)
          <input
            name="badgeText"
            maxLength={PROMO_LIMITS.badgeText}
            defaultValue={p.badgeText ?? ""}
            placeholder="Save 15%"
            className={field}
          />
        </label>
        <label className={label}>
          Button label
          <input
            name="ctaLabel"
            maxLength={PROMO_LIMITS.ctaLabel}
            defaultValue={p.ctaLabel ?? ""}
            placeholder={DEFAULT_PROMO_CTA}
            className={field}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className={label}>
          Starts
          <input
            name="startsAt"
            type="date"
            defaultValue={p.startsAt ?? ""}
            className={field}
          />
        </label>
        <label className={label}>
          Ends
          <input
            name="endsAt"
            type="date"
            defaultValue={p.endsAt ?? ""}
            className={field}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={p.active ?? true} />
        Active
      </label>

      {state.error && <p className="text-sm text-mec-red">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover disabled:opacity-50"
        >
          Save Promotion
        </button>
        <Link
          href="/portal/promotions"
          className="px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink/70 hover:text-mec-red"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
