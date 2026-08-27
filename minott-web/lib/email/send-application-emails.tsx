import type { ReactElement } from "react";
import { render } from "@react-email/components";
import { getResend } from "@/lib/email/resend";
import { getEmailSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { ApplicationReceived } from "@/emails/application-received";
import { ApplicationNotification } from "@/emails/application-notification";
import { ApplicationInfoRequested } from "@/emails/application-info-requested";
import { ApplicationRejected } from "@/emails/application-rejected";

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
    if (kind === "info_requested") {
      const ref = await db.inquiry.findUnique({ where: { id: app.inquiryId }, select: { ref: true } });
      if (!ref?.ref) {
        console.error(`[email] inquiry ${app.inquiryId} has no ref — skipping info_requested email for application ${applicationId}`);
        return;
      }
      await send([app.email], "We need a little more information for your MEC account application",
        <ApplicationInfoRequested name={app.contactName} note={app.decisionNote ?? ""} url={`${baseUrl}/register?ref=${ref.ref}`} />, settings.generalInboxEmail);
      return;
    }
    if (kind === "rejected") {
      await send([app.email], "An update on your MEC account application",
        <ApplicationRejected name={app.contactName} reason={app.decisionNote ?? ""} />, settings.generalInboxEmail);
      await send([settings.generalInboxEmail], `Application rejected — ${app.companyName}`,
        <ApplicationRejected name="team" reason={`${app.companyName} (${app.email}) was rejected: ${app.decisionNote ?? ""}`} />);
      return;
    }
  } catch (e) {
    console.error(`[email] unexpected failure (${kind}) for application ${applicationId}:`, e);
  }
}
