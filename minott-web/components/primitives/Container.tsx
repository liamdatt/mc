import { cn } from "@/lib/cn";

export function Container({
  children,
  className,
  bleed = false,
}: {
  children: React.ReactNode;
  className?: string;
  bleed?: boolean;
}) {
  return (
    <div
      className={cn(
        bleed ? "w-full" : "mx-auto w-full max-w-[1280px] px-6 md:px-10",
        className,
      )}
    >
      {children}
    </div>
  );
}
