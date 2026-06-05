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

interface BioPublishedProps {
  name: string;
  pageName: string;
  pageUrl: string;
  dashboardUrl: string;
  hasCustomDomain: boolean;
  appUrl: string;
}

export default function BioPublished({
  name,
  pageName,
  pageUrl,
  dashboardUrl,
  hasCustomDomain,
  appUrl,
}: BioPublishedProps) {
  const firstName = name?.split(" ")[0] || "there";

  return (
    <Html>
      <Head />
      <Preview>🎉 Your bio page "{pageName}" is live!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>⚡ PivotUrl</Text>
          </Section>

          <Section style={heroSection}>
            <Text style={badge}>PAGE PUBLISHED</Text>
            <Heading style={h1}>🎉 Your bio page is live!</Heading>
            <Text style={heroDesc}>
              Hey {firstName}, <strong style={{ color: "#fafafa" }}>"{pageName}"</strong> is now published and shareable with the world.
            </Text>
          </Section>

          <Section style={urlCard}>
            <Text style={urlLabel}>Your bio page URL</Text>
            <Text style={urlValue}>{pageUrl}</Text>
          </Section>

          <Section style={shareSection}>
            <Text style={sectionLabel}>SHARE IT</Text>

            <Section style={shareRow}>
              <Text style={sharePlatform}>🐦 Twitter / X</Text>
              <Text style={shareText}>
                {`"Check out my new link-in-bio page! 🚀 ${pageUrl}"`}
              </Text>
            </Section>

            <Section style={shareRow}>
              <Text style={sharePlatform}>📸 Instagram</Text>
              <Text style={shareText}>
                Add "{pageUrl}" to your Instagram bio
              </Text>
            </Section>

            <Section style={shareRow}>
              <Text style={sharePlatform}>🔗 LinkedIn</Text>
              <Text style={shareText}>
                {`"I just launched my link-in-bio page — all my important links in one place. ${pageUrl}"`}
              </Text>
            </Section>

            <Section style={shareRow}>
              <Text style={sharePlatform}>📧 Email signature</Text>
              <Text style={shareText}>
                Add "{pageUrl}" to your email signature so everyone sees your links
              </Text>
            </Section>
          </Section>

          {hasCustomDomain && (
            <Section style={domainNote}>
              <Text style={domainNoteText}>
                ⚡ Your bio page is also accessible via your custom domain — pure branding.
              </Text>
            </Section>
          )}

          <Section style={tipSection}>
            <Text style={tipTitle}>💡 Pro tip</Text>
            <Text style={tipText}>
              Update your bio content anytime from the editor. Your published page stays live until you click "Update content" to push changes.
            </Text>
          </Section>

          <Section style={ctaSection}>
            <Button style={ctaBtn} href={dashboardUrl}>
              Edit Your Bio Page →
            </Button>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this because you published a bio page on PivotUrl.{" "}
              <Link href={`${appUrl}/dashboard/settings?tab=notifications`} style={unsubLink}>
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
const urlCard: React.CSSProperties = {
  backgroundColor: "#18181b",
  borderRadius: "12px",
  margin: "20px 40px",
  padding: "20px 24px",
  border: "1px solid #27272a",
};
const urlLabel: React.CSSProperties = {
  color: "#52525b",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  margin: "0 0 4px",
};
const urlValue: React.CSSProperties = {
  color: "#a78bfa",
  fontSize: "15px",
  margin: 0,
  wordBreak: "break-all",
};
const shareSection: React.CSSProperties = { padding: "0 40px 24px" };
const sectionLabel: React.CSSProperties = {
  color: "#433BFF",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.1em",
  margin: "0 0 14px",
};
const shareRow: React.CSSProperties = {
  marginBottom: "14px",
  paddingBottom: "14px",
  borderBottom: "1px solid #27272a",
};
const sharePlatform: React.CSSProperties = {
  color: "#fafafa",
  fontSize: "13px",
  fontWeight: "600",
  margin: "0 0 4px",
};
const shareText: React.CSSProperties = {
  color: "#71717a",
  fontSize: "13px",
  lineHeight: "1.6",
  margin: 0,
  fontStyle: "italic",
};
const domainNote: React.CSSProperties = {
  margin: "0 40px 20px",
  padding: "10px 14px",
  backgroundColor: "#1c1917",
  borderLeft: "3px solid #433BFF",
  borderRadius: "0 8px 8px 0",
};
const domainNoteText: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "13px",
  margin: 0,
  lineHeight: "1.6",
};
const tipSection: React.CSSProperties = {
  backgroundColor: "#18181b",
  borderRadius: "12px",
  border: "1px solid #27272a",
  margin: "0 40px 24px",
  padding: "14px 18px",
};
const tipTitle: React.CSSProperties = {
  color: "#fafafa",
  fontSize: "13px",
  fontWeight: "600",
  margin: "0 0 4px",
};
const tipText: React.CSSProperties = {
  color: "#71717a",
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
