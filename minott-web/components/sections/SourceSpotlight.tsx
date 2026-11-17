import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Cog, FlaskConical } from "lucide-react";
import { DealsAnchorButton } from "@/components/sections/DealsAnchorButton";
import { dealLabel, DEAL_TYPE, getSpotlightDeal } from "@/lib/deals";
import { cn } from "@/lib/cn";

const PILLARS = [
  {
    icon: FlaskConical,
    title: "Chemicals",
    body: "Locally manufactured and certified by the Bureau of Standards, as well as imported solutions.",
  },
  {
    icon: Cog,
    title: "Equipment",
    body: "World-class brands and budget-friendly, reliable options.",
  },
];

// "#1 Source" intro beside a promo card for the top live deal. With no live
// deal, the left column renders alone. No prices, ever.
export async function SourceSpotlight() {
  const deal = await getSpotlightDeal();

  return (
    <section className="relative bg-mec-mist pb-16 pt-10 text-mec-ink md:pb-20">
      <div className="mx-auto w-full max-w-[1440px] px-6 md:px-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14">
          <div className={cn(!deal && "max-w-3xl")}>
            <p className="eyebrow text-mec-red">
              Cleaner Spaces. Healthier People.
            </p>
            <h2 className="mt-3 max-w-[18ch] font-display-tight text-[clamp(2.25rem,3.6vw,3.5rem)] uppercase leading-[0.95] text-mec-ink">
              Your #1 Source for All Your Cleaning Solutions.
            </h2>

            <ul className="mt-8 grid gap-6 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-mec-ink/15">
              {PILLARS.map(({ icon: Icon, title, body }, i) => (
                <li
                  key={title}
                  className={cn("flex gap-4", i === 0 ? "sm:pr-8" : "sm:pl-8")}
                >
                  <Icon
                    aria-hidden
                    strokeWidth={1.5}
                    className="h-10 w-10 shrink-0 text-mec-red"
                  />
                  <div>
                    <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-mec-ink">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm leading-snug text-mec-ink/70">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <Link
              href="/products"
              data-cursor="View"
              className="group mt-8 inline-flex items-center gap-2 border-b border-mec-red pb-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-mec-red"
            >
              Explore Our Products
              <ArrowRight
                aria-hidden
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
          </div>

          {deal && <PromoCard deal={deal} />}
        </div>
      </div>
    </section>
  );
}

function PromoCard({
  deal,
}: {
  deal: NonNullable<Awaited<ReturnType<typeof getSpotlightDeal>>>;
}) {
  const imagePath = deal.variant?.imagePath ?? deal.product.imagePath;
  const copy = deal.description ?? deal.product.shortDescription;
  const isPercent = deal.type === DEAL_TYPE.PERCENT && deal.percentOff != null;
  const label = dealLabel(deal);

  return (
    <article className="grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-md bg-mec-pure shadow-card sm:grid-cols-[1fr_1.1fr] lg:min-h-[300px]">
      <div className="flex flex-col justify-center p-6 sm:p-8">
        <p className="eyebrow inline-flex items-center text-mec-ink/60">
          <span aria-hidden className="mr-3 h-px w-8 bg-mec-red" />
          Featured Offer
        </p>
        <h3 className="mt-4 line-clamp-3 font-display-tight text-[clamp(2rem,3vw,3rem)] uppercase leading-[0.95] text-mec-ink">
          {deal.product.name}
        </h3>
        {copy && (
          <p className="mt-3 line-clamp-2 text-sm text-mec-ink/70">{copy}</p>
        )}
        <DealsAnchorButton className="mt-6 self-start !px-5 !py-3 !text-[12px]">
          Shop the Promotions
        </DealsAnchorButton>
      </div>

      <div className="relative order-first aspect-[16/10] min-h-[220px] w-full border-b border-mec-ink/10 bg-mec-pure sm:order-none sm:aspect-auto sm:border-b-0 sm:border-l">
        <Image
          src={imagePath}
          alt=""
          fill
          sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
          className="object-contain p-6"
        />
        {isPercent ? (
          <span className="absolute right-4 top-4 grid h-24 w-24 place-items-center rounded-full bg-mec-red text-center text-mec-pure ring-4 ring-mec-pure">
            <span className="leading-none">
              <span className="block text-[11px] font-bold tracking-[0.12em]">
                SAVE
              </span>
              <span className="block font-display text-[2.25rem]">
                {deal.percentOff}%
              </span>
            </span>
          </span>
        ) : (
          label && (
            <span className="absolute right-4 top-4 rounded-pill bg-mec-red px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-mec-pure">
              {label}
            </span>
          )
        )}
      </div>
    </article>
  );
}
