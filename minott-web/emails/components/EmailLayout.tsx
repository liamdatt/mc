import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// Mirrors lib/tokens.ts — email HTML can't read Tailwind tokens.
export const emailColors = {
  red: "#E10600",
  ink: "#0D0D0D",
  graphite: "#2B2B2B",
  mist: "#F2F2F2",
  pure: "#FFFFFF",
} as const;

export const fontStack =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: emailColors.mist,
          fontFamily: fontStack,
          margin: 0,
          padding: "24px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: emailColors.pure,
            borderRadius: 4,
            maxWidth: 560,
            overflow: "hidden",
          }}
        >
          <Section
            style={{
              backgroundColor: emailColors.ink,
              borderTop: `4px solid ${emailColors.red}`,
              padding: "16px 32px",
            }}
          >
            <Text
              style={{
                color: emailColors.pure,
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.08em",
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              <span style={{ color: emailColors.red }}>MEC</span>&nbsp;Minott
              Equipment &amp; Chemicals
            </Text>
          </Section>
          <Section style={{ padding: "28px 32px" }}>{children}</Section>
          <Section
            style={{
              borderTop: `1px solid rgba(0,0,0,0.08)`,
              padding: "16px 32px",
            }}
          >
            <Text
              style={{
                color: emailColors.graphite,
                fontSize: 12,
                margin: 0,
              }}
            >
              Minott Equipment &amp; Chemicals Limited · 14½ Retirement Rd
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
