import { getPortalSession } from "@/lib/portal";
import { buildCatalogWorkbook, catalogExportFilename } from "@/lib/catalog-export";

export const dynamic = "force-dynamic";
// Hundreds of SKUs × thumbnail generation can exceed the default budget.
export const maxDuration = 120;

/** Admin-only: download the full catalog as .xlsx with embedded images. */
export async function GET() {
  const session = await getPortalSession();
  if (session?.user.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = await buildCatalogWorkbook();
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${catalogExportFilename()}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
