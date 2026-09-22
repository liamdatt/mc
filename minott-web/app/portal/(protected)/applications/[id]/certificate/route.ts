import { getPortalSession } from "@/lib/portal";
import { db } from "@/lib/db";
import { readCertificate } from "@/lib/application-files";

// Staff-only download of an applicant's Business Registration Certificate.
// Files live on the private data volume (lib/application-files.ts), so this
// handler is the only way to reach them — no public URL exists.
export const dynamic = "force-dynamic";

const STAFF = ["admin", "ar"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getPortalSession();
  if (!session || !STAFF.includes(session.user.role ?? "")) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id } = await params;
  const appId = Number(id);
  if (!Number.isInteger(appId)) return new Response("Not found", { status: 404 });

  const app = await db.customerApplication.findUnique({
    where: { id: appId },
    select: { registrationCertPath: true, registrationCertName: true },
  });
  if (!app?.registrationCertPath) return new Response("Not found", { status: 404 });

  const file = await readCertificate(app.registrationCertPath);
  if (!file) return new Response("File is no longer available", { status: 404 });

  const downloadName = (app.registrationCertName ?? app.registrationCertPath).replace(/[^\w.\-]+/g, "_");
  return new Response(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `inline; filename="${downloadName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
