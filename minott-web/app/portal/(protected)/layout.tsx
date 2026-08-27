import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/primitives/Container";
import { SignOutButton } from "@/components/portal/SignOutButton";
import { getPortalSession } from "@/lib/portal";

type NavItem = { href: string; label: string };

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  admin: [
    { href: "/portal", label: "Dashboard" },
    { href: "/portal/analytics", label: "Analytics" },
    { href: "/portal/products", label: "Products" },
    { href: "/portal/categories", label: "Categories" },
    { href: "/portal/deals", label: "Deals" },
    { href: "/portal/requests", label: "Requests" },
    { href: "/portal/applications", label: "Applications" },
    { href: "/portal/customers", label: "Customers" },
    { href: "/portal/sales-reps", label: "Sales Reps" },
    { href: "/portal/admins", label: "Admins" },
    { href: "/portal/settings", label: "Settings" },
  ],
  rep: [
    { href: "/portal", label: "Dashboard" },
    { href: "/portal/customers", label: "My customers" },
    { href: "/portal/quotes", label: "Quotes" },
  ],
  ar: [
    { href: "/portal", label: "Dashboard" },
    { href: "/portal/applications", label: "Applications" },
  ],
  customer: [
    { href: "/portal", label: "Dashboard" },
    { href: "/portal/history", label: "History" },
    { href: "/portal/profile", label: "Profile" },
    { href: "/products", label: "Browse products" },
    { href: "/quote", label: "Start a quote" },
  ],
};

/**
 * Gate for the unified Accounts Portal: signed-in only. Role-specific access
 * is enforced per-page (wrong-role visitors are redirected to /portal, their
 * own dashboard) — the layout only decides "has a session at all" and which
 * nav to draw.
 */
export default async function PortalProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/sign-in");
  const nav = NAV_BY_ROLE[session.user.role ?? "customer"] ?? NAV_BY_ROLE.customer;

  return (
    // pt-24 clears the fixed site nav; the portal's own navigation renders as
    // in-page tabs below it rather than a second site-wide bar.
    <div className="min-h-screen bg-mec-mist pt-24 text-mec-ink">
      <Container className="pb-[var(--spacing-section-y)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-mec-ink/10 pb-4 pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-display-tight text-lg tracking-tight">
              <span className="text-mec-red">MEC</span> Portal
            </span>
            <nav
              aria-label="Accounts portal"
              className="flex flex-wrap items-center gap-1"
            >
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-pill px-3.5 py-1.5 text-sm font-semibold text-mec-ink/70 transition-colors hover:bg-mec-pure hover:text-mec-ink"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-mec-ink/60 sm:inline">
              {session.user.name}
            </span>
            <SignOutButton />
          </div>
        </div>
        <div className="pt-12">{children}</div>
      </Container>
    </div>
  );
}
