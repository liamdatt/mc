import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
  border = "ink",
}: {
  children: React.ReactNode;
  className?: string;
  border?: "ink" | "white" | "none";
}) {
  const borderCls =
    border === "white"
      ? "border border-white/10 hover:border-white/30"
      : border === "ink"
        ? "border border-mec-ink/10 hover:border-mec-ink/30"
        : "";
  return (
    <div
      className={cn(
        "group relative rounded-md p-8 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-2 hover:shadow-[0_24px_48px_-12px_rgba(225,6,0,0.18)]",
        borderCls,
        className,
      )}
    >
      {children}
    </div>
  );
}
