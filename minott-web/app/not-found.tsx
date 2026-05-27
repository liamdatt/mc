import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-[80svh] place-items-center bg-mec-ink px-6 text-center text-mec-pure">
      <div className="max-w-xl">
        <p className="eyebrow text-mec-red">Error 404</p>
        <h1 className="mt-6 font-display-tight text-[clamp(4rem,12vw,9rem)] leading-[0.92]">
          Wrong aisle.
        </h1>
        <p className="mt-6 text-mec-pure/70">
          The page you&apos;re looking for isn&apos;t on this shelf. Let&apos;s
          get you back to clean.
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-mec-red underline-offset-4 hover:underline"
          data-cursor="Home"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
