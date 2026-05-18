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

interface TopLink {
  title: string;
  slug: string;
  clicks: number;
  prevClicks: number;
}

interface WeeklyDigestProps {
  name: string;
  email: string;
  weekStart: string; // e.g. "May 12"
  weekEnd: string;   // e.g. "May 18"
  totalClicks: number;
  prevTotalClicks: number;
  topLinks: TopLink[];
  recommendation?: string;
}

function pct(current: number, prev: number) {
  if (prev === 0) return current > 0 ? "+100%" : "—";
  const delta = ((current - prev) / prev) * 100;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%`;
}

function bar(clicks: number, max: number): string {
  const filled = Math.round((clicks / max) * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

export default function WeeklyDigest({
  name,
  email,
  weekStart,
  weekEnd,
  totalClicks,
  prevTotalClicks,
  topLinks,
  recommendation,
}: WeeklyDigestProps) {
  const firstName = name?.split(" ")[0] || "there";
  const weekChange = pct(totalClicks, prevTotalClicks);
  const isUp = totalClicks >= prevTotalClicks;
  const maxClicks = Math.max(...topLinks.map((l) => l.clicks), 1);

  return (
    <Html>
      <Head />
      <Preview>
        Your week in links 📊 — {totalClicks.toLocaleString()} clicks ({weekChange})
      </Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>⚡ LinkForge</Text>
          </Section>

          {/* Hero */}
          <Section style={heroSection}>
            <Text style={weekTag}>
              WEEK OF {weekStart.toUpperCase()} — {weekEnd.toUpperCase()}
            </Text>
            <Heading style={h1}>Your week in links 📊</Heading>
            <Text style={heroDesc}>
              Hey {firstName}, here's how your links performed this week.
            </Text>
          </Section>

          {/* Total clicks summary */}
          <Section style={summaryCard}>
            <Row>
              <Column style={summaryLeft}>
                <Text style={summaryValue}>{totalClicks.toLocaleString()}</Text>
                <Text style={summaryLabel}>Total clicks this week</Text>
              </Column>
              <Column style={summaryRight}>
                <Text
                  style={{
                    ...changePill,
                    backgroundColor: isUp ? "#14532d" : "#7f1d1d",
                    color: isUp ? "#4ade80" : "#f87171",
                  }}
                >
                  {isUp ? "↑" : "↓"} {weekChange} vs last week
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Top links */}
          <Section style={topLinksSection}>
            <Text style={sectionLabel}>TOP PERFORMING LINKS</Text>
            {topLinks.slice(0, 3).map((link, i) => (
              <Section key={i} style={linkRow}>
                <Row>
                  <Column style={rankCol}>
                    <Text style={rank}>#{i + 1}</Text>
                  </Column>
                  <Column style={linkInfoCol}>
                    <Text style={linkTitle}>{link.title || link.slug}</Text>
                    <Text style={barChart}>
                      {bar(link.clicks, maxClicks)}{" "}
                      <span style={{ color: "#a1a1aa" }}>
                        {link.clicks.toLocaleString()} clicks
                      </span>
                    </Text>
                  </Column>
                  <Column style={linkDeltaCol}>
                    <Text
                      style={{
                        ...deltaText,
                        color:
                          link.clicks >= link.prevClicks ? "#4ade80" : "#f87171",
                      }}
                    >
                      {pct(link.clicks, link.prevClicks)}
                    </Text>
                  </Column>
                </Row>
              </Section>
            ))}
          </Section>

          {/* Recommendation */}
          {recommendation && (
            <Section style={recSection}>
              <Text style={recTitle}>💡 This week's tip</Text>
              <Text style={recText}>{recommendation}</Text>
            </Section>
          )}

          {/* CTA */}
          <Section style={ctaSection}>
            <Button
              style={ctaBtn}
              href="https://linkforge.app/dashboard/analytics"
            >
              View Full Analytics →
            </Button>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this weekly digest as {email}.{" "}
              <Link
                href={`https://linkforge.app/dashboard/settings?tab=notifications`}
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
  maxWidth: "580px",
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
const weekTag: React.CSSProperties = {
  color: "#433BFF",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.1em",
  margin: "0 0 8px",
};
const h1: React.CSSProperties = {
  color: "#fafafa",
  fontSize: "26px",
  fontWeight: "800",
  margin: "0 0 8px",
};
const heroDesc: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "14px",
  margin: 0,
};
const summaryCard: React.CSSProperties = {
  backgroundColor: "#18181b",
  borderRadius: "12px",
  border: "1px solid #27272a",
  margin: "16px 40px",
  padding: "20px 24px",
};
const summaryLeft: React.CSSProperties = { verticalAlign: "middle" };
const summaryRight: React.CSSProperties = {
  verticalAlign: "middle",
  textAlign: "right",
};
const summaryValue: React.CSSProperties = {
  color: "#fafafa",
  fontSize: "32px",
  fontWeight: "800",
  margin: "0 0 2px",
};
const summaryLabel: React.CSSProperties = {
  color: "#71717a",
  fontSize: "13px",
  margin: 0,
};
const changePill: React.CSSProperties = {
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: "600",
  padding: "4px 12px",
  display: "inline-block",
};
const topLinksSection: React.CSSProperties = { padding: "8px 40px 8px" };
const sectionLabel: React.CSSProperties = {
  color: "#433BFF",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.1em",
  margin: "0 0 12px",
};
const linkRow: React.CSSProperties = {
  borderBottom: "1px solid #27272a",
  paddingBottom: "12px",
  marginBottom: "12px",
};
const rankCol: React.CSSProperties = { width: "28px", verticalAlign: "top" };
const linkInfoCol: React.CSSProperties = { verticalAlign: "top" };
const linkDeltaCol: React.CSSProperties = {
  width: "60px",
  textAlign: "right",
  verticalAlign: "top",
};
const rank: React.CSSProperties = {
  color: "#52525b",
  fontSize: "13px",
  fontWeight: "700",
  margin: 0,
};
const linkTitle: React.CSSProperties = {
  color: "#fafafa",
  fontSize: "13px",
  fontWeight: "600",
  margin: "0 0 4px",
};
const barChart: React.CSSProperties = {
  color: "#433BFF",
  fontFamily: "monospace",
  fontSize: "11px",
  margin: 0,
};
const deltaText: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: "600",
  margin: 0,
};
const recSection: React.CSSProperties = {
  backgroundColor: "#1c1917",
  borderLeft: "3px solid #433BFF",
  margin: "8px 40px 8px",
  padding: "14px 18px",
  borderRadius: "0 8px 8px 0",
};
const recTitle: React.CSSProperties = {
  color: "#fafafa",
  fontSize: "13px",
  fontWeight: "600",
  margin: "0 0 4px",
};
const recText: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "13px",
  lineHeight: "1.6",
  margin: 0,
};
const ctaSection: React.CSSProperties = { padding: "20px 40px 28px" };
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
