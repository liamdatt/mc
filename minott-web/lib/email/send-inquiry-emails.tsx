import { render } from "@react-email/components";
import { getResend } from "@/lib/email/resend";
import { getEmailSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { INQUIRY_TYPE_LABELS } from "@/lib/constants";
import {
  InquiryNotification,
  type NotificationItem,
} from "@/emails/inquiry-notification";
import { InquiryConfirmation } from "@/emails/inquiry-confirmation";

/**
 * Best-effort email fan-out for a persisted inquiry. Called via after() from
 * the inquiry server actions — must never throw. The DB row is the source of
 * truth; failures only log.
 */
export async function sendInquiryEmails(
  inquiryId: number,
  opts: { verifiedNow?: boolean } = {},
): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) {
      console.warn(
        `[email] RESEND_API_KEY unset — skipping emails for inquiry ${inquiryId}`,
      );
      return;
    }

    const settings = await getEmailSettings();
    if (!settings.fromEmail || !settings.generalInboxEmail) {
      console.warn(
        `[email] fromEmail/generalInboxEmail not configured in /portal/settings — skipping emails for inquiry ${inquiryId}`,
      );
      return;
    }

    const inquiry = await db.inquiry.findUnique({
      where: { id: inquiryId },
      include: {
        user: { select: { name: true } },
        companyRef: { include: { salesRep: true } },
        items: { include: { variant: true } },
        product: true,
        variant: true,
      },
    });
    if (!inquiry) {
      console.error(`[email] inquiry ${inquiryId} not found — skipping`);
      return;
    }

    const from = settings.fromName
      ? `${settings.fromName} <${settings.fromEmail}>`
      : settings.fromEmail;

    const rep = inquiry.companyRef?.salesRep;
    const repRouted = Boolean(rep?.active && rep?.email);

    // Quote items come from InquiryItem; samples carry a single product ref.
    const items: NotificationItem[] =
      inquiry.items.length > 0
        ? inquiry.items.map((i) => ({
            name: i.productName,
            variant: i.variant?.label ?? i.variant?.size ?? null,
            quantity: i.quantity,
            dealLabel: i.dealLabel ?? null,
          }))
        : inquiry.product
          ? [
              {
                name: inquiry.product.name,
                variant:
                  inquiry.variant?.label ?? inquiry.variant?.size ?? null,
                quantity: 1,
                dealLabel: null,
              },
            ]
          : [];

    const typeLabel = INQUIRY_TYPE_LABELS[inquiry.type] ?? "Inquiry";
    const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    const classification =
      inquiry.type === "QUOTE" && !inquiry.userId
        ? inquiry.matchStatus === "POTENTIAL_MATCH"
          ? "Potential existing customer — unverified (verification required before linking)"
          : inquiry.matchStatus === "NO_MATCH"
            ? "New customer — New Customer Form pending"
            : opts.verifiedNow
              ? "Existing customer — verified"
              : null
        : null;
    const registerUrl =
      inquiry.type === "QUOTE" && inquiry.matchStatus === "NO_MATCH" && inquiry.ref
        ? `${baseUrl}/register?ref=${inquiry.ref}`
        : null;

    // 1) Internal notification (rep + CC inbox, or inbox alone). Both rep and
    // admin recipients land in the unified portal, just at different routes.
    try {
      // Rep-routed inquiries are always quotes (only submitQuote attaches a companyId), so this link always resolves.
      const ctaUrl = repRouted
        ? `${baseUrl}/portal/quotes/${inquiry.id}`
        : `${baseUrl}/portal/requests`;
      const ctaLabel = repRouted
        ? "View in the sales portal →"
        : "View in the admin inbox →";
      const companyName = inquiry.companyRef?.name ?? inquiry.company;
      const notification = (
        <InquiryNotification
          typeLabel={typeLabel}
          inquiryId={inquiry.id}
          name={inquiry.name}
          company={companyName}
          email={inquiry.email}
          phone={inquiry.phone}
          message={inquiry.message}
          items={items}
          repName={repRouted ? rep!.name : null}
          classification={classification}
          ctaUrl={ctaUrl}
          ctaLabel={ctaLabel}
        />
      );
      const [html, text] = await Promise.all([
        render(notification),
        render(notification, { plainText: true }),
      ]);
      const { error } = await resend.emails.send({
        from,
        to: repRouted ? [rep!.email!] : [settings.generalInboxEmail],
        cc: repRouted ? [settings.generalInboxEmail] : undefined,
        replyTo: inquiry.email,
        subject: `${opts.verifiedNow ? "Verified: " : ""}New ${typeLabel.toLowerCase()} from ${inquiry.name}${companyName ? ` (${companyName})` : ""}`,
        html,
        text,
      });
      if (error) {
        console.error(
          `[email] notification failed for inquiry ${inquiry.id}:`,
          error,
        );
      }
    } catch (e) {
      console.error(
        `[email] notification threw for inquiry ${inquiry.id}:`,
        e,
      );
    }

    if (opts.verifiedNow) return;

    // 2) Customer confirmation.
    try {
      const confirmation = (
        <InquiryConfirmation
          type={inquiry.type as "QUOTE" | "SAMPLE" | "CONTACT"}
          name={inquiry.name}
          items={items}
          registerUrl={registerUrl}
        />
      );
      const [html, text] = await Promise.all([
        render(confirmation),
        render(confirmation, { plainText: true }),
      ]);
      const { error } = await resend.emails.send({
        from,
        to: [inquiry.email],
        replyTo: settings.generalInboxEmail,
        subject:
          inquiry.type === "QUOTE"
            ? "We received your quote request"
            : inquiry.type === "SAMPLE"
              ? "We received your sample request"
              : "We received your message",
        html,
        text,
      });
      if (error) {
        console.error(
          `[email] confirmation failed for inquiry ${inquiry.id} to ${inquiry.email}:`,
          error,
        );
      }
    } catch (e) {
      console.error(
        `[email] confirmation threw for inquiry ${inquiry.id} to ${inquiry.email}:`,
        e,
      );
    }
  } catch (e) {
    // Belt-and-braces: this function is called via after() and must not throw.
    console.error(`[email] unexpected failure for inquiryId ${inquiryId}:`, e);
  }
}
