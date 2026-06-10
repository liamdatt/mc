import {
  getPortalSession,
  getUserHistory,
  type HistoryFilters,
} from "@/lib/portal";
import { INQUIRY_STATUS_LABELS, INQUIRY_TYPE_LABELS } from "@/lib/constants";

/**
 * CSV export of the signed-in user's inquiry history. Route handlers do NOT run
 * the (protected) layout, so the session is re-verified here. Honors the same
 * query filters as the history listing. One row per line item (or one row per
 * inquiry when there are no items), so the export is reorder/spreadsheet ready.
 *
 * PDF export is intentionally deferred — see the lane notes.
 */

function csvField(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const session = await getPortalSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const p = (k: string) => url.searchParams.get(k)?.trim() || undefined;
  const filters: HistoryFilters = {
    from: p("from"),
    to: p("to"),
    type: p("type"),
    status: p("status"),
    categorySlug: p("category"),
  };

  const inquiries = await getUserHistory(session.user.id, filters);

  const header = [
    "Reference",
    "Date",
    "Type",
    "Status",
    "Product",
    "Quantity",
    "Message",
  ];
  const rows: string[][] = [header];

  for (const inq of inquiries) {
    const ref = `#${String(inq.id).padStart(5, "0")}`;
    const date = isoDate(inq.createdAt);
    const type = INQUIRY_TYPE_LABELS[inq.type] ?? inq.type;
    const status = INQUIRY_STATUS_LABELS[inq.status] ?? inq.status;
    const message = inq.message ?? "";

    if (inq.items.length > 0) {
      for (const it of inq.items) {
        rows.push([
          ref,
          date,
          type,
          status,
          it.productName,
          String(it.quantity),
          message,
        ]);
      }
    } else {
      rows.push([
        ref,
        date,
        type,
        status,
        inq.product?.name ?? "",
        inq.product ? "1" : "",
        message,
      ]);
    }
  }

  const csv = rows
    .map((r) => r.map(csvField).join(","))
    .join("\r\n");

  const filename = `mec-history-${isoDate(new Date())}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
