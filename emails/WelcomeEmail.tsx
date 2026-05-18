import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
  name: string;
  email: string;
}

const steps = [
  {
    icon: "🌐",
    title: "Connect your domain",
    desc: "Use your own branded domain for short links instead of linkforge.app.",
    href: "https://linkforge.app/dashboard/settings/domains",
    cta: "Add Domain",
  },
  {
    icon: "🔗",
    title: "Create your first link",
    desc: "Shorten any URL, add UTM params, set expiry dates, and enable password protection.",
    href: "https://linkforge.app/dashboard/links",
    cta: "Create Link",
  },
  {
    icon: "📊",
    title: "Share and track",
    desc: "See real-time clicks, top countries, devices, and referrers in your analytics dashboard.",
    href: "https://linkforge.app/dashboard/analytics",
    cta: "View Analytics",
  },
];

export default function WelcomeEmail({ name, email }: WelcomeEmailProps) {
  const firstName = name?.split(" ")[0] || "there";

  return (
    <Html>
      <Head />
      <Preview>Welcome to LinkForge — your link management platform 🎉</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Logo / Header */}
          <Section style={header}>
            <Text style={logoText}>⚡ LinkForge</Text>
          </Section>

          {/* Hero */}
          <Section style={heroSection}>
            <Heading style={h1}>Welcome to LinkForge, {firstName}! 🎉</Heading>
            <Text style={heroDesc}>
              You're all set. LinkForge gives you blazing-fast short links, real-time analytics,
              custom domains, QR codes, and much more — all in one place.
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Steps */}
          <Section style={stepsSection}>
            <Text style={sectionLabel}>GET STARTED IN 3 STEPS</Text>
            {steps.map((step, i) => (
              <Section key={i} style={stepRow}>
                <Row>
                  <Column style={stepIconCol}>
                    <Text style={stepIcon}>{step.icon}</Text>
                  </Column>
                  <Column style={stepContentCol}>
                    <Text style={stepTitle}>
                      {i + 1}. {step.title}
                    </Text>
                    <Text style={stepDesc}>{step.desc}</Text>
                    <Button style={stepBtn} href={step.href}>
                      {step.cta} →
                    </Button>
                  </Column>
                </Row>
              </Section>
            ))}
          </Section>

          <Hr style={hr} />

          {/* Help */}
          <Section style={helpSection}>
            <Text style={helpText}>
              Questions? Just reply to this email — we read every message.
            </Text>
            <Row style={socialRow}>
              <Column>
                <Link href="https://twitter.com/linkforgeapp" style={socialLink}>
                  Twitter
                </Link>
              </Column>
              <Column>
                <Link href="https://linkforge.app/docs" style={socialLink}>
                  Docs
                </Link>
              </Column>
              <Column>
                <Link href="https://linkforge.app/blog" style={socialLink}>
                  Blog
                </Link>
              </Column>
            </Row>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              LinkForge · 123 SaaS Street, Internet City
            </Text>
            <Text style={footerText}>
              You're receiving this because you signed up with {email}.{" "}
              <Link href={`https://linkforge.app/unsubscribe?email=${email}`} style={unsubLink}>
                Unsubscribe
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: "#09090b",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  maxWidth: "580px",
  margin: "0 auto",
  backgroundColor: "#09090b",
};

const header: React.CSSProperties = {
  padding: "32px 40px 0",
};

const logoText: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: "800",
  background: "linear-gradient(135deg, #433BFF, #A78BFA)",
  WebkitBackgroundClip: "text",
  color: "#433BFF", // fallback for email clients
  margin: 0,
};

const heroSection: React.CSSProperties = {
  padding: "32px 40px 24px",
};

const h1: React.CSSProperties = {
  color: "#fafafa",
  fontSize: "26px",
  fontWeight: "700",
  lineHeight: "1.3",
  margin: "0 0 12px",
};

const heroDesc: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "15px",
  lineHeight: "1.7",
  margin: 0,
};

const hr: React.CSSProperties = {
  borderColor: "#27272a",
  borderWidth: "1px",
  margin: "0 40px",
};

const stepsSection: React.CSSProperties = {
  padding: "28px 40px",
};

const sectionLabel: React.CSSProperties = {
  color: "#433BFF",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.1em",
  margin: "0 0 20px",
};

const stepRow: React.CSSProperties = {
  marginBottom: "24px",
};

const stepIconCol: React.CSSProperties = {
  width: "40px",
  verticalAlign: "top",
};

const stepContentCol: React.CSSProperties = {
  verticalAlign: "top",
};

const stepIcon: React.CSSProperties = {
  fontSize: "24px",
  margin: 0,
  lineHeight: "1",
};

const stepTitle: React.CSSProperties = {
  color: "#fafafa",
  fontSize: "15px",
  fontWeight: "600",
  margin: "0 0 4px",
};

const stepDesc: React.CSSProperties = {
  color: "#71717a",
  fontSize: "13px",
  lineHeight: "1.6",
  margin: "0 0 10px",
};

const stepBtn: React.CSSProperties = {
  backgroundColor: "#433BFF",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "600",
  padding: "8px 16px",
  textDecoration: "none",
  display: "inline-block",
};

const helpSection: React.CSSProperties = {
  padding: "24px 40px",
  textAlign: "center",
};

const helpText: React.CSSProperties = {
  color: "#71717a",
  fontSize: "14px",
  margin: "0 0 16px",
};

const socialRow: React.CSSProperties = {
  width: "160px",
  margin: "0 auto",
};

const socialLink: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "13px",
  textDecoration: "none",
};

const footer: React.CSSProperties = {
  padding: "16px 40px 32px",
  textAlign: "center",
};

const footerText: React.CSSProperties = {
  color: "#52525b",
  fontSize: "12px",
  lineHeight: "1.6",
  margin: "0 0 4px",
};

const unsubLink: React.CSSProperties = {
  color: "#52525b",
  textDecoration: "underline",
};
