import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";

const TEMPLATES = ["WelcomeEmail", "LinkClickAlert", "WeeklyDigest", "FirstClickAlert", "MonthlyReport", "DomainVerified", "FirstLinkCreated", "InactiveUser", "PlanUpgraded"] as const;
type TemplateName = typeof TEMPLATES[number];

/** Sample props for each template so preview renders with real-looking data */
const SAMPLE_PROPS: Record<TemplateName, object> = {
  WelcomeEmail: { name: "Srikanth Dhanavath", email: "srikanth@example.com" },
  LinkClickAlert: {
    linkTitle: "My Awesome Campaign",
    linkSlug: "awesome",
    shortUrl: "https://pivoturl.com/awesome",
    milestone: 1000,
    totalClicks: 1023,
    topCountry: "🇮🇳 India",
    topDevice: "Mobile",
    workspaceId: "00000000-0000-0000-0000-000000000001",
  },
  WeeklyDigest: {
    name: "Srikanth Dhanavath",
    email: "srikanth@example.com",
    weekStart: "May 12",
    weekEnd: "May 18",
    totalClicks: 3842,
    prevTotalClicks: 3420,
    topLinks: [
      { title: "Product Hunt Launch", slug: "ph-launch", clicks: 1240, prevClicks: 980 },
      { title: "Twitter Bio Link", slug: "twitter-bio", clicks: 960, prevClicks: 1100 },
      { title: "Newsletter CTA", slug: "nl-cta", clicks: 640, prevClicks: 420 },
    ],
    recommendation: "Your top link is 3x more popular on mobile — try enabling mobile-specific routing for better conversions.",
  },
  FirstClickAlert: {
    name: "Srikanth Dhanavath",
    linkTitle: "My Awesome Campaign",
    linkSlug: "awesome",
    linkUrl: "https://pivoturl.com/s/awesome",
    workspaceId: "00000000-0000-0000-0000-000000000001",
  },
  MonthlyReport: {
    name: "Srikanth Dhanavath",
    email: "srikanth@example.com",
    monthLabel: "May 2026",
    totalClicks: 15230,
    prevTotalClicks: 12400,
    totalLinks: 47,
    newLinks: 12,
    topLinks: [
      { title: "Product Hunt Launch", slug: "ph-launch", clicks: 4200, prevClicks: 3400 },
      { title: "Twitter Bio Link", slug: "twitter-bio", clicks: 3100, prevClicks: 2800 },
      { title: "Newsletter CTA", slug: "nl-cta", clicks: 2100, prevClicks: 1800 },
      { title: "YouTube Description", slug: "yt-desc", clicks: 1500, prevClicks: 1200 },
      { title: "LinkedIn Campaign", slug: "li-campaign", clicks: 900, prevClicks: 700 },
    ],
    topCountry: "India",
    topDevice: "Mobile",
  },
  DomainVerified: {
    name: "Srikanth Dhanavath",
    domain: "go.acmecorp.com",
    dashboardUrl: "https://pivoturl.com/dashboard/domain",
    isDefault: true,
    role: "links",
  },
  FirstLinkCreated: {
    name: "Srikanth Dhanavath",
    linkTitle: "My Awesome Campaign",
    linkSlug: "awesome",
    dashboardUrl: "https://pivoturl.com/dashboard/links",
  },
  InactiveUser: {
    name: "Srikanth Dhanavath",
    email: "srikanth@example.com",
    lastSeenDays: 45,
    totalLinks: 12,
    totalClicks: 3842,
    totalClicksChange: 3842,
    topLinkTitle: "Product Hunt Launch",
    topLinkClicks: 1240,
    dashboardUrl: "https://pivoturl.com/dashboard",
  },
  PlanUpgraded: {
    name: "Srikanth Dhanavath",
    email: "srikanth@example.com",
    plan: "growth",
    billingCycle: "monthly",
  },
};

export async function GET(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Preview not available in production" }, { status: 403 });
  }

  const template = (req.nextUrl.searchParams.get("template") ?? "WelcomeEmail") as TemplateName;

  if (!TEMPLATES.includes(template)) {
    return NextResponse.json(
      { error: `Unknown template. Available: ${TEMPLATES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const { default: Template } = await import(`../../../../../emails/${template}`);
    const props = SAMPLE_PROPS[template];
    const html = await render(Template(props as any));

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[email-preview]", err);
    return NextResponse.json({ error: "Render failed", detail: String(err) }, { status: 500 });
  }
}
