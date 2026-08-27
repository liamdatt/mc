import type { ReactElement } from "react";
import { render } from "@react-email/components";
import { getResend } from "@/lib/email/resend";
import { getEmailSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { ApplicationReceived } from "@/emails/application-received";
import { ApplicationNotification } from "@/emails/application-notification";

export type ApplicationEmailKind = "received" | "info_requested" | "rejected";

/** Best-effort application emails (spec §10). Never throws — called via after(). */
export async function sendApplicationEmails(
  applicationId: number,
  kind: ApplicationEmailKind,
  opts: { resubmitted?: boolean } = {},
): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) {
      console.warn(`[email] RESEND_API_KEY unset — skipping ${kind} email for application ${applicationId}`);
      return;
    }
    const settings = await getEmailSettings();
    if (!settings.fromEmail || !settings.generalInboxEmail) {
      console.warn(`[email] fromEmail/generalInboxEmail not configured — skipping ${kind} email for application ${applicationId}`);
      return;
    }
    const app = await db.customerApplication.findUnique({
      where: { id: applicationId },
      include: { inquiry: { select: { id: true, _count: { select: { items: true } } } } },
    });
    if (!app) return;
    const from = settings.fromName ? `${settings.fromName} <${settings.fromEmail}>` : settings.fromEmail;
    const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    const send = async (to: string[], subject: string, element: ReactElement, replyTo?: string) => {
      const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
      const { error } = await resend.emails.send({ from, to, subject, html, text, replyTo });
      if (error) console.error(`[email] ${kind} email failed for application ${applicationId}:`, error);
    };

    if (kind === "received") {
      await send([app.email], "We received your New Customer Form",
        <ApplicationReceived name={app.contactName} companyName={app.companyName} />, settings.generalInboxEmail);
      const arUsers = await db.user.findMany({ where: { role: "ar", NOT: { banned: true } }, select: { email: true } });
      const internal = Array.from(new Set([settings.generalInboxEmail, ...arUsers.map((u) => u.email)]));
      await send(internal, `${opts.resubmitted ? "Updated" : "New"} customer application — ${app.companyName}`,
        <ApplicationNotification
          applicationId={app.id} companyName={app.companyName} industry={app.industry} location={app.location}
          contactName={app.contactName} email={app.email} phone={app.phone} notes={app.notes}
          itemCount={app.inquiry._count.items} resubmitted={Boolean(opts.resubmitted)}
          ctaUrl={`${baseUrl}/portal/applications/${app.id}`}
        />, app.email);
      return;
    }
    // "info_requested" | "rejected" — implemented in the decisions task.
    console.warn(`[email] ${kind} email not implemented yet for application ${applicationId}`);
  } catch (e) {
    console.error(`[email] unexpected failure (${kind}) for application ${applicationId}:`, e);
  }
}
