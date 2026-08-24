import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { getPortalSession } from "@/lib/portal";
import { getSalesSession } from "@/lib/sales";
import { AdminCompanyView } from "./AdminCompanyView";
import { RepCompanyDetailView } from "./RepCompanyDetailView";

/**
 * Same role branch as the companies list: admins manage any company, reps
 * view/edit one of their own (ownership-checked, notFound() if not theirs).
 * The [id] segment is the numeric Company.id.
 */
export default async function PortalCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const companyId = Number(id);
  if (!Number.isInteger(companyId)) notFound();

  const session = await getPortalSession();
  if (session?.user.role === "admin") return <AdminCompanyView id={companyId} />;
  if (session?.user.role === "rep") {
    const sales = await getSalesSession();
    if (sales) return <RepCompanyDetailView repId={sales.rep.id} companyId={companyId} />;
  }
  redirect("/portal");
}
