"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

export function NavSearch({
  className,
  inputClassName,
  onSubmitted,
  alwaysOpen = false,
}: {
  className?: string;
  inputClassName?: string;
  onSubmitted?: () => void;
  alwaysOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(alwaysOpen);
  const [term, setTerm] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);

  const close = (returnFocus = false) => {
    if (alwaysOpen) return;
    refocus.current = returnFocus;
    setOpen(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = term.trim();
    if (!t) return;
    router.push("/products/all?q=" + encodeURIComponent(t));
    onSubmitted?.();
  };

  if (!open) {
    return (
      <button
        ref={(el) => {
          buttonRef.current = el;
          if (el && refocus.current) {
            refocus.current = false;
            el.focus();
          }
        }}
        type="button"
        aria-label="Search products"
        onClick={() => setOpen(true)}
        className={cn(
          "grid h-9 w-9 place-items-center text-mec-ink transition-colors hover:text-mec-red",
          className,
        )}
      >
        <Search className="h-[18px] w-[18px]" aria-hidden />
      </button>
    );
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className={cn("relative flex items-center", className)}
    >
      <Search
        className="pointer-events-none absolute left-3 h-4 w-4 text-mec-ink/60"
        aria-hidden
      />
      <input
        autoFocus={!alwaysOpen}
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onBlur={() => {
          if (!term.trim()) close();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            if (alwaysOpen) setTerm("");
            else if (!term.trim()) close(true);
            else setTerm("");
          }
        }}
        aria-label="Search products"
        placeholder="Search products"
        className={cn(
          "h-9 w-32 rounded-sm xl:w-56 border border-black/15 bg-mec-pure pl-9 pr-3 text-sm normal-case tracking-normal text-mec-ink outline-none placeholder:text-mec-ink/40 focus:border-mec-red",
          inputClassName,
        )}
      />
    </form>
  );
}
