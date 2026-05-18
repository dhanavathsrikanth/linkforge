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
import { PLANS } from "../src/lib/billing/plans";
import type { PlanKey } from "../src/lib/billing/plans";

interface PlanUpgradedProps {
  name: string;
  email: string;
  plan: PlanKey;
  billingCycle: "monthly" | "annual";
}

const PLAN_FEATURES: Record<string, string[]> = {
  free: [],
  starter: [
    "5,000 short links per month",
    "2 custom domains",
    "100,000 clicks tracked/month",
    "90 days analytics retention",
    "2 team members",
  ],
  growth: [
    "25,000 short links per month",
    "5 custom domains",
    "1M clicks tracked/month",
    "A/B testing for links",
    "Bulk link creation",
    "365 days analytics retention",
    "10 team members",
  ],
  agency: [
    "Unlimited short links",
    "15 custom domains",
    "Unlimited clicks tracked",
    "White-label (remove LinkForge branding)",
    "25 team members",
    "2 years analytics retention",
    "Priority support",
  ],
  business: [
    "Unlimited short links",
    "25 custom domains",
    "Unlimited clicks tracked",
    "White-label enabled",
    "100 team members",
    "5 years analytics retention",
    "Dedicated support",
    "Custom SLA available",
  ],
  enterprise: [
    "Everything in Business",
    "Custom limits",
    "SSO / SAML",
    "Dedicated infrastructure",
    "Custom contracts",
  ],
};

export default function PlanUpgraded({
  name,
  email,
  plan,
  billingCycle,
}: PlanUpgradedProps) {
  const firstName = name?.split(" ")[0] || "there";
  const planConfig = PLANS[plan as keyof typeof PLANS];
  const planName = planConfig?.name ?? plan;
  const features = PLAN_FEATURES[plan] ?? [];

  return (
    <Html>
      <Head />
      <Preview>You're now on the {planName} plan 🚀 — here's what's unlocked</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>⚡ LinkForge</Text>
          </Section>

          {/* Hero */}
          <Section style={heroSection}>
            <Text style={upgradeTag}>PLAN UPGRADE</Text>
            <Heading style={h1}>You're on {planName} 🚀</Heading>
            <Text style={heroDesc}>
              Congrats, {firstName}! Your workspace has been upgraded to the{" "}
              <strong style={{ color: "#433BFF" }}>{planName} plan</strong> (
              {billingCycle}). Everything is active immediately.
            </Text>
          </Section>

          {/* What's unlocked */}
          {features.length > 0 && (
            <Section style={featuresSection}>
              <Text style={sectionLabel}>WHAT'S UNLOCKED</Text>
              {features.map((feature, i) => (
                <Text key={i} style={featureItem}>
                  <span style={{ color: "#4ade80", marginRight: "8px" }}>✓</span>
                  {feature}
                </Text>
              ))}
            </Section>
          )}

          {/* CTA */}
          <Section style={ctaSection}>
            <Button
              style={ctaBtn}
              href="https://linkforge.app/dashboard"
            >
              Explore Your Dashboard →
            </Button>
          </Section>

          <Hr style={hr} />

          {/* Billing info */}
          <Section style={billingSection}>
            <Text style={billingText}>
              You'll find your invoice and billing details in{" "}
              <Link
                href="https://linkforge.app/dashboard/settings/billing"
                style={inlineLink}
              >
                Settings → Billing
              </Link>
              . Questions? Just reply to this email.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Receipt sent to {email}.{" "}
              <Link
                href={`https://linkforge.app/dashboard/settings/billing`}
                style={unsubLink}
              >
                Manage subscription
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
const upgradeTag: React.CSSProperties = {
  color: "#4ade80",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.1em",
  margin: "0 0 8px",
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
const featuresSection: React.CSSProperties = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "12px",
  margin: "20px 40px",
  padding: "20px 24px",
};
const sectionLabel: React.CSSProperties = {
  color: "#433BFF",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.1em",
  margin: "0 0 14px",
};
const featureItem: React.CSSProperties = {
  color: "#d4d4d8",
  fontSize: "14px",
  margin: "0 0 8px",
  lineHeight: "1.5",
};
const ctaSection: React.CSSProperties = { padding: "8px 40px 24px" };
const ctaBtn: React.CSSProperties = {
  backgroundColor: "#433BFF",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "700",
  padding: "13px 26px",
  textDecoration: "none",
  display: "inline-block",
};
const hr: React.CSSProperties = {
  borderColor: "#27272a",
  borderWidth: "1px",
  margin: "0 40px",
};
const billingSection: React.CSSProperties = { padding: "20px 40px 8px" };
const billingText: React.CSSProperties = {
  color: "#71717a",
  fontSize: "13px",
  lineHeight: "1.6",
  margin: 0,
};
const inlineLink: React.CSSProperties = {
  color: "#433BFF",
  textDecoration: "underline",
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
