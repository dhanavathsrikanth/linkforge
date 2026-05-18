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

interface TeamInviteProps {
  inviterName: string;
  inviterEmail: string;
  workspaceName: string;
  role: string;
  inviteToken: string;
  recipientEmail: string;
  expiresInDays?: number;
}

export default function TeamInvite({
  inviterName,
  inviterEmail,
  workspaceName,
  role,
  inviteToken,
  recipientEmail,
  expiresInDays = 7,
}: TeamInviteProps) {
  const inviteUrl = `https://linkforge.app/invite/${inviteToken}`;

  return (
    <Html>
      <Head />
      <Preview>
        {inviterName} invited you to join {workspaceName} on LinkForge
      </Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>⚡ LinkForge</Text>
          </Section>

          {/* Hero */}
          <Section style={heroSection}>
            <Text style={inviteTag}>TEAM INVITATION</Text>
            <Heading style={h1}>You're invited! 🎉</Heading>
            <Text style={heroDesc}>
              <strong style={{ color: "#fafafa" }}>{inviterName}</strong>{" "}
              <span style={{ color: "#71717a" }}>({inviterEmail})</span> has
              invited you to join the{" "}
              <strong style={{ color: "#433BFF" }}>{workspaceName}</strong>{" "}
              workspace on LinkForge as a{" "}
              <strong style={{ color: "#fafafa" }}>{role}</strong>.
            </Text>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Button style={ctaBtn} href={inviteUrl}>
              Accept Invitation →
            </Button>
            <Text style={ctaHint}>
              Or copy this link:{" "}
              <Link href={inviteUrl} style={linkStyle}>
                {inviteUrl}
              </Link>
            </Text>
          </Section>

          <Hr style={hr} />

          {/* What is LinkForge */}
          <Section style={whatSection}>
            <Text style={sectionLabel}>WHAT IS LINKFORGE?</Text>
            <Text style={whatText}>
              LinkForge is a powerful link management platform that lets teams
              create branded short links, track clicks in real time, manage
              custom domains, and generate QR codes — all from one dashboard.
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Expiry notice */}
          <Section style={expirySection}>
            <Text style={expiryText}>
              ⏰ This invitation expires in {expiresInDays} days. If you didn't
              expect this, you can safely ignore this email.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This invite was sent to {recipientEmail}.{" "}
              <Link
                href={`https://linkforge.app/unsubscribe?email=${recipientEmail}`}
                style={unsubLink}
              >
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
const inviteTag: React.CSSProperties = {
  color: "#a78bfa",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.1em",
  margin: "0 0 8px",
};
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
const ctaSection: React.CSSProperties = { padding: "24px 40px" };
const ctaBtn: React.CSSProperties = {
  backgroundColor: "#433BFF",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "700",
  padding: "14px 28px",
  textDecoration: "none",
  display: "inline-block",
};
const ctaHint: React.CSSProperties = {
  color: "#52525b",
  fontSize: "12px",
  marginTop: "12px",
};
const linkStyle: React.CSSProperties = {
  color: "#433BFF",
  textDecoration: "underline",
  fontSize: "12px",
};
const hr: React.CSSProperties = {
  borderColor: "#27272a",
  borderWidth: "1px",
  margin: "0 40px",
};
const whatSection: React.CSSProperties = { padding: "24px 40px" };
const sectionLabel: React.CSSProperties = {
  color: "#433BFF",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.1em",
  margin: "0 0 10px",
};
const whatText: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "14px",
  lineHeight: "1.7",
  margin: 0,
};
const expirySection: React.CSSProperties = { padding: "16px 40px" };
const expiryText: React.CSSProperties = {
  backgroundColor: "#1c1917",
  borderRadius: "8px",
  color: "#a1a1aa",
  fontSize: "13px",
  padding: "12px 16px",
  margin: 0,
};
const footer: React.CSSProperties = {
  padding: "12px 40px 28px",
  textAlign: "center",
};
const footerText: React.CSSProperties = { color: "#52525b", fontSize: "12px" };
const unsubLink: React.CSSProperties = {
  color: "#52525b",
  textDecoration: "underline",
};
