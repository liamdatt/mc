import type { Metadata } from "next";
import { getPortalSession, getUserCompany } from "@/lib/portal";
import { getSalesSession } from "@/lib/sales";
import { AdminDashboard } from "@/components/portal/dashboards/AdminDashboard";
import { ArDashboard } from "@/components/portal/dashboards/ArDashboard";
import { RepDashboard } from "@/components/portal/dashboards/RepDashboard";
import { CustomerDashboard } from "@/components/portal/dashboards/CustomerDashboard";

export const metadata: Metadata = {
  title: "Accounts Portal | Minott Equipment & Chemicals",
  description:
    "Your Minott Equipment & Chemicals accounts portal dashboard.",
};

export default async function PortalDashboardPage() {
  // Layout guarantees a session; re-read it here for the role branch.
  const session = await getPortalSession();
  if (!session) return null;

  if (session.user.role === "admin") return <AdminDashboard />;

  if (session.user.role === "ar") return <ArDashboard />;

  if (session.user.role === "rep") {
    const sales = await getSalesSession();
    if (!sales) {
      // Rep account whose SalesRep record is missing/inactive: nothing
      // privileged to show, but don't dead-end them on an error page.
      return (
        <div>
          <h1 className="font-display-tight text-3xl">Account inactive</h1>
          <p className="mt-3 text-sm text-mec-ink/65">
            Your sales access has been deactivated. Contact an administrator
            if you believe this is a mistake.
          </p>
        </div>
      );
    }
    return <RepDashboard rep={sales.rep} />;
  }

  const company = await getUserCompany(session.user.id);
  return (
    <CustomerDashboard
      scope={{ userId: session.user.id, companyId: company?.id ?? null }}
      userName={session.user.name}
      companyName={company?.name}
    />
  );
}
