"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/primitives/Button";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/cn";
import type { PromoSlide } from "@/lib/promotions";

const INTERVAL_MS = 6000;

// Admin-managed promotion card (mockup: text left, packshot right, red SAVE
// badge). Several live promotions crossfade every 6 s. All slides share one
// grid cell, so the card height is the tallest slide's and never shifts.
// Rotation pauses on hover/focus and while the tab is hidden; reduced motion
// gets no timer and no fade (dots still work).
export function PromotionCarousel({ slides }: { slides: PromoSlide[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const count = slides.length;
  const active = count > 0 ? index % count : 0;
  const autoplay = !reduced && count >= 2;

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);

  useEffect(() => {
    if (!autoplay || paused) return;
    let id: number | undefined;
    const start = () => {
      if (id === undefined && document.visibilityState === "visible") {
        id = window.setInterval(next, INTERVAL_MS);
      }
    };
    const stop = () => {
      if (id !== undefined) window.clearInterval(id);
      id = undefined;
    };
    const onVisibility = () =>
      document.visibilityState === "hidden" ? stop() : start();
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [autoplay, paused, next, active]);

  if (count === 0) return null;

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Current promotions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        // Stay paused only while keyboard focus is inside (a clicked dot keeps
        // focus but isn't :focus-visible).
        const el = document.activeElement;
        const keyboardFocusInside =
          !!el && !!rootRef.current?.contains(el) && el.matches(":focus-visible");
        if (!keyboardFocusInside) setPaused(false);
      }}
      onFocus={(e) => {
        // Pause for keyboard focus only — a mouse click on a dot also focuses
        // it, and that must not stop rotation indefinitely.
        if ((e.target as Element).matches(":focus-visible")) setPaused(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(rootRef.current?.matches(":hover") ?? false);
        }
      }}
    >
      <div className="grid [&>*]:col-start-1 [&>*]:row-start-1">
        {slides.map((slide, i) => {
          const isActive = i === active;
          return (
            <article
              key={slide.id}
              aria-roledescription="slide"
              aria-label={`${slide.title} (${i + 1} of ${count})`}
              aria-hidden={!isActive}
              inert={!isActive}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr] overflow-hidden rounded-md bg-mec-pure shadow-card sm:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)] sm:grid-rows-none lg:min-h-[300px]",
                !reduced && "transition-opacity duration-500 ease-out",
                isActive ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              {/* Mobile: text top-aligned under the image and the CTA pinned to the
                  bottom, so every slide's button sits at the same spot even
                  though the shared cell takes the tallest slide's height. */}
              <div className="flex flex-col justify-start p-6 sm:justify-center sm:p-8">
                <p className="eyebrow inline-flex items-center text-mec-ink/60">
                  <span aria-hidden className="mr-3 h-px w-8 shrink-0 bg-mec-red" />
                  {slide.eyebrow}
                </p>
                <h3
                  className={cn(
                    "mt-3 font-display-tight uppercase leading-[0.92] text-mec-ink",
                    // Long admin titles step down so the shared card height stays compact.
                    slide.title.length > 34
                      ? "text-[clamp(1.75rem,2.3vw,2.25rem)]"
                      : "text-[clamp(2rem,3vw,3rem)]",
                  )}
                >
                  {slide.title}
                </h3>
                <p className="mt-3 text-sm leading-snug text-mec-ink/70">
                  {slide.body}
                </p>
                <span aria-hidden className="max-sm:flex-1" />
                <Button
                  href={slide.href}
                  arrow
                  className="mt-6 max-w-full self-start !whitespace-normal !px-5 !py-3 text-left !text-[12px]"
                >
                  {slide.ctaLabel}
                </Button>
              </div>

              <div className="relative order-first aspect-[16/10] min-h-[200px] w-full border-b border-mec-ink/10 bg-mec-pure sm:order-none sm:aspect-auto sm:border-b-0 sm:border-l">
                <Image
                  src={slide.imagePath}
                  alt=""
                  fill
                  sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                  className="object-contain p-6"
                />
                {slide.badgeText && <Badge text={slide.badgeText} />}
              </div>
            </article>
          );
        })}
      </div>

      {count >= 2 && (
        <div className="mt-4 flex justify-center gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Show promotion ${i + 1} of ${count}`}
              aria-current={i === active}
              onClick={() => setIndex(i)}
              className="grid h-6 w-6 place-items-center"
            >
              <span
                aria-hidden
                className={cn(
                  "block h-2 rounded-full transition-all duration-200",
                  i === active ? "w-6 bg-mec-red" : "w-2 bg-mec-ink/25 hover:bg-mec-ink/50",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ text }: { text: string }) {
  const save = /^save\s+(.+)$/i.exec(text.trim());
  return (
    <span className="absolute right-4 top-4 grid h-24 w-24 place-items-center rounded-full bg-mec-red p-2 text-center text-mec-pure ring-4 ring-mec-pure">
      {save ? (
        <span className="leading-none">
          <span className="block text-[11px] font-bold tracking-[0.12em]">
            SAVE
          </span>
          <span
            className={cn(
              "block font-display",
              save[1].length > 4 ? "text-[1.35rem]" : "text-[2.25rem]",
            )}
          >
            {save[1]}
          </span>
        </span>
      ) : (
        <span className="font-display text-[1.25rem] uppercase leading-[0.95] break-words">
          {text}
        </span>
      )}
    </span>
  );
}
