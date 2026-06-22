"use client";

import { useActionState } from "react";
import {
  updateVariant,
  createVariant,
  deleteVariant,
  reassignVariant,
  splitVariantToNewListing,
  type VariantFormState,
} from "@/lib/actions/admin-variants";

type Variant = {
  id: number;
  sku: string;
  size: string | null;
  packType: string;
  label: string | null;
  active: boolean;
  sortOrder: number;
};

type ListingRef = { id: number; name: string };

const initial: VariantFormState = {};

const field =
  "w-full rounded-sm border border-black/15 bg-mec-pure px-2 py-1.5 text-sm text-mec-ink outline-none focus:border-mec-red";
const colHead =
  "px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-mec-ink/50";

function VariantRow({
  variant,
  otherListings,
}: {
  variant: Variant;
  otherListings: ListingRef[];
}) {
  const [editState, editAction, editPending] = useActionState(
    updateVariant,
    initial,
  );

  return (
    <>
      <tr className="border-b border-black/5 align-top">
        <td className="px-2 py-2">
          <form
            id={`edit-${variant.id}`}
            action={editAction}
            className="contents"
          >
            <input type="hidden" name="id" value={variant.id} />
            <input
              name="sku"
              defaultValue={variant.sku}
              required
              className={field}
            />
          </form>
        </td>
        <td className="px-2 py-2">
          <input
            form={`edit-${variant.id}`}
            name="size"
            defaultValue={variant.size ?? ""}
            className={field}
          />
        </td>
        <td className="px-2 py-2">
          <input
            form={`edit-${variant.id}`}
            name="label"
            defaultValue={variant.label ?? ""}
            className={field}
          />
        </td>
        <td className="px-2 py-2">
          <select
            form={`edit-${variant.id}`}
            name="packType"
            defaultValue={variant.packType}
            className={field}
          >
            <option value="Each">Each</option>
            <option value="Case">Case</option>
          </select>
        </td>
        <td className="px-2 py-2">
          <input
            form={`edit-${variant.id}`}
            name="sortOrder"
            type="number"
            defaultValue={variant.sortOrder}
            className={`${field} w-16`}
          />
        </td>
        <td className="px-2 py-2 text-center">
          <input
            form={`edit-${variant.id}`}
            type="checkbox"
            name="active"
            defaultChecked={variant.active}
          />
        </td>
        <td className="px-2 py-2 whitespace-nowrap">
          <button
            form={`edit-${variant.id}`}
            type="submit"
            disabled={editPending}
            className="text-xs font-semibold text-mec-red hover:underline disabled:opacity-50"
          >
            Save
          </button>
          <form action={deleteVariant} className="ml-3 inline">
            <input type="hidden" name="id" value={variant.id} />
            <button
              type="submit"
              className="text-xs text-mec-ink/50 hover:text-mec-red"
            >
              Delete
            </button>
          </form>
        </td>
      </tr>
      <tr className="border-b border-black/10 bg-mec-mist/40">
        <td colSpan={7} className="px-2 py-2">
          {editState.error && (
            <span className="mr-4 text-xs text-mec-red">{editState.error}</span>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <form action={reassignVariant} className="flex items-center gap-2">
              <input type="hidden" name="variantId" value={variant.id} />
              <select
                name="targetProductId"
                defaultValue=""
                required
                className={`${field} max-w-[18rem]`}
              >
                <option value="" disabled>
                  Move to listing…
                </option>
                {otherListings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="text-xs font-semibold text-mec-ink/70 hover:text-mec-red"
              >
                Move
              </button>
            </form>
            <form action={splitVariantToNewListing} className="inline">
              <input type="hidden" name="variantId" value={variant.id} />
              <button
                type="submit"
                className="text-xs font-semibold text-mec-ink/70 hover:text-mec-red"
              >
                Split out →
              </button>
            </form>
          </div>
        </td>
      </tr>
    </>
  );
}

function AddVariantRow({ productId }: { productId: number }) {
  const [state, action, pending] = useActionState(createVariant, initial);
  return (
    <tr className="border-t-2 border-black/10 bg-mec-mist/60 align-top">
      <td className="px-2 py-2">
        <form id="add-variant" action={action} className="contents">
          <input type="hidden" name="productId" value={productId} />
          <input
            name="sku"
            placeholder="SKU (required)"
            required
            className={field}
          />
        </form>
      </td>
      <td className="px-2 py-2">
        <input
          form="add-variant"
          name="size"
          placeholder="size"
          className={field}
        />
      </td>
      <td className="px-2 py-2">
        <input
          form="add-variant"
          name="label"
          placeholder="label"
          className={field}
        />
      </td>
      <td className="px-2 py-2">
        <select
          form="add-variant"
          name="packType"
          defaultValue="Each"
          className={field}
        >
          <option value="Each">Each</option>
          <option value="Case">Case</option>
        </select>
      </td>
      <td className="px-2 py-2" colSpan={2}>
        {state.error && (
          <span className="text-xs text-mec-red">{state.error}</span>
        )}
      </td>
      <td className="px-2 py-2">
        <button
          form="add-variant"
          type="submit"
          disabled={pending}
          className="text-xs font-semibold text-mec-red hover:underline disabled:opacity-50"
        >
          + Add
        </button>
      </td>
    </tr>
  );
}

export function VariantManager({
  listing,
  variants,
  allListings,
}: {
  listing: { id: number; name: string };
  variants: Variant[];
  allListings: ListingRef[];
}) {
  const otherListings = allListings.filter((l) => l.id !== listing.id);

  return (
    <section className="mt-10">
      <h2 className="font-display-tight text-2xl">Variants (SKUs)</h2>
      <p className="mt-1 text-sm text-mec-ink/60">
        Each row is a purchasable SKU under this listing. Move merges a SKU into
        another listing; Split out creates a new listing from a SKU.
      </p>

      <div className="mt-4 overflow-x-auto rounded-md border border-black/10 bg-mec-pure">
        <table className="w-full text-left">
          <thead className="border-b border-black/10 bg-mec-mist">
            <tr>
              <th className={colHead}>SKU</th>
              <th className={colHead}>Size</th>
              <th className={colHead}>Label</th>
              <th className={colHead}>Pack</th>
              <th className={colHead}>Order</th>
              <th className={colHead}>Active</th>
              <th className={colHead} />
            </tr>
          </thead>
          <tbody>
            {variants.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-sm text-mec-ink/50"
                >
                  No variants yet. Add one below.
                </td>
              </tr>
            )}
            {variants.map((v) => (
              <VariantRow
                key={v.id}
                variant={v}
                otherListings={otherListings}
              />
            ))}
            <AddVariantRow productId={listing.id} />
          </tbody>
        </table>
      </div>
    </section>
  );
}
