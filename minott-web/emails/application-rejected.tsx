import { Heading, Hr, Text } from "@react-email/components";
import { EmailLayout, emailColors } from "./components/EmailLayout";

export function ApplicationRejected({ name, reason }: { name: string; reason: string }) {
  return (
    <EmailLayout preview="An update on your MEC account application">
      <Heading as="h1" style={{ color: emailColors.ink, fontSize: 22, margin: "0 0 8px" }}>
        An update on your account application
      </Heading>
      <Text style={{ color: emailColors.graphite, fontSize: 14, margin: 0 }}>
        Hi {name}, thank you for your interest in Minott Equipment &amp; Chemicals. We
        are unable to open an account at this time for the following reason:
      </Text>
      <Text style={{ color: emailColors.ink, fontSize: 14, margin: "12px 0 0", whiteSpace: "pre-line" }}>{reason}</Text>
      <Hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "20px 0" }} />
      <Text style={{ color: emailColors.graphite, fontSize: 13, margin: 0 }}>
        You are welcome to visit our Kingston showroom, or reply to this email if you
        believe this decision was made in error.
      </Text>
    </EmailLayout>
  );
}
