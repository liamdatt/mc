import { Heading, Hr, Text } from "@react-email/components";
import { EmailLayout, emailColors } from "./components/EmailLayout";

export function ApplicationReceived({ name, companyName }: { name: string; companyName: string }) {
  return (
    <EmailLayout preview="We received your New Customer Form">
      <Heading as="h1" style={{ color: emailColors.ink, fontSize: 22, margin: "0 0 8px" }}>
        We received your New Customer Form
      </Heading>
      <Text style={{ color: emailColors.graphite, fontSize: 14, margin: 0 }}>
        Hi {name}, thanks for applying to open an MEC account for {companyName}. Our
        Accounts Receivable team will review your application and respond within one
        business day. Your quote request stays attached to your application.
      </Text>
      <Hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "20px 0" }} />
      <Text style={{ color: emailColors.graphite, fontSize: 13, margin: 0 }}>
        Questions? Just reply to this email and it will reach our team.
      </Text>
    </EmailLayout>
  );
}
