import { getPortalSession } from "@/lib/portal";
import { getRepQuoteById, getSalesSession } from "@/lib/sales";
import { db } from "@/lib/db";
import { readLogo } from "@/lib/quote-logos";

// Staff-only view of a customer-uploaded custom mat logo. Files live on the
// private data volume (lib/quote-logos.ts), so this handler is the only way to
// reach them. Admins may open any logo; reps only those on quotes for their own
// assigned companies (same scoping as /portal/quotes/[id]). Everyone else —
// customers, anonymous, unknown item/inquiry, missing file — gets a 404.
export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await getPortalSession();
  if (!session) return notFound();
  const role = session.user.role ?? "";

  const { id, itemId } = await params;
  const inquiryId = Number(id);
  const lineId = Number(itemId);
  if (!Number.isInteger(inquiryId) || !Number.isInteger(lineId)) return notFound();

  if (role === "rep") {
    const sales = await getSalesSession();
    if (!sales || !(await getRepQuoteById(sales.rep.id, inquiryId))) return notFound();
  } else if (role !== "admin") {
    return notFound();
  }

  const item = await db.inquiryItem.findUnique({
    where: { id: lineId },
    select: { inquiryId: true, logoFile: true, logoOriginalName: true },
  });
  if (!item || item.inquiryId !== inquiryId || !item.logoFile) return notFound();

  const file = await readLogo(item.logoFile);
  if (!file) return notFound();

  const name = (item.logoOriginalName ?? item.logoFile).replace(/[^\w.\-]+/g, "_").slice(0, 120);
  return new Response(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `inline; filename="${name}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
