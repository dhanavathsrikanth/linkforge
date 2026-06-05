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

interface MonthlyReportProps {
  name: string;
  email: string;
  monthLabel: string;
  totalClicks: number;
  prevTotalClicks: number;
  totalLinks: number;
  newLinks: number;
  topLinks: TopLink[];
  topCountry: string;
  topDevice: string;
  appUrl: string;
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

export default function MonthlyReport({
  name,
  email,
  monthLabel,
  totalClicks,
  prevTotalClicks,
  totalLinks,
  newLinks,
  topLinks,
  topCountry,
  topDevice,
  appUrl,
}: MonthlyReportProps) {
  const firstName = name?.split(" ")[0] || "there";
  const clickChange = pct(totalClicks, prevTotalClicks);
  const isUp = totalClicks >= prevTotalClicks;
  const maxClicks = Math.max(...topLinks.map((l) => l.clicks), 1);

  return (
    <Html>
      <Head />
      <Preview>
        Your month in links 📈 — {totalClicks.toLocaleString()} clicks ({clickChange})
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>⚡ PivotUrl</Text>
          </Section>

          <Section style={heroSection}>
            <Text style={monthTag}>{monthLabel.toUpperCase()}</Text>
            <Heading style={h1}>Your monthly report 📈</Heading>
            <Text style={heroDesc}>
              Hey {firstName}, here's how your links performed this month.
            </Text>
          </Section>

          <Section style={summaryGrid}>
            <Row>
              <Column style={summaryCard}>
                <Text style={summaryValue}>{totalClicks.toLocaleString()}</Text>
                <Text style={summaryLabel}>Total clicks</Text>
                <Text
                  style={{
                    ...summaryChange,
                    color: isUp ? "#4ade80" : "#f87171",
                  }}
                >
                  {isUp ? "↑" : "↓"} {clickChange} vs last month
                </Text>
              </Column>
              <Column style={summaryCardRight}>
                <Text style={summaryValue}>{totalLinks}</Text>
                <Text style={summaryLabel}>Total links</Text>
                <Text style={summaryChangeSub}>
                  +{newLinks} this month
                </Text>
              </Column>
            </Row>
          </Section>

          <Section style={topCountriesSection}>
            <Text style={sectionLabel}>GEO & DEVICE</Text>
            <Section style={inlineStats}>
              <Row>
                <Column style={inlineStatCol}>
                  <Text style={inlineStatEmoji}>🌍</Text>
                  <Text style={inlineStatValue}>{topCountry || "—"}</Text>
                  <Text style={inlineStatLabel}>Top country</Text>
                </Column>
                <Column style={inlineStatDivider} />
                <Column style={inlineStatCol}>
                  <Text style={inlineStatEmoji}>📱</Text>
                  <Text style={inlineStatValue}>{topDevice || "—"}</Text>
                  <Text style={inlineStatLabel}>Top device</Text>
                </Column>
              </Row>
            </Section>
          </Section>

          <Section style={topLinksSection}>
            <Text style={sectionLabel}>TOP PERFORMING LINKS</Text>
            {topLinks.slice(0, 5).map((link, i) => (
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

          <Section style={ctaSection}>
            <Button
              style={ctaBtn}
              href={`${appUrl}/dashboard/analytics`}
            >
              View Full Analytics →
            </Button>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this monthly report as {email}.{" "}
              <Link
                href={`${appUrl}/dashboard/settings?tab=notifications`}
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
const monthTag: React.CSSProperties = {
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
const summaryGrid: React.CSSProperties = {
  padding: "16px 40px",
};
const summaryCard: React.CSSProperties = {
  backgroundColor: "#18181b",
  borderRadius: "12px",
  border: "1px solid #27272a",
  padding: "16px",
  textAlign: "center",
  width: "46%",
  verticalAlign: "top",
};
const summaryCardRight: React.CSSProperties = {
  backgroundColor: "#18181b",
  borderRadius: "12px",
  border: "1px solid #27272a",
  padding: "16px",
  textAlign: "center",
  width: "46%",
  verticalAlign: "top",
  marginLeft: "8%",
};
const summaryValue: React.CSSProperties = {
  color: "#fafafa",
  fontSize: "28px",
  fontWeight: "800",
  margin: "0 0 2px",
};
const summaryLabel: React.CSSProperties = {
  color: "#71717a",
  fontSize: "12px",
  margin: "0 0 6px",
};
const summaryChange: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: "600",
  margin: 0,
};
const summaryChangeSub: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "12px",
  fontWeight: "600",
  margin: 0,
};
const topCountriesSection: React.CSSProperties = { padding: "8px 40px 8px" };
const sectionLabel: React.CSSProperties = {
  color: "#433BFF",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.1em",
  margin: "0 0 12px",
};
const inlineStats: React.CSSProperties = {
  backgroundColor: "#18181b",
  borderRadius: "12px",
  border: "1px solid #27272a",
  padding: "16px",
};
const inlineStatCol: React.CSSProperties = { textAlign: "center", width: "48%" };
const inlineStatDivider: React.CSSProperties = {
  width: "4%",
  textAlign: "center",
  color: "#27272a",
};
const inlineStatEmoji: React.CSSProperties = {
  fontSize: "24px",
  margin: "0 0 4px",
  lineHeight: "1",
};
const inlineStatValue: React.CSSProperties = {
  color: "#fafafa",
  fontSize: "18px",
  fontWeight: "700",
  margin: "0 0 2px",
};
const inlineStatLabel: React.CSSProperties = {
  color: "#71717a",
  fontSize: "11px",
  margin: 0,
};
const topLinksSection: React.CSSProperties = { padding: "16px 40px 8px" };
const linkRow: React.CSSProperties = {
  borderBottom: "1px solid #27272a",
  paddingBottom: "10px",
  marginBottom: "10px",
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
