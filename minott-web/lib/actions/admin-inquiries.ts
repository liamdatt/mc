"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { INQUIRY_STATUS } from "@/lib/constants";
import { requireAdmin } from "@/lib/auth/require-admin";

const VALID: Set<string> = new Set(Object.values(INQUIRY_STATUS));

export async function setInquiryStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "");
  if (!Number.isFinite(id) || !VALID.has(status)) return;
  await db.inquiry.update({ where: { id }, data: { status } });
  revalidatePath("/admin/requests");
}
