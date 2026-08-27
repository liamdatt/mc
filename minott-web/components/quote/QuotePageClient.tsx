"use client";

import { useActionState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useQuoteCart } from "@/components/quote/QuoteCartProvider";
import { submitQuote, type QuoteResult } from "@/lib/actions/inquiries";
import { INDUSTRIES } from "@/lib/industries";

const initial: QuoteResult = { ok: false };
const inputCls =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-4 py-3 text-mec-ink outline-none focus:border-mec-red";

export type QuotePortalUser = {
  name: string;
  email: string;
  companyName: string | null;
  phone: string | null;
};

/** Live deal labels keyed by variant id (exact SKU) and product id (fallback). */
export type QuoteDealLookup = {
  byVariant: Record<number, string>;
  byProduct: Record<number, string>;
};

export function QuotePageClient({
  portalUser,
  deals,
}: {
  portalUser: QuotePortalUser | null;
  deals: QuoteDealLookup;
}) {
  const { items, setQuantity, removeItem, clear } = useQuoteCart();
  const [state, formAction, pending] = useActionState(submitQuote, initial);
  const clearedRef = useRef(false);

  // Clear the cart once after a successful submission.
  useEffect(() => {
    if (state.ok && !clearedRef.current) {
      clearedRef.current = true;
      clear();
    }
  }, [state.ok, clear]);

  if (state.ok) {
    const panel = "rounded-md border border-mec-red/30 bg-mec-red/5 p-8";
    const primary =
      "mt-6 inline-block bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover";
    const secondary =
      "ml-4 mt-6 inline-block border border-mec-ink/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink transition-colors hover:border-mec-red hover:text-mec-red";

    if (state.outcome === "POTENTIAL_MATCH") {
      return (
        <div className={panel}>
          <h2 className="font-display-tight text-h2 text-mec-ink">Quote request received.</h2>
          <p className="mt-3 max-w-xl text-mec-ink/75">
            Our records suggest an MEC account may already be associated with the
            details you provided. Sign in to attach this quote to your account, or
            recover access using the MEC account number shown on your invoices.
          </p>
          <Link href="/portal/sign-in?next=/portal" className={primary}>Sign in</Link>
          <Link href={`/portal/recover?ref=${state.ref ?? ""}`} className={secondary}>Recover account</Link>
        </div>
      );
    }

    if (state.outcome === "NO_MATCH") {
      return (
        <div className={panel}>
          <h2 className="font-display-tight text-h2 text-mec-ink">Quote request received.</h2>
          <p className="mt-3 max-w-xl text-mec-ink/75">
            To open an MEC account, complete the short New Customer Form — we&apos;ve
            prefilled it from your request. Your quote stays attached while your
            application is reviewed.
          </p>
          <Link href={`/register?ref=${state.ref ?? ""}`} className={primary}>Complete New Customer Form</Link>
        </div>
      );
    }

    return (
      <div className={panel}>
        <h2 className="font-display-tight text-h2 text-mec-ink">Quote request sent.</h2>
        <p className="mt-3 max-w-xl text-mec-ink/75">
          Thanks — a sales consultant will price your list and respond within one
          business day.
        </p>
        <Link href="/products" className={primary}>Back to Products</Link>
        {portalUser && (
          <Link href="/portal/history" className={secondary}>View Quote History</Link>
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-black/10 bg-mec-pure p-8">
        <p className="text-mec-ink/70">Your quote list is empty.</p>
        <Link
          href="/products"
          className="mt-4 inline-block bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div>
      {portalUser ? (
        <p className="mb-8 rounded-md border border-mec-red/20 bg-mec-red/5 px-5 py-4 text-sm text-mec-ink/80">
          Signed in as <strong className="text-mec-ink">{portalUser.name}</strong>{" "}
          — this quote will be saved to your account history.
        </p>
      ) : (
        <p className="mb-8 rounded-md border border-black/10 bg-mec-pure px-5 py-4 text-sm text-mec-ink/70">
          Have a portal account?{" "}
          <Link
            href="/portal/sign-in?next=/quote"
            className="font-semibold text-mec-red hover:underline"
          >
            Sign in
          </Link>{" "}
          to attach this quote to your history.
        </p>
      )}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr]">
        {/* Line items */}
        <div className="space-y-4">
          {items.map((it) => {
            const deal =
              deals.byVariant[it.variantId] ?? deals.byProduct[it.productId];
            return (
              <div
                key={it.variantId}
                className="flex items-center gap-4 rounded-md border border-black/10 bg-mec-pure p-4"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-mec-mist">
                  <Image
                    src={it.imagePath}
                    alt={it.name}
                    fill
                    sizes="64px"
                    className="object-contain p-1"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${it.categorySlug}/${it.slug}`}
                    className="font-semibold text-mec-ink hover:text-mec-red"
                  >
                    {it.name}
                  </Link>
                  {it.variantLabel && (
                    <p className="mt-0.5 text-sm text-mec-ink/60">
                      {it.variantLabel}
                    </p>
                  )}
                  {deal && (
                    <span className="mt-1 inline-flex rounded-pill bg-mec-red px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-mec-pure">
                      {deal}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min={1}
                  value={it.quantity}
                  onChange={(e) =>
                    setQuantity(it.variantId, Number(e.target.value) || 1)
                  }
                  className="w-20 rounded-sm border border-black/15 px-3 py-2 text-mec-ink outline-none focus:border-mec-red"
                  aria-label={`Quantity for ${it.name}`}
                />
                <button
                  type="button"
                  onClick={() => removeItem(it.variantId)}
                  className="text-mec-ink/50 hover:text-mec-red"
                  aria-label={`Remove ${it.name}`}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Contact form */}
        <form
          action={formAction}
          className="h-fit rounded-md border border-black/10 bg-mec-pure p-6"
        >
          <input
            type="hidden"
            name="items"
            value={JSON.stringify(
              items.map((it) => ({
                productId: it.productId,
                variantId: it.variantId,
                productName: it.variantLabel
                  ? `${it.name} — ${it.variantLabel} (${it.sku})`
                  : `${it.name} (${it.sku})`,
                quantity: it.quantity,
              })),
            )}
          />
          <h2 className="font-display-tight text-h3 text-mec-ink">Your details</h2>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
            Name *
            <input name="name" required defaultValue={portalUser?.name} className={inputCls} />
          </label>
          <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
            Company{!portalUser && " *"}
            <input
              name="company"
              required={!portalUser}
              defaultValue={portalUser?.companyName ?? undefined}
              className={inputCls}
            />
          </label>
          <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
            Email *
            <input name="email" type="email" required defaultValue={portalUser?.email} className={inputCls} />
          </label>
          <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
            Phone{!portalUser && " *"}
            <input
              name="phone"
              required={!portalUser}
              defaultValue={portalUser?.phone ?? undefined}
              className={inputCls}
            />
          </label>
          {!portalUser && (
            <>
              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
                Industry *
                <select name="industry" required defaultValue="" className={inputCls}>
                  <option value="" disabled>Select your industry</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
                Location *
                <input name="location" required placeholder="e.g. Kingston" className={inputCls} />
              </label>
            </>
          )}
          <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
            Notes
            <textarea name="message" rows={3} className={`${inputCls} resize-none`} />
          </label>
          {state.error && <p className="mt-3 text-sm text-mec-red">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="mt-5 w-full bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure transition hover:bg-mec-red-hover disabled:opacity-50"
          >
            {pending ? "Sending…" : "Submit Quote Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
