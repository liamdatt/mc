"use client";
import { useLenis } from "lenis/react";
import { Button } from "@/components/primitives/Button";

// Primary button that scrolls to the homepage #deals section through Lenis.
// #deals carries scroll-mt-20 for the 80px fixed nav; Lenis's scrollTo already
// subtracts the target's scroll-margin-top, so no extra offset is passed (an
// offset of -80 would double it). When Lenis is bypassed (reduced motion) it
// falls back to scrollIntoView, which honours the same scroll margin.
// If #deals isn't on the page the plain anchor behaves normally.
export function DealsAnchorButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const lenis = useLenis();
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("deals");
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo("#deals");
    else target.scrollIntoView({ block: "start" });
  };
  return (
    <Button
      href="#deals"
      variant="primary"
      arrow
      className={className}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
