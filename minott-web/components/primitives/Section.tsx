import { cn } from "@/lib/cn";

type Tone = "light" | "dark" | "mist" | "red" | "transparent";

const toneMap: Record<Tone, string> = {
  light: "bg-mec-pure text-mec-ink",
  dark: "bg-mec-ink text-mec-pure",
  mist: "bg-mec-mist text-mec-ink",
  red: "bg-mec-red text-mec-pure",
  transparent: "",
};

export function Section({
  children,
  tone = "light",
  className,
  id,
  pad = true,
  as: As = "section",
  ...rest
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  id?: string;
  pad?: boolean;
  as?: "section" | "div" | "article";
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "id" | "children">) {
  return (
    <As
      {...rest}
      id={id}
      className={cn(
        "relative w-full",
        pad && "py-[var(--spacing-section-y)]",
        toneMap[tone],
        className,
      )}
    >
      {children}
    </As>
  );
}
