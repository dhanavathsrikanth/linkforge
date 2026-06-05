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

interface InactiveUserProps {
  name: string;
  email: string;
  lastSeenDays: number;
  totalLinks: number;
  totalClicks: number;
  totalClicksChange: number;
  topLinkTitle: string;
  topLinkClicks: number;
  dashboardUrl: string;
}

export default function InactiveUser({
  name,
  email,
  lastSeenDays,
  totalLinks,
  totalClicks,
  totalClicksChange,
  topLinkTitle,
  topLinkClicks,
  dashboardUrl,
}: InactiveUserProps) {
  const firstName = name?.split(" ")[0] || "there";

  return (
    <Html>
      <Head />
      <Preview>While you were away, your links got {totalClicks.toLocaleString()} clicks</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>⚡ PivotUrl</Text>
          </Section>

          <Section style={heroSection}>
            <Heading style={h1}>We've missed you! 👋</Heading>
            <Text style={heroDesc}>
              Hey {firstName}, it's been {lastSeenDays} days. Here's what your links have been up to while you were away:
            </Text>
          </Section>

          <Section style={statsGrid}>
            <Row>
              <Column style={statCard}>
                <Text style={statValue}>{totalClicks.toLocaleString()}</Text>
                <Text style={statLabel}>Total clicks</Text>
                {totalClicksChange > 0 && (
                  <Text style={statChange}>↑ {totalClicksChange.toLocaleString()} since you left</Text>
                )}
              </Column>
              <Column style={statCardRight}>
                <Text style={statValue}>{totalLinks}</Text>
                <Text style={statLabel}>Active links</Text>
              </Column>
            </Row>
          </Section>

          {topLinkTitle && (
            <Section style={topLinkSection}>
              <Text style={sectionLabel}>YOUR TOP LINK</Text>
              <Section style={topLinkCard}>
                <Text style={topLinkTitleText}>{topLinkTitle}</Text>
                <Text style={topLinkClicksText}>
                  {topLinkClicks.toLocaleString()} clicks total
                </Text>
                <Button style={miniCta} href={`${dashboardUrl}?slug=${topLinkTitle}`}>
                  View Stats →
                </Button>
              </Section>
            </Section>
          )}

          <Section style={ctaSection}>
            <Text style={ctaText}>
              Your links are still working and still getting clicks. Come back to see the full picture — countries, devices, referrers, and more.
            </Text>
            <Button style={ctaBtn} href={dashboardUrl}>
              Open Dashboard →
            </Button>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this because you have a PivotUrl account with {email}.{" "}
              <Link href={`https://pivoturl.com/dashboard/settings?tab=notifications`} style={unsubLink}>
                Unsubscribe
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
const h1: React.CSSProperties = {
  color: "#fafafa",
  fontSize: "26px",
  fontWeight: "800",
  margin: "0 0 12px",
};
const heroDesc: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "15px",
  lineHeight: "1.7",
  margin: 0,
};
const statsGrid: React.CSSProperties = { padding: "16px 40px" };
const statCard: React.CSSProperties = {
  backgroundColor: "#18181b",
  borderRadius: "12px",
  border: "1px solid #27272a",
  padding: "16px",
  textAlign: "center",
  width: "46%",
  verticalAlign: "top",
};
const statCardRight: React.CSSProperties = {
  backgroundColor: "#18181b",
  borderRadius: "12px",
  border: "1px solid #27272a",
  padding: "16px",
  textAlign: "center",
  width: "46%",
  verticalAlign: "top",
  marginLeft: "8%",
};
const statValue: React.CSSProperties = {
  color: "#fafafa",
  fontSize: "28px",
  fontWeight: "800",
  margin: "0 0 2px",
};
const statLabel: React.CSSProperties = {
  color: "#71717a",
  fontSize: "12px",
  margin: "0 0 4px",
};
const statChange: React.CSSProperties = {
  color: "#4ade80",
  fontSize: "11px",
  fontWeight: "600",
  margin: 0,
};
const topLinkSection: React.CSSProperties = { padding: "0 40px 8px" };
const sectionLabel: React.CSSProperties = {
  color: "#433BFF",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.1em",
  margin: "0 0 12px",
};
const topLinkCard: React.CSSProperties = {
  backgroundColor: "#18181b",
  borderRadius: "12px",
  border: "1px solid #27272a",
  padding: "16px",
};
const topLinkTitleText: React.CSSProperties = {
  color: "#fafafa",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 4px",
};
const topLinkClicksText: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "12px",
  margin: "0 0 10px",
};
const miniCta: React.CSSProperties = {
  backgroundColor: "#27272a",
  borderRadius: "6px",
  color: "#fafafa",
  fontSize: "12px",
  fontWeight: "600",
  padding: "8px 14px",
  textDecoration: "none",
  display: "inline-block",
};
const ctaSection: React.CSSProperties = { padding: "20px 40px 28px", textAlign: "center" };
const ctaText: React.CSSProperties = {
  color: "#71717a",
  fontSize: "14px",
  lineHeight: "1.7",
  margin: "0 0 16px",
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
const footerText: React.CSSProperties = { color: "#52525b", fontSize: "12px" };
const unsubLink: React.CSSProperties = {
  color: "#52525b",
  textDecoration: "underline",
};
