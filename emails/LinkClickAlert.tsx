import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Column,
  Section,
  Text,
  Link,
} from "@react-email/components";
import * as React from "react";

interface LinkClickAlertProps {
  linkTitle: string;
  linkSlug: string;
  shortUrl: string;
  milestone: 100 | 1000 | 10000;
  totalClicks: number;
  topCountry: string;
  topDevice: string;
  workspaceId: string;
}

export default function LinkClickAlert({
  linkTitle,
  linkSlug,
  shortUrl,
  milestone,
  totalClicks,
  topCountry,
  topDevice,
  workspaceId,
}: LinkClickAlertProps) {
  const analyticsUrl = `https://linkforge.app/dashboard/links/${linkSlug}/analytics`;

  const milestoneEmoji =
    milestone >= 10000 ? "🚀" : milestone >= 1000 ? "🎯" : "🎉";

  return (
    <Html>
      <Head />
      <Preview>
        {linkTitle} just hit {milestone.toLocaleString()} clicks! {milestoneEmoji}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>⚡ LinkForge</Text>
          </Section>

          {/* Hero */}
          <Section style={heroSection}>
            <Text style={milestoneTag}>MILESTONE REACHED</Text>
            <Heading style={h1}>
              {milestoneEmoji} {milestone.toLocaleString()} clicks!
            </Heading>
            <Text style={heroDesc}>
              Your link <strong style={{ color: "#fafafa" }}>"{linkTitle}"</strong> just hit{" "}
              <strong style={{ color: "#433BFF" }}>{milestone.toLocaleString()} clicks</strong>.
              Here's how it's performing:
            </Text>
          </Section>

          {/* Stats card */}
          <Section style={statsCard}>
            <Row>
              <Column style={statCol}>
                <Text style={statValue}>{totalClicks.toLocaleString()}</Text>
                <Text style={statLabel}>Total clicks</Text>
              </Column>
              <Column style={statDivider} />
              <Column style={statCol}>
                <Text style={statValue}>{topCountry || "—"}</Text>
                <Text style={statLabel}>Top country</Text>
              </Column>
              <Column style={statDivider} />
              <Column style={statCol}>
                <Text style={statValue}>{topDevice || "—"}</Text>
                <Text style={statLabel}>Top device</Text>
              </Column>
            </Row>
          </Section>

          {/* Short URL */}
          <Section style={{ padding: "0 40px 24px" }}>
            <Text style={urlLabel}>Short link</Text>
            <Text style={urlText}>{shortUrl}</Text>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Button style={ctaBtn} href={analyticsUrl}>
              View Full Analytics →
            </Button>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this because you have click alerts enabled.{" "}
              <Link
                href={`https://linkforge.app/dashboard/settings?tab=notifications`}
                style={unsubLink}
              >
                Manage alerts
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#09090b",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: 0,
};
const container: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  backgroundColor: "#09090b",
};
const header: React.CSSProperties = { padding: "32px 40px 0" };
const logoText: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: "800",
  color: "#433BFF",
  margin: 0,
};
const heroSection: React.CSSProperties = { padding: "28px 40px 8px" };
const milestoneTag: React.CSSProperties = {
  color: "#433BFF",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.1em",
  margin: "0 0 12px",
};
const h1: React.CSSProperties = {
  color: "#fafafa",
  fontSize: "28px",
  fontWeight: "800",
  margin: "0 0 12px",
};
const heroDesc: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "15px",
  lineHeight: "1.7",
  margin: 0,
};
const statsCard: React.CSSProperties = {
  backgroundColor: "#18181b",
  borderRadius: "12px",
  margin: "20px 40px",
  padding: "20px",
  border: "1px solid #27272a",
};
const statCol: React.CSSProperties = { textAlign: "center", padding: "0 8px" };
const statDivider: React.CSSProperties = {
  width: "1px",
  backgroundColor: "#27272a",
};
const statValue: React.CSSProperties = {
  color: "#fafafa",
  fontSize: "22px",
  fontWeight: "700",
  margin: "0 0 4px",
};
const statLabel: React.CSSProperties = {
  color: "#71717a",
  fontSize: "12px",
  margin: 0,
};
const urlLabel: React.CSSProperties = {
  color: "#52525b",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  margin: "0 0 4px",
};
const urlText: React.CSSProperties = {
  color: "#a78bfa",
  fontSize: "14px",
  margin: 0,
};
const ctaSection: React.CSSProperties = {
  padding: "0 40px 28px",
};
const ctaBtn: React.CSSProperties = {
  backgroundColor: "#433BFF",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  padding: "12px 24px",
  textDecoration: "none",
  display: "inline-block",
};
const hr: React.CSSProperties = {
  borderColor: "#27272a",
  borderWidth: "1px",
  margin: "0 40px",
};
const footer: React.CSSProperties = {
  padding: "16px 40px 28px",
  textAlign: "center",
};
const footerText: React.CSSProperties = {
  color: "#52525b",
  fontSize: "12px",
};
const unsubLink: React.CSSProperties = {
  color: "#52525b",
  textDecoration: "underline",
};
