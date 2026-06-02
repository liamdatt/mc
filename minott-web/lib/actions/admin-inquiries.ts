"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { INQUIRY_STATUS } from "@/lib/constants";

const VALID = new Set<string>(Object.values(INQUIRY_STATUS));

export async function setInquiryStatus(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "");
  if (!Number.isFinite(id) || !VALID.has(status)) return;
  await db.inquiry.update({ where: { id }, data: { status } });
  revalidatePath("/admin/requests");
}
