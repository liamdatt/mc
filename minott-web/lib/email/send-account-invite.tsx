import { render } from "@react-email/components";
import { getResend } from "@/lib/email/resend";
import { getEmailSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { AccountInvite } from "@/emails/account-invite";

/**
 * Best-effort invite/reset email, called from BetterAuth's `sendResetPassword`
 * hook. Must never throw — provisioning succeeds even if email is unconfigured.
 * `url` is the BetterAuth reset URL (points at /api/auth/reset-password/:token
 * and redirects to our /set-password page with the token appended).
 */
export async function sendAccountInvite(
  userId: string,
  url: string,
): Promise<void> {
  try {
    const resend = getResend();
    if (!resend) {
      console.warn(`[email] RESEND_API_KEY unset — skipping invite for user ${userId}`);
      return;
    }
    const settings = await getEmailSettings();
    if (!settings.fromEmail) {
      console.warn(`[email] fromEmail not configured — skipping invite for user ${userId}`);
      return;
    }
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, role: true, activatedAt: true },
    });
    if (!user) {
      console.error(`[email] user ${userId} not found — skipping invite`);
      return;
    }

    const portal =
      user.role === "rep" ? "sales" : user.role === "admin" || user.role === "ar" ? "admin" : "customer";
    const approvedApp =
      user.activatedAt === null && user.role === "customer"
        ? await db.customerApplication.findFirst({
            where: { userId, status: "ACCOUNT_CREATED" },
            select: { company: { select: { mecAccountNumber: true } } },
          })
        : null;
    const variant = approvedApp ? "approved" : user.activatedAt === null ? "invite" : "reset";
    const from = settings.fromName
      ? `${settings.fromName} <${settings.fromEmail}>`
      : settings.fromEmail;

    // Pre-render to HTML/text ourselves rather than handing Resend a `react:`
    // component. Resend delegates react rendering to `@react-email/render`,
    // which is only a nested dependency of `@react-email/components` and is not
    // resolvable from Resend's own module path in the production build.
    const email = (
      <AccountInvite
        name={user.name}
        url={url}
        portal={portal}
        variant={variant}
        accountNumber={approvedApp?.company?.mecAccountNumber ?? null}
      />
    );
    const [html, text] = await Promise.all([
      render(email),
      render(email, { plainText: true }),
    ]);

    const { error } = await resend.emails.send({
      from,
      to: [user.email],
      replyTo: settings.generalInboxEmail ?? undefined,
      subject:
        variant === "approved"
          ? "Your MEC account has been approved"
          : variant === "invite"
            ? portal === "sales"
              ? "Set up your MEC sales portal access"
              : portal === "admin"
                ? user.role === "ar"
                  ? "Set up your MEC accounts access"
                  : "Set up your MEC admin access"
                : "Activate your Minott account"
            : "Reset your Minott password",
      html,
      text,
    });
    if (error) console.error(`[email] invite failed for user ${userId}:`, error);
  } catch (e) {
    console.error(`[email] invite threw for user ${userId}:`, e);
  }
}
