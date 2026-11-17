import { Fragment } from "react";
import { BRAND_SLOTS } from "@/components/sections/BrandWordmarks";

// Static partner strip under the hero: a label on the left and the three
// distributor wordmarks spread across one row (stacked grid below lg).
export function TrustBar() {
  return (
    <section
      id="trust"
      aria-label="Trusted distribution partners"
      className="relative border-b border-mec-ink/10 bg-mec-pure"
    >
      <div className="mx-auto w-full max-w-[1440px] px-6 py-5 md:px-10 lg:flex lg:h-[88px] lg:items-center lg:gap-10 lg:py-0">
        <p className="mx-auto max-w-[14ch] border-l-2 border-mec-red pl-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-mec-ink/70 lg:mx-0 lg:shrink-0">
          Trusted Distribution Partners
        </p>

        {/* Below lg: three-column grid, no dividers */}
        <ul className="mt-4 grid grid-cols-3 items-center gap-4 lg:hidden">
          {BRAND_SLOTS.map(({ name, Wordmark }) => (
            <li
              key={name}
              className="flex items-center justify-center [&_img]:max-h-7 [&_img]:max-w-full"
            >
              <Wordmark />
            </li>
          ))}
        </ul>

        {/* From lg: one row, spread, with hairline dividers */}
        <ul className="hidden flex-1 items-center justify-around lg:flex">
          {BRAND_SLOTS.map(({ name, Wordmark }, i) => (
            <Fragment key={name}>
              {i > 0 && (
                <li aria-hidden className="h-6 w-px bg-mec-ink/15" />
              )}
              <li className="flex items-center justify-center [&_img]:max-h-10">
                <Wordmark />
              </li>
            </Fragment>
          ))}
        </ul>
      </div>
    </section>
  );
}
