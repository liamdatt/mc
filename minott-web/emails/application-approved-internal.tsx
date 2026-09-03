import { Heading, Hr, Link, Text } from "@react-email/components";
import { EmailLayout, emailColors } from "./components/EmailLayout";

export type ApplicationApprovedInternalProps = {
  companyName: string;
  industry: string;
  location: string;
  contactName: string;
  email: string;
  phone: string;
  approvedBy: string | null;
  ctaUrl: string;
};

const detailLabel = { color: emailColors.graphite, fontSize: 12, fontWeight: 700 as const, letterSpacing: "0.08em", margin: "12px 0 2px", textTransform: "uppercase" as const };
const detailValue = { color: emailColors.ink, fontSize: 14, margin: 0 };

/** Sent to admins when AR approves: the account still needs to be created. */
export function ApplicationApprovedInternal(p: ApplicationApprovedInternalProps) {
  const title = `Application approved — set up the account for ${p.companyName}`;
  return (
    <EmailLayout preview={title}>
      <Heading as="h1" style={{ color: emailColors.ink, fontSize: 22, margin: "0 0 4px" }}>{title}</Heading>
      <Text style={{ color: emailColors.graphite, fontSize: 14, margin: "8px 0 0" }}>
        {p.approvedBy ? `${p.approvedBy} approved` : "Approved"} this New Customer Form. An admin now needs to
        create the company account, assign the MEC account number, credit terms and sales rep, and send the invite.
      </Text>
      <Text style={detailLabel}>Company</Text>
      <Text style={detailValue}>{p.companyName} · {p.industry} · {p.location}</Text>
      <Text style={detailLabel}>Principal contact</Text>
      <Text style={detailValue}>{p.contactName} · <Link href={`mailto:${p.email}`} style={{ color: emailColors.red }}>{p.email}</Link> · {p.phone}</Text>
      <Hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "24px 0" }} />
      <Text style={{ fontSize: 14, margin: 0 }}>
        <Link href={p.ctaUrl} style={{ color: emailColors.red }}>Create the account →</Link>
      </Text>
    </EmailLayout>
  );
}
