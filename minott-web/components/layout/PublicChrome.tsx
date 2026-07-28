"use client";
import { usePathname } from "next/navigation";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";

type CategoryLink = { slug: string; name: string };

export function PublicChrome({
  categories,
  children,
}: {
  categories: CategoryLink[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // The admin and sales portals render their own chrome; the preview lock
  // screen renders bare.
  const isBareChrome =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/sales") ||
    pathname === "/preview";
  if (isBareChrome) return <>{children}</>;
  // The home route is a single non-scrollable screen — no footer below the fold.
  const isLanding = pathname === "/";
  return (
    <>
      <Nav categories={categories} />
      <main id="main">{children}</main>
      {!isLanding && <Footer />}
    </>
  );
}
