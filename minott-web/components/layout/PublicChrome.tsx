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
  const isAdmin = pathname.startsWith("/admin");
  if (isAdmin) return <>{children}</>;
  return (
    <>
      <Nav categories={categories} />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
