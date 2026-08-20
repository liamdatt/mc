import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal";
import { getSalesSession } from "@/lib/sales";
import { AdminCustomerEditView } from "./AdminCustomerEditView";
import { RepCustomerDetailView } from "./RepCustomerDetailView";

/**
 * Same role branch as the customers list: admins edit any portal customer,
 * reps view/edit one of their own (ownership-checked, notFound() if not
 * theirs). Everyone else goes to their dashboard.
 */
export default async function PortalCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getPortalSession();
  if (session?.user.role === "admin") return <AdminCustomerEditView id={id} />;
  if (session?.user.role === "rep") {
    const sales = await getSalesSession();
    if (sales) return <RepCustomerDetailView repId={sales.rep.id} id={id} />;
  }
  redirect("/portal");
}
