import { cn } from "@/lib/cn";

export function Eyebrow({
  children,
  tone = "red",
  className,
}: {
  children: React.ReactNode;
  tone?: "red" | "ink" | "white";
  className?: string;
}) {
  const color =
    tone === "red"
      ? "text-mec-red"
      : tone === "white"
        ? "text-mec-pure/80"
        : "text-mec-ink/70";
  return (
    <span className={cn("eyebrow inline-flex items-center", color, className)}>
      <span
        aria-hidden
        className={cn(
          "mr-3 h-px w-8",
          tone === "red"
            ? "bg-mec-red"
            : tone === "white"
              ? "bg-mec-pure/60"
              : "bg-mec-ink/40",
        )}
      />
      {children}
    </span>
  );
}
