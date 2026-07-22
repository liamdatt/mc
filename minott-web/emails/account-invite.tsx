import { Button, Heading, Hr, Text } from "@react-email/components";
import { EmailLayout, emailColors } from "./components/EmailLayout";

export type AccountInviteProps = {
  /** Recipient's display name. */
  name: string;
  /** The tokened set-password link (BetterAuth reset URL). */
  url: string;
  /** Which portal they're being onboarded to. */
  portal: "customer" | "sales";
  /** First-time activation vs. a later password reset — changes the copy. */
  isInvite: boolean;
};

const COPY = {
  customer: {
    invite: {
      heading: "Activate your Minott account",
      body: "An account has been created for you on the Minott Equipment & Chemicals customer portal, where you can track your quote requests and order history. Set your password to get started.",
      cta: "Set your password",
    },
    reset: {
      heading: "Reset your Minott password",
      body: "We received a request to reset the password for your Minott customer portal account. Choose a new password below.",
      cta: "Choose a new password",
    },
  },
  sales: {
    invite: {
      heading: "Set up your MEC sales portal access",
      body: "You've been added as a sales representative for Minott Equipment & Chemicals. Set your password to access your sales portal, where you can see your customers and their quotes.",
      cta: "Set your password",
    },
    reset: {
      heading: "Reset your sales portal password",
      body: "We received a request to reset the password for your MEC sales portal account. Choose a new password below.",
      cta: "Choose a new password",
    },
  },
} as const;

export function AccountInvite({ name, url, portal, isInvite }: AccountInviteProps) {
  const copy = COPY[portal][isInvite ? "invite" : "reset"];
  return (
    <EmailLayout preview={copy.heading}>
      <Heading as="h1" style={{ color: emailColors.ink, fontSize: 22, margin: "0 0 8px" }}>
        {copy.heading}
      </Heading>
      <Text style={{ color: emailColors.graphite, fontSize: 14, margin: 0 }}>
        Hi {name}, {copy.body}
      </Text>
      <Button
        href={url}
        style={{
          backgroundColor: emailColors.red,
          borderRadius: 4,
          color: emailColors.pure,
          display: "inline-block",
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "0.08em",
          margin: "24px 0",
          padding: "12px 28px",
          textDecoration: "none",
          textTransform: "uppercase",
        }}
      >
        {copy.cta}
      </Button>
      <Hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "20px 0" }} />
      <Text style={{ color: emailColors.graphite, fontSize: 13, margin: 0 }}>
        This link expires in 72 hours. If it lapses, ask a MEC administrator to
        resend your invitation. If you weren&apos;t expecting this email, you can
        safely ignore it.
      </Text>
    </EmailLayout>
  );
}
