import { Heading, Hr, Link, Text } from "@react-email/components";
import { EmailLayout, emailColors } from "./components/EmailLayout";

export type NotificationItem = {
  name: string;
  variant: string | null;
  quantity: number;
};

export type InquiryNotificationProps = {
  typeLabel: string; // "Quote request" | "Sample request" | "Contact message"
  inquiryId: number;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  items: NotificationItem[];
  /** Assigned rep name when routed to a rep, else null. */
  repName: string | null;
  /** Absolute CTA link: sales-portal quote page when rep-routed, else /admin/requests. */
  ctaUrl: string;
  ctaLabel: string;
};

const detailLabel = {
  color: emailColors.graphite,
  fontSize: 12,
  fontWeight: 700 as const,
  letterSpacing: "0.08em",
  margin: "12px 0 2px",
  textTransform: "uppercase" as const,
};

const detailValue = {
  color: emailColors.ink,
  fontSize: 14,
  margin: 0,
};

export function InquiryNotification(props: InquiryNotificationProps) {
  const preview = `New ${props.typeLabel.toLowerCase()} from ${props.name}`;
  return (
    <EmailLayout preview={preview}>
      <Text
        style={{
          backgroundColor: emailColors.red,
          borderRadius: 999,
          color: emailColors.pure,
          display: "inline-block",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          margin: 0,
          padding: "4px 12px",
          textTransform: "uppercase",
        }}
      >
        {props.typeLabel}
      </Text>
      <Heading
        as="h1"
        style={{
          color: emailColors.ink,
          fontSize: 22,
          margin: "16px 0 4px",
        }}
      >
        New {props.typeLabel.toLowerCase()} from {props.name}
      </Heading>
      {props.repName && (
        <Text style={{ color: emailColors.graphite, fontSize: 13, margin: 0 }}>
          Routed to {props.repName} (assigned sales rep).
        </Text>
      )}

      <Text style={detailLabel}>Contact</Text>
      <Text style={detailValue}>
        {props.name}
        {props.company ? ` · ${props.company}` : ""}
      </Text>
      <Text style={detailValue}>
        <Link href={`mailto:${props.email}`} style={{ color: emailColors.red }}>
          {props.email}
        </Link>
        {props.phone ? ` · ${props.phone}` : ""}
      </Text>

      {props.message && (
        <>
          <Text style={detailLabel}>Message</Text>
          <Text style={detailValue}>{props.message}</Text>
        </>
      )}

      {props.items.length > 0 && (
        <>
          <Text style={detailLabel}>Requested items</Text>
          {props.items.map((item, i) => (
            <Text key={i} style={{ ...detailValue, margin: "0 0 2px" }}>
              {item.quantity} × {item.name}
              {item.variant ? ` — ${item.variant}` : ""}
            </Text>
          ))}
        </>
      )}

      <Hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "24px 0" }} />
      <Text style={{ fontSize: 14, margin: 0 }}>
        <Link href={props.ctaUrl} style={{ color: emailColors.red }}>
          {props.ctaLabel}
        </Link>
      </Text>
    </EmailLayout>
  );
}
