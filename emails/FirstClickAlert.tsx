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

interface FirstClickAlertProps {
  name: string;
  linkTitle: string;
  linkSlug: string;
  linkUrl: string;
  workspaceId: string;
  appUrl: string;
}

export default function FirstClickAlert({
  name,
  linkTitle,
  linkSlug,
  linkUrl,
  appUrl,
}: FirstClickAlertProps) {
  const firstName = name?.split(" ")[0] || "there";
  const analyticsUrl = `${appUrl}/dashboard/links/${linkSlug}/analytics`;

  return (
    <Html>
      <Head />
      <Preview>🎯 Your link "{linkTitle}" just got its first click!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>⚡ PivotUrl</Text>
          </Section>

          <Section style={heroSection}>
            <Text style={badge}>FIRST CLICK</Text>
            <Heading style={h1}>🎯 You got your first click!</Heading>
            <Text style={heroDesc}>
              Hey {firstName}, your link <strong style={{ color: "#fafafa" }}>"{linkTitle}"</strong> just received its very first click. That's the start of something!
            </Text>
          </Section>

          <Section style={statsCard}>
            <Text style={statsEmoji}>🎉</Text>
            <Text style={statsTitle}>Someone clicked your link</Text>
            <Text style={statsDesc}>
              The first click is always special. You're officially reaching an audience.
            </Text>
          </Section>

          <Section style={linkSection}>
            <Text style={linkLabel}>Your link</Text>
            <Text style={linkValue}>{linkUrl}</Text>
          </Section>

          <Section style={ctaSection}>
            <Button style={ctaBtn} href={analyticsUrl}>
              View Analytics →
            </Button>
          </Section>

          <Section style={tipsSection}>
            <Text style={tipsTitle}>💡 Next steps</Text>
            <Text style={tipsText}>
              • Share your link on social media for more clicks{"\n"}
              • Add a custom domain to build brand trust{"\n"}
              • Create a QR code for offline campaigns
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this because you have click alerts enabled.{" "}
              <Link
                href={`${appUrl}/dashboard/settings?tab=notifications`}
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
const statsCard: React.CSSProperties = {
  backgroundColor: "#18181b",
  borderRadius: "12px",
  margin: "20px 40px",
  padding: "24px",
  border: "1px solid #27272a",
  textAlign: "center",
};
const statsEmoji: React.CSSProperties = {
  fontSize: "40px",
  margin: "0 0 8px",
  lineHeight: "1",
};
const statsTitle: React.CSSProperties = {
  color: "#fafafa",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 4px",
};
const statsDesc: React.CSSProperties = {
  color: "#71717a",
  fontSize: "13px",
  lineHeight: "1.6",
  margin: 0,
};
const linkSection: React.CSSProperties = { padding: "0 40px 24px" };
const linkLabel: React.CSSProperties = {
  color: "#52525b",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  margin: "0 0 4px",
};
const linkValue: React.CSSProperties = {
  color: "#a78bfa",
  fontSize: "14px",
  margin: 0,
  wordBreak: "break-all",
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
const tipsSection: React.CSSProperties = {
  backgroundColor: "#1c1917",
  borderLeft: "3px solid #433BFF",
  margin: "0 40px 28px",
  padding: "14px 18px",
  borderRadius: "0 8px 8px 0",
};
const tipsTitle: React.CSSProperties = {
  color: "#fafafa",
  fontSize: "13px",
  fontWeight: "600",
  margin: "0 0 6px",
};
const tipsText: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "13px",
  lineHeight: "1.7",
  margin: 0,
  whiteSpace: "pre-line",
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
