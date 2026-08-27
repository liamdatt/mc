import { Button, Heading, Hr, Text } from "@react-email/components";
import { EmailLayout, emailColors } from "./components/EmailLayout";

export function ApplicationInfoRequested({ name, note, url }: { name: string; note: string; url: string }) {
  return (
    <EmailLayout preview="We need a little more information for your MEC account application">
      <Heading as="h1" style={{ color: emailColors.ink, fontSize: 22, margin: "0 0 8px" }}>
        We need a little more information
      </Heading>
      <Text style={{ color: emailColors.graphite, fontSize: 14, margin: 0 }}>
        Hi {name}, our Accounts Receivable team reviewed your New Customer Form and asked:
      </Text>
      <Text style={{ color: emailColors.ink, fontSize: 14, margin: "12px 0 0", whiteSpace: "pre-line" }}>{note}</Text>
      <Button href={url} style={{ backgroundColor: emailColors.red, borderRadius: 4, color: emailColors.pure, display: "inline-block", fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", margin: "24px 0", padding: "12px 28px", textDecoration: "none", textTransform: "uppercase" }}>
        Update your application
      </Button>
      <Hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "20px 0" }} />
      <Text style={{ color: emailColors.graphite, fontSize: 13, margin: 0 }}>Reply to this email if you have any questions.</Text>
    </EmailLayout>
  );
}
