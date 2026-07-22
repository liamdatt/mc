import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/primitives/Container";
import { SalesSignOutButton } from "@/components/sales/SalesSignOutButton";
import { getSalesSession } from "@/lib/sales";
import { getPortalSession } from "@/lib/portal";

const NAV = [
  { href: "/sales", label: "Dashboard" },
  { href: "/sales/customers", label: "My customers" },
  { href: "/sales/quotes", label: "Quotes" },
];

/**
 * Gate for the sales-rep portal. Mirrors the customer portal layout: the rep
 * session is verified server-side (valid session + role="rep" + active rep) and
 * everyone else is redirected to sign-in.
 */
export default async function SalesProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sales = await getSalesSession();
  if (!sales) {
    // A signed-in customer belongs in their own portal, not the rep sign-in.
    const session = await getPortalSession();
    if (session?.user.role === "customer") redirect("/portal");
    redirect("/sales/sign-in");
  }

  return (
    <div className="min-h-screen bg-mec-mist pt-8 text-mec-ink">
      <Container className="pb-[var(--spacing-section-y)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-mec-ink/10 pb-4 pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-display-tight text-lg tracking-tight">
              <span className="text-mec-red">MEC</span> Sales
            </span>
            <nav aria-label="Sales portal" className="flex flex-wrap items-center gap-1">
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
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-mec-ink/60 sm:inline">{sales.rep.name}</span>
            <SalesSignOutButton />
          </div>
        </div>
        <div className="pt-10">{children}</div>
      </Container>
    </div>
  );
}
