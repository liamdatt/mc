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

    const portal = user.role === "rep" ? "sales" : "customer";
    const isInvite = user.activatedAt === null;
    const from = settings.fromName
      ? `${settings.fromName} <${settings.fromEmail}>`
      : settings.fromEmail;

    const { error } = await resend.emails.send({
      from,
      to: [user.email],
      replyTo: settings.generalInboxEmail ?? undefined,
      subject: isInvite
        ? portal === "sales"
          ? "Set up your MEC sales portal access"
          : "Activate your Minott account"
        : "Reset your Minott password",
      react: (
        <AccountInvite name={user.name} url={url} portal={portal} isInvite={isInvite} />
      ),
    });
    if (error) console.error(`[email] invite failed for user ${userId}:`, error);
  } catch (e) {
    console.error(`[email] invite threw for user ${userId}:`, e);
  }
}
