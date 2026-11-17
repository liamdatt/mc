import Image from "next/image";

/**
 * Mats listing promo (`/products/all?category=mats`): explains the custom-logo
 * option offered on every mat's detail page. Server component, no motion.
 */
export function CustomLogoBanner({ className }: { className?: string }) {
  return (
    <aside
      aria-labelledby="custom-logo-banner-title"
      className={`relative isolate flex flex-col overflow-hidden rounded-2xl bg-mec-ink text-mec-pure md:min-h-[300px] md:flex-row ${className ?? ""}`}
    >
      {/* Photo: a top strip on mobile, the right ~60% (under a fade) from md up. */}
      <div className="relative h-44 w-full shrink-0 sm:h-56 md:absolute md:inset-y-0 md:right-0 md:h-auto md:w-[62%]">
        <Image
          src="/images/mats-custom-logo.jpg"
          alt="A black entrance mat printed with the Minott Equipment & Chemicals logo"
          fill
          sizes="(min-width: 1024px) 560px, (min-width: 768px) 62vw, 100vw"
          className="object-cover object-[70%_60%]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-mec-ink via-mec-ink/20 to-transparent md:bg-gradient-to-r md:from-mec-ink md:via-mec-ink/40 md:to-transparent"
        />
      </div>

      <div className="relative z-10 px-6 pb-7 pt-2 md:max-w-[56%] md:py-10 md:pl-10 md:pr-0">
        <div className="border-l-2 border-mec-red pl-4">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-mec-pure/80">
            Custom Logo Mats
          </p>
          <h2
            id="custom-logo-banner-title"
            className="mt-2 font-body text-3xl font-bold leading-tight md:text-4xl"
          >
            Add Your Logo
          </h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-mec-pure/85 md:text-[15px]">
          Select a mat, click &ldquo;Add to Quote,&rdquo; and upload your logo
          image. A member of our sales team will review your request and get
          back to you with pricing, artwork confirmation, and lead time.
        </p>
      </div>
    </aside>
  );
}
