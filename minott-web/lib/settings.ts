import { db } from "@/lib/db";

export const EMAIL_SETTING_KEYS = {
  fromEmail: "fromEmail",
  fromName: "fromName",
  generalInboxEmail: "generalInboxEmail",
} as const;

export type EmailSettings = {
  /** Outbound from-address on the Resend-verified domain. */
  fromEmail: string | null;
  /** Display name shown in the From header. */
  fromName: string | null;
  /** Recipient for unassigned inquiries and CC on rep-routed ones. */
  generalInboxEmail: string | null;
};

export async function getEmailSettings(): Promise<EmailSettings> {
  const rows = await db.setting.findMany({
    where: { key: { in: Object.values(EMAIL_SETTING_KEYS) } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const get = (key: string): string | null => {
    const value = map.get(key)?.trim();
    return value ? value : null;
  };
  return {
    fromEmail: get(EMAIL_SETTING_KEYS.fromEmail),
    fromName: get(EMAIL_SETTING_KEYS.fromName),
    generalInboxEmail: get(EMAIL_SETTING_KEYS.generalInboxEmail),
  };
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
