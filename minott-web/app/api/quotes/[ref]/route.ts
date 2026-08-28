import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonData, jsonError, enforceRateLimit, requireIntegrationKey } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;
  const denied = requireIntegrationKey(req);
  if (denied) return denied;

  const { ref } = await params;
  if (!ref) return jsonError("not_found", "No quote with that reference.", 404);

  const inquiry = await db.inquiry.findUnique({
    where: { ref },
    select: {
      status: true,
      matchStatus: true,
      createdAt: true,
      _count: { select: { items: true } },
      companyRef: { select: { salesRep: { select: { name: true, active: true } } } },
    },
  });
  if (!inquiry) return jsonError("not_found", "No quote with that reference.", 404);

  const rep = inquiry.companyRef?.salesRep;
  return jsonData({
    status: inquiry.status,
    matchStatus: inquiry.matchStatus,
    submittedAt: inquiry.createdAt.toISOString(),
    itemCount: inquiry._count.items,
    salesRep: rep?.active ? { name: rep.name } : null,
  });
}
