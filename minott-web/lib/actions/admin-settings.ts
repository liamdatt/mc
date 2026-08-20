"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { EMAIL_SETTING_KEYS, setSetting } from "@/lib/settings";

export type SettingsFormState = { error?: string; saved?: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function updateEmailSettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  await requireAdmin();

  const fromEmail = str(formData, "fromEmail");
  const fromName = str(formData, "fromName");
  const generalInboxEmail = str(formData, "generalInboxEmail");

  if (fromEmail && !EMAIL_RE.test(fromEmail))
    return { error: "Outbound email doesn't look like an email address." };
  if (generalInboxEmail && !EMAIL_RE.test(generalInboxEmail))
    return { error: "General inbox doesn't look like an email address." };

  await setSetting(EMAIL_SETTING_KEYS.fromEmail, fromEmail);
  await setSetting(EMAIL_SETTING_KEYS.fromName, fromName);
  await setSetting(EMAIL_SETTING_KEYS.generalInboxEmail, generalInboxEmail);

  revalidatePath("/portal/settings");
  return { saved: true };
}
