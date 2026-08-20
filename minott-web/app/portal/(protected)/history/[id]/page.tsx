import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import {
  ReorderButton,
  ReorderItemButton,
} from "@/components/portal/ReorderButton";
import type { QuoteItem } from "@/components/quote/QuoteCartProvider";
import { getPortalSession, getUserInquiryById } from "@/lib/portal";
import {
  INQUIRY_STATUS_LABELS,
  INQUIRY_TYPE,
  INQUIRY_TYPE_LABELS,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Request detail | Minott Equipment & Chemicals",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-JM", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function PortalHistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/sign-in");
  if (session.user.role !== "customer") redirect("/portal");

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) notFound();

  // Ownership is enforced inside getUserInquiryById (returns null if not owned).
  const inquiry = await getUserInquiryById(session.user.id, numId);
  if (!inquiry) notFound();

  // A line item is reorderable only when its product still exists and is active
  // AND it has a live, active variant. Without a live variant we can't build a
  // valid variant-keyed cart entry.
  type LineItem = NonNullable<
    Awaited<ReturnType<typeof getUserInquiryById>>
  >["items"][number];
  function toQuoteItem(it: LineItem): QuoteItem | null {
    if (!it.product || !it.product.active) return null;
    if (!it.variant?.active) return null; // no live variant → can't build a valid variant-keyed cart entry
    return {
      productId: it.product.id,
      variantId: it.variant.id,
      slug: it.product.slug,
      name: it.product.name,
      sku: it.variant.sku,
      variantLabel: it.variant.label ?? "",
      imagePath: it.variant.imagePath ?? it.product.imagePath,
      categorySlug: it.product.category.slug,
      quantity: it.quantity,
    };
  }

  // Only line items whose product (and variant, if any) is still live are reorderable.
  const reorderItems: QuoteItem[] = inquiry.items
    .map(toQuoteItem)
    .filter((q): q is QuoteItem => q !== null);

  const isQuote = inquiry.type === INQUIRY_TYPE.QUOTE;

  return (
    <div>
      <RevealOnScroll>
        <Link
          href="/portal/history"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-mec-ink/60 hover:text-mec-red"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Back to history
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>
              {INQUIRY_TYPE_LABELS[inquiry.type] ?? inquiry.type}
            </Eyebrow>
            <h1 className="mt-4 font-display-tight text-4xl leading-none tracking-tight md:text-5xl">
              Request{" "}
              <span className="font-mono text-3xl md:text-4xl">
                #{String(inquiry.id).padStart(5, "0")}
              </span>
            </h1>
            <p className="mt-3 text-mec-ink/65">
              Submitted {formatDate(inquiry.createdAt)}
            </p>
          </div>
          <span className="rounded-pill border border-mec-ink/15 px-4 py-1.5 text-sm font-semibold text-mec-ink/70">
            {INQUIRY_STATUS_LABELS[inquiry.status] ?? inquiry.status}
          </span>
        </div>
      </RevealOnScroll>

      {/* Sample request: single product */}
      {inquiry.type === INQUIRY_TYPE.SAMPLE && inquiry.product && (
        <RevealOnScroll delay={0.05} className="mt-8">
          <div className="rounded-md border border-mec-ink/10 bg-mec-pure p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-mec-ink/50">
              Sample requested
            </p>
            <Link
              href={`/products/${inquiry.product.category.slug}/${inquiry.product.slug}`}
              className="mt-2 inline-block font-display-tight text-2xl tracking-tight hover:text-mec-red"
            >
              {inquiry.product.name}
            </Link>
          </div>
        </RevealOnScroll>
      )}

      {/* Quote: line items + reorder */}
      {isQuote && (
        <RevealOnScroll delay={0.05} className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display-tight text-2xl tracking-tight">
              Line items
            </h2>
            {reorderItems.length > 0 && <ReorderButton items={reorderItems} />}
          </div>

          {inquiry.items.length === 0 ? (
            <p className="mt-4 text-mec-ink/60">
              This quote has no recorded line items.
            </p>
          ) : (
            <ul className="mt-5 divide-y divide-mec-ink/10 overflow-hidden rounded-md border border-mec-ink/10 bg-mec-pure">
              {inquiry.items.map((it) => {
                const productLive = Boolean(it.product && it.product.active);
                const reorderItem = toQuoteItem(it);
                const variantLabel = it.variant?.label ?? it.variant?.size;
                return (
                  <li
                    key={it.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {productLive ? (
                          <Link
                            href={`/products/${it.product!.category.slug}/${it.product!.slug}`}
                            className="hover:text-mec-red"
                          >
                            {it.product!.name}
                          </Link>
                        ) : (
                          <span title="This product is no longer in the catalog">
                            {it.productName}
                          </span>
                        )}
                      </p>
                      {productLive && variantLabel && (
                        <p className="mt-0.5 text-xs text-mec-ink/55">
                          {variantLabel}
                        </p>
                      )}
                      {!reorderItem && (
                        <p className="mt-0.5 text-xs text-mec-ink/50">
                          No longer available
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm text-mec-ink/70">
                        Qty {it.quantity}
                      </span>
                      {reorderItem && <ReorderItemButton item={reorderItem} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {inquiry.items.length > 0 && reorderItems.length === 0 && (
            <p className="mt-4 text-sm text-mec-ink/55">
              None of these products are currently available to reorder.
            </p>
          )}
        </RevealOnScroll>
      )}

      {/* Message (any type) */}
      {inquiry.message && (
        <RevealOnScroll delay={0.1} className="mt-8">
          <h2 className="font-display-tight text-2xl tracking-tight">Message</h2>
          <p className="mt-3 whitespace-pre-line rounded-md border border-mec-ink/10 bg-mec-pure p-5 text-mec-ink/80">
            {inquiry.message}
          </p>
        </RevealOnScroll>
      )}
    </div>
  );
}
