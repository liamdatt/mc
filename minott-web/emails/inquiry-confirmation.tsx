import { Heading, Hr, Text } from "@react-email/components";
import { EmailLayout, emailColors } from "./components/EmailLayout";
import type { NotificationItem } from "./inquiry-notification";

export type InquiryConfirmationProps = {
  type: "QUOTE" | "SAMPLE" | "CONTACT";
  name: string;
  items: NotificationItem[];
};

const COPY: Record<
  InquiryConfirmationProps["type"],
  { heading: string; body: string }
> = {
  QUOTE: {
    heading: "We received your quote request",
    body: "Thanks for requesting a quote. Our team is reviewing your list and will get back to you with pricing shortly.",
  },
  SAMPLE: {
    heading: "We received your sample request",
    body: "Thanks for your interest. Our team will confirm sample availability and follow up with next steps.",
  },
  CONTACT: {
    heading: "We received your message",
    body: "Thanks for reaching out to Minott Equipment & Chemicals. A member of our team will respond as soon as possible.",
  },
};

export function InquiryConfirmation(props: InquiryConfirmationProps) {
  const copy = COPY[props.type];
  return (
    <EmailLayout preview={copy.heading}>
      <Heading
        as="h1"
        style={{ color: emailColors.ink, fontSize: 22, margin: "0 0 8px" }}
      >
        {copy.heading}
      </Heading>
      <Text style={{ color: emailColors.graphite, fontSize: 14, margin: 0 }}>
        Hi {props.name}, {copy.body}
      </Text>

      {props.items.length > 0 && (
        <>
          <Hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "20px 0" }} />
          <Text
            style={{
              color: emailColors.graphite,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              margin: "0 0 6px",
              textTransform: "uppercase",
            }}
          >
            Your request
          </Text>
          {props.items.map((item, i) => (
            <Text
              key={i}
              style={{ color: emailColors.ink, fontSize: 14, margin: "0 0 2px" }}
            >
              {item.quantity} × {item.name}
              {item.variant ? ` — ${item.variant}` : ""}
              {item.dealLabel ? (
                <span style={{ color: emailColors.red, fontWeight: 700 }}>
                  {` · ${item.dealLabel}`}
                </span>
              ) : null}
            </Text>
          ))}
        </>
      )}

      <Hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "20px 0" }} />
      <Text style={{ color: emailColors.graphite, fontSize: 13, margin: 0 }}>
        Need to add anything? Just reply to this email and it will reach our
        team.
      </Text>
    </EmailLayout>
  );
}
