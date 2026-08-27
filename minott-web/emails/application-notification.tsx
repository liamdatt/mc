import { Heading, Hr, Link, Text } from "@react-email/components";
import { EmailLayout, emailColors } from "./components/EmailLayout";

export type ApplicationNotificationProps = {
  applicationId: number;
  companyName: string;
  industry: string;
  location: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string | null;
  itemCount: number;
  resubmitted: boolean;
  ctaUrl: string;
};

const detailLabel = { color: emailColors.graphite, fontSize: 12, fontWeight: 700 as const, letterSpacing: "0.08em", margin: "12px 0 2px", textTransform: "uppercase" as const };
const detailValue = { color: emailColors.ink, fontSize: 14, margin: 0 };

export function ApplicationNotification(p: ApplicationNotificationProps) {
  const title = `${p.resubmitted ? "Updated" : "New"} customer application — ${p.companyName}`;
  return (
    <EmailLayout preview={title}>
      <Heading as="h1" style={{ color: emailColors.ink, fontSize: 22, margin: "0 0 4px" }}>{title}</Heading>
      <Text style={detailLabel}>Company</Text>
      <Text style={detailValue}>{p.companyName} · {p.industry} · {p.location}</Text>
      <Text style={detailLabel}>Contact</Text>
      <Text style={detailValue}>{p.contactName} · <Link href={`mailto:${p.email}`} style={{ color: emailColors.red }}>{p.email}</Link> · {p.phone}</Text>
      {p.notes && (<><Text style={detailLabel}>Notes</Text><Text style={detailValue}>{p.notes}</Text></>)}
      <Text style={detailLabel}>Quote</Text>
      <Text style={detailValue}>{p.itemCount} item{p.itemCount === 1 ? "" : "s"} attached</Text>
      <Hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "24px 0" }} />
      <Text style={{ fontSize: 14, margin: 0 }}>
        <Link href={p.ctaUrl} style={{ color: emailColors.red }}>Review in the portal →</Link>
      </Text>
    </EmailLayout>
  );
}
