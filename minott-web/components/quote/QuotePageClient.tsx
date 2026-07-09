"use client";

import { useActionState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useQuoteCart } from "@/components/quote/QuoteCartProvider";
import { submitQuote, type InquiryResult } from "@/lib/actions/inquiries";

const initial: InquiryResult = { ok: false };
const inputCls =
  "mt-1 w-full rounded-sm border border-black/15 bg-mec-pure px-4 py-3 text-mec-ink outline-none focus:border-mec-red";

export type QuotePortalUser = {
  name: string;
  email: string;
  companyName: string | null;
  phone: string | null;
};

export function QuotePageClient({
  portalUser,
}: {
  portalUser: QuotePortalUser | null;
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
    return (
      <div className="rounded-md border border-mec-red/30 bg-mec-red/5 p-8">
        <h2 className="font-display-tight text-h2 text-mec-ink">
          Quote request sent.
        </h2>
        <p className="mt-3 max-w-xl text-mec-ink/75">
          Thanks — a sales consultant will price your list and respond within one
          business day.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block bg-mec-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-pure hover:bg-mec-red-hover"
        >
          Back to Products
        </Link>
        {portalUser && (
          <Link
            href="/portal/history"
            className="ml-4 mt-6 inline-block border border-mec-ink/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-mec-ink transition-colors hover:border-mec-red hover:text-mec-red"
          >
            View Quote History
          </Link>
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
          {items.map((it) => (
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
          ))}
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
            Company
            <input name="company" defaultValue={portalUser?.companyName ?? undefined} className={inputCls} />
          </label>
          <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
            Email *
            <input name="email" type="email" required defaultValue={portalUser?.email} className={inputCls} />
          </label>
          <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/70">
            Phone
            <input name="phone" defaultValue={portalUser?.phone ?? undefined} className={inputCls} />
          </label>
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
