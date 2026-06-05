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

interface FirstLinkCreatedProps {
  name: string;
  linkTitle: string;
  linkSlug: string;
  dashboardUrl: string;
}

export default function FirstLinkCreated({
  name,
  linkTitle,
  linkSlug,
  dashboardUrl,
}: FirstLinkCreatedProps) {
  const firstName = name?.split(" ")[0] || "there";

  return (
    <Html>
      <Head />
      <Preview>🚀 You created your first link on PivotUrl!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>⚡ PivotUrl</Text>
          </Section>

          <Section style={heroSection}>
            <Text style={badge}>FIRST LINK CREATED</Text>
            <Heading style={h1}>🚀 You're live!</Heading>
            <Text style={heroDesc}>
              Hey {firstName}, your first link <strong style={{ color: "#fafafa" }}>"{linkTitle}"</strong> is ready to share. Here's what to do next:
            </Text>
          </Section>

          <Section style={linkCard}>
            <Text style={linkLabel}>Your link</Text>
            <Text style={linkValue}>{`https://pivoturl.com/s/${linkSlug}`}</Text>
          </Section>

          <Section style={stepsSection}>
            <Text style={sectionLabel}>NEXT STEPS</Text>

            <Section style={stepRow}>
              <Text style={stepNum}>1</Text>
              <Text style={stepContent}>
                <strong style={{ color: "#fafafa" }}>Share it everywhere</strong> — Put it in your Twitter bio, email signature, or Instagram story
              </Text>
            </Section>

            <Section style={stepRow}>
              <Text style={stepNum}>2</Text>
              <Text style={stepContent}>
                <strong style={{ color: "#fafafa" }}>Track your clicks</strong> — Watch real-time analytics: countries, devices, referrers
              </Text>
            </Section>

            <Section style={stepRow}>
              <Text style={stepNum}>3</Text>
              <Text style={stepContent}>
                <strong style={{ color: "#fafafa" }}>Add a custom domain</strong> — Use your own brand instead of pivoturl.com
              </Text>
            </Section>

            <Section style={stepRow}>
              <Text style={stepNum}>4</Text>
              <Text style={stepContent}>
                <strong style={{ color: "#fafafa" }}>Create a QR code</strong> — Perfect for print materials, business cards, or flyers
              </Text>
            </Section>
          </Section>

          <Section style={ctaSection}>
            <Button style={ctaBtn} href={dashboardUrl}>
              View Your Link →
            </Button>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this because you created your first link on PivotUrl.{" "}
              <Link href={`https://pivoturl.com/dashboard/settings?tab=notifications`} style={unsubLink}>
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
const linkCard: React.CSSProperties = {
  backgroundColor: "#18181b",
  borderRadius: "12px",
  margin: "20px 40px",
  padding: "20px 24px",
  border: "1px solid #27272a",
};
const linkLabel: React.CSSProperties = {
  color: "#52525b",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  margin: "0 0 4px",
};
const linkValue: React.CSSProperties = {
  color: "#a78bfa",
  fontSize: "15px",
  margin: 0,
  wordBreak: "break-all",
};
const stepsSection: React.CSSProperties = { padding: "0 40px 24px" };
const sectionLabel: React.CSSProperties = {
  color: "#433BFF",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.1em",
  margin: "0 0 16px",
};
const stepRow: React.CSSProperties = {
  marginBottom: "14px",
};
const stepNum: React.CSSProperties = {
  color: "#433BFF",
  fontSize: "13px",
  fontWeight: "800",
  margin: "0 0 2px",
  lineHeight: "1",
};
const stepContent: React.CSSProperties = {
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
