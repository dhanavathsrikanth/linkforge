import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";

const TEMPLATES = ["WelcomeEmail", "LinkClickAlert", "WeeklyDigest", "TeamInvite", "PlanUpgraded"] as const;
type TemplateName = typeof TEMPLATES[number];

/** Sample props for each template so preview renders with real-looking data */
const SAMPLE_PROPS: Record<TemplateName, object> = {
  WelcomeEmail: { name: "Srikanth Dhanavath", email: "srikanth@example.com" },
  LinkClickAlert: {
    linkTitle: "My Awesome Campaign",
    linkSlug: "awesome",
    shortUrl: "https://linkforge.app/awesome",
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
  TeamInvite: {
    inviterName: "Srikanth Dhanavath",
    inviterEmail: "srikanth@example.com",
    workspaceName: "Acme Corp",
    role: "editor",
    inviteToken: "preview-token-abc123",
    recipientEmail: "teammate@example.com",
    expiresInDays: 7,
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
