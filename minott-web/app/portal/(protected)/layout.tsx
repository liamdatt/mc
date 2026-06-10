import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/primitives/Container";
import { SignOutButton } from "@/components/portal/SignOutButton";
import { getPortalSession } from "@/lib/portal";

const NAV = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/history", label: "History" },
  { href: "/portal/profile", label: "Profile" },
  { href: "/products", label: "Browse products" },
  { href: "/quote", label: "Start a quote" },
];

/**
 * Gate for the customer portal. Mirrors the admin (protected) layout pattern:
 * the session is verified server-side and unauthenticated visitors are
 * redirected to sign-in. Portal gating lives here (a server layout) rather than
 * in proxy.ts, which owns only the shared-password admin gate.
 */
export default async function PortalProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/sign-in");

  return (
    // pt-24 clears the fixed site nav; the portal's own navigation renders as
    // in-page tabs below it rather than a second site-wide bar.
    <div className="min-h-screen bg-mec-mist pt-24 text-mec-ink">
      <Container className="pb-[var(--spacing-section-y)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-mec-ink/10 pb-4 pt-6">
          <nav
            aria-label="Customer portal"
            className="flex flex-wrap items-center gap-1"
          >
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-pill px-3.5 py-1.5 text-sm font-semibold text-mec-ink/70 transition-colors hover:bg-mec-pure hover:text-mec-ink"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <SignOutButton />
        </div>
        <div className="pt-12">{children}</div>
      </Container>
    </div>
  );
}
