import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Link,
} from "@react-email/components";
import * as React from "react";

interface DomainVerifiedProps {
  name: string;
  domain: string;
  dashboardUrl: string;
  isDefault: boolean;
  role: string;
}

export default function DomainVerified({
  name,
  domain,
  dashboardUrl,
  isDefault,
  role,
}: DomainVerifiedProps) {
  const firstName = name?.split(" ")[0] || "there";
  const roleLabel = role === "bio" ? "bio page" : role === "both" ? "links & bio pages" : "short links";

  return (
    <Html>
      <Head />
      <Preview>🎉 {domain} is now live on PivotUrl!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>⚡ PivotUrl</Text>
          </Section>

          <Section style={heroSection}>
            <Text style={badge}>DOMAIN VERIFIED</Text>
            <Heading style={h1}>🎉 Your domain is live!</Heading>
            <Text style={heroDesc}>
              Hey {firstName}, <strong style={{ color: "#fafafa" }}>{domain}</strong> is now verified and ready to serve {roleLabel}.
            </Text>
          </Section>

          <Section style={congratsCard}>
            <Text style={congratsEmoji}>✨</Text>
            <Text style={congratsTitle}>{domain}</Text>
            <Text style={congratsDesc}>
              Every link you share now carries your brand. No more "pivoturl.com/yourlink" — just clean, branded URLs that build trust with every click.
            </Text>
          </Section>

          <Section style={pointsSection}>
            <Text style={sectionLabel}>WHAT THIS MEANS</Text>
            <Section style={pointRow}>
              <Text style={pointIcon}>🔗</Text>
              <Text style={pointText}>
                <strong style={{ color: "#fafafa" }}>Branded links</strong> — All short links use your domain automatically
              </Text>
            </Section>
            {role !== "links" && (
              <Section style={pointRow}>
                <Text style={pointIcon}>📄</Text>
                <Text style={pointText}>
                  <strong style={{ color: "#fafafa" }}>Bio page</strong> — Your bio page is served from your own domain
                </Text>
              </Section>
            )}
            <Section style={pointRow}>
              <Text style={pointIcon}>🛡️</Text>
              <Text style={pointText}>
                <strong style={{ color: "#fafafa" }}>Trust & click-through</strong> — Branded domains get up to 34% more clicks
              </Text>
            </Section>
            {isDefault && (
              <Section style={pointRow}>
                <Text style={pointIcon}>⭐</Text>
                <Text style={pointText}>
                  <strong style={{ color: "#fafafa" }}>Default domain</strong> — All new links will use this domain by default
                </Text>
              </Section>
            )}
          </Section>

          <Section style={ctaSection}>
            <Button style={ctaBtn} href={dashboardUrl}>
              Go to Dashboard →
            </Button>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this because you added {domain} to PivotUrl.{" "}
              <Link
                href={`https://pivoturl.com/dashboard/settings?tab=notifications`}
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
const badge: React.CSSProperties = {
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
const congratsCard: React.CSSProperties = {
  backgroundColor: "#18181b",
  borderRadius: "12px",
  margin: "20px 40px",
  padding: "24px",
  border: "1px solid #27272a",
  textAlign: "center",
};
const congratsEmoji: React.CSSProperties = {
  fontSize: "36px",
  margin: "0 0 8px",
  lineHeight: "1",
};
const congratsTitle: React.CSSProperties = {
  color: "#fafafa",
  fontSize: "18px",
  fontWeight: "700",
  margin: "0 0 8px",
  fontFamily: "monospace",
};
const congratsDesc: React.CSSProperties = {
  color: "#71717a",
  fontSize: "14px",
  lineHeight: "1.7",
  margin: 0,
};
const pointsSection: React.CSSProperties = { padding: "0 40px 24px" };
const sectionLabel: React.CSSProperties = {
  color: "#433BFF",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.1em",
  margin: "0 0 12px",
};
const pointRow: React.CSSProperties = {
  marginBottom: "12px",
};
const pointIcon: React.CSSProperties = {
  fontSize: "16px",
  margin: "0 0 4px",
  lineHeight: "1",
};
const pointText: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "13px",
  lineHeight: "1.6",
  margin: 0,
};
const ctaSection: React.CSSProperties = { padding: "0 40px 28px" };
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
