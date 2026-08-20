import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal";
import { getSalesSession } from "@/lib/sales";
import { AdminCustomersView } from "./AdminCustomersView";
import { RepCustomersView } from "./RepCustomersView";

/**
 * The one route two roles share: admins manage/provision all customers, reps
 * see their own book of business. Branches on role; everyone else goes to
 * their dashboard.
 */
export default async function PortalCustomersPage() {
  const session = await getPortalSession();
  if (session?.user.role === "admin") return <AdminCustomersView />;
  if (session?.user.role === "rep") {
    const sales = await getSalesSession();
    if (sales) return <RepCustomersView repId={sales.rep.id} />;
  }
  redirect("/portal");
}
